/**
 * Server-Sent Events (SSE) endpoint for real-time security logs
 * Streams new security events and detected threats to connected admin clients
 */

import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { detectThreats, initializeThreatRules, type SecurityLog } from '@/lib/threat-detector';
import { createThreat, existingThreatExists } from '@/lib/threat-storage';
import { sendAlert, getNotifiedChannels } from '@/lib/alert-service';
import { blockIdentifier } from '@/lib/rate-limiter';

// Force dynamic rendering - this route uses request-based auth and streaming
export const dynamic = 'force-dynamic';

// Heartbeat interval in milliseconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Verify admin authentication from query param (EventSource doesn't support headers)
 */
async function verifyAdminFromToken(token: string | null) {
  if (!token) {
    throw Object.assign(new Error('Unauthorized: Missing token'), { status: 401 });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    
    // Check custom claims first
    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      return decoded;
    }
    
    // Fall back to Firestore role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    
    if (role !== 'admin' && role !== 'superadmin') {
      throw Object.assign(new Error('Forbidden: Admin access required'), { status: 403 });
    }
    
    return { ...decoded, role };
  } catch (error: any) {
    if (error.status) throw error;
    throw Object.assign(new Error('Unauthorized: Invalid token'), { status: 401 });
  }
}

/**
 * GET /api/admin/security/events
 * Establishes SSE connection and streams security logs in real-time
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize threat rules on first connection
    await initializeThreatRules();
    
    // Get token from query param (EventSource doesn't support custom headers)
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    // Verify admin authentication before establishing stream
    const user = await verifyAdminFromToken(token);

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = `event: connected\ndata: ${JSON.stringify({ 
          message: 'Connected to security event stream',
          userId: user.uid,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(initialMessage));

        // Set up Firestore listener for new security logs
        const logsRef = adminDb.collection('security_logs')
          .orderBy('timestamp', 'desc')
          .limit(1);

        unsubscribe = logsRef.onSnapshot(
          async (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added') {
                const logData: any = {
                  id: change.doc.id,
                  ...change.doc.data(),
                };

                // Convert Firestore timestamps to ISO strings
                const serializedLog = {
                  ...logData,
                  timestamp: logData.timestamp?.toDate?.() 
                    ? logData.timestamp.toDate().toISOString() 
                    : new Date().toISOString(),
                };

                // Send security log event
                const event = `event: security-log\ndata: ${JSON.stringify(serializedLog)}\n\n`;
                try {
                  controller.enqueue(encoder.encode(event));
                } catch (error) {
                  // Client disconnected
                  console.log('[SSE] Client disconnected, stopping stream');
                  cleanup();
                  return;
                }

                // Run threat detection on the new log
                try {
                  const securityLog: SecurityLog = {
                    id: change.doc.id,
                    type: logData.type,
                    action: logData.action,
                    userId: logData.userId,
                    role: logData.role,
                    ip: logData.ip,
                    userAgent: logData.userAgent,
                    status: logData.status,
                    metadata: logData.metadata,
                    timestamp: logData.timestamp?.toDate?.() || new Date(),
                  };

                  const threats = await detectThreats(securityLog);
                  
                  for (const threat of threats) {
                    // Check if similar threat already exists
                    const exists = await existingThreatExists(threat.ruleId, threat.source.value);
                    if (exists) continue;

                    // Send alerts through configured channels
                    const alertResults = await sendAlert(threat);
                    const notifiedChannels = getNotifiedChannels(alertResults);

                    // Store the threat
                    await createThreat(threat, notifiedChannels);

                    // Auto-block if critical and configured
                    if (threat.autoBlocked && threat.source.type === 'IP' && threat.source.value) {
                      await blockIdentifier(
                        threat.source.value,
                        3600, // 1 hour
                        `Auto-blocked: ${threat.ruleName}`
                      );
                    }

                    // Send threat event through SSE
                    const threatEvent = `event: security-threat\ndata: ${JSON.stringify({
                      ...threat,
                      detectedAt: threat.detectedAt.toISOString(),
                      alertResults,
                    })}\n\n`;
                    try {
                      controller.enqueue(encoder.encode(threatEvent));
                    } catch (error) {
                      console.log('[SSE] Client disconnected during threat event');
                      cleanup();
                      return;
                    }
                  }
                } catch (error) {
                  console.error('[SSE] Threat detection error:', error);
                }
              }
            }
          },
          (error) => {
            console.error('[SSE] Firestore listener error:', error);
            const errorEvent = `event: error\ndata: ${JSON.stringify({ 
              message: 'Failed to listen for security events',
              error: error.message 
            })}\n\n`;
            try {
              controller.enqueue(encoder.encode(errorEvent));
            } catch {
              // Client disconnected
            }
            cleanup();
          }
        );

        // Send heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch {
            // Client disconnected, clean up
            cleanup();
          }
        }, HEARTBEAT_INTERVAL);

        // Cleanup function
        function cleanup() {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('[SSE] Client aborted connection');
          cleanup();
        });
      },

      cancel() {
        // Clean up when stream is cancelled
        console.log('[SSE] Stream cancelled');
      }
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });

  } catch (error: any) {
    console.error('[SSE] Authentication error:', error);
    
    // Return appropriate error response
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
