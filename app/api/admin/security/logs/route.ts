import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/logs
 * Fetch security logs with filtering and pagination
 * 
 * Query Parameters:
 * - startDate: ISO date string for start of range
 * - endDate: ISO date string for end of range
 * - type: Log type filter (SECURITY, ADMIN_ACTION, AUTH)
 * - status: Status filter (SUCCESS, FAILED)
 * - userId: Filter by specific user ID
 * - action: Filter by action (partial match, case-insensitive)
 * - limit: Number of results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination params
    const limitParam = searchParams.get("limit");
    const limit = Math.min(limitParam ? parseInt(limitParam) : 50, 100);
    const offsetParam = searchParams.get("offset");
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    
    // Filter params
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    
    // Validate filter values
    const validTypes = ["SECURITY", "ADMIN_ACTION", "AUTH"];
    const validStatuses = ["SUCCESS", "FAILED"];
    
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type filter" },
        { status: 400 }
      );
    }
    
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status filter" },
        { status: 400 }
      );
    }
    
    // Build query dynamically
    let query: any = adminDb.collection("security_logs");
    
    // Apply filters
    if (startDate) {
      query = query.where("timestamp", ">=", new Date(startDate));
    }
    
    if (endDate) {
      query = query.where("timestamp", "<=", new Date(endDate));
    }
    
    if (type) {
      query = query.where("type", "==", type);
    }
    
    if (status) {
      query = query.where("status", "==", status);
    }
    
    if (userId) {
      query = query.where("userId", "==", userId);
    }
    
    // Order by timestamp descending
    query = query.orderBy("timestamp", "desc");
    
    // Get total count for pagination (before limit/offset)
    // Note: Firestore doesn't support efficient counting with cursors
    // For large datasets, consider a separate counter collection
    const countSnapshot = await query.count().get();
    const totalCount = countSnapshot.data().count;
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Execute query
    const snapshot = await query.get();
    let logs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        timestamp: data.timestamp?.toDate?.() 
          ? data.timestamp.toDate().toISOString() 
          : data.timestamp,
      };
    });
    
    // Apply action filter in memory (Firestore doesn't support partial text search)
    if (action) {
      const actionLower = action.toLowerCase();
      logs = logs.filter((log: any) => 
        log.action?.toLowerCase().includes(actionLower)
      );
    }
    
    return NextResponse.json({ 
      success: true,
      logs,
      count: logs.length,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < totalCount,
      }
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
