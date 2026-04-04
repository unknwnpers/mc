import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/logs
 * Fetch security logs for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    
    // Get limit from query params (default 50)
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 50;
    
    // Fetch recent security logs
    const logsRef = adminDb.collection("security_logs");
    const q = logsRef.orderBy("timestamp", "desc").limit(limit);
    
    const snapshot = await q.get();
    const logs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return NextResponse.json({ 
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch security logs:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch logs" 
      },
      { status: error.status || 500 }
    );
  }
}
