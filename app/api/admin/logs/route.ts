import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    
    // Auth Check
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limitParams = parseInt(searchParams.get("limit") || "30", 10);

    // Fetch Admin Logs
    const adminLogsSnap = await adminDb.collection("admin_logs")
        .orderBy("created_at", "desc")
        .limit(limitParams)
        .get();

    // Fetch Inventory Logs
    const inventoryLogsSnap = await adminDb.collection("inventory_logs")
        .orderBy("created_at", "desc")
        .limit(limitParams)
        .get();

    // Combine and sort logic
    let combinedLogs: any[] = [];
    
    adminLogsSnap.docs.forEach(doc => {
       combinedLogs.push({ ...doc.data(), id: doc.id, type: 'admin_log' });
    });

    inventoryLogsSnap.docs.forEach(doc => {
       combinedLogs.push({ ...doc.data(), id: doc.id, type: 'inventory_log' });
    });

    // Sort by descending created_at timestamp
    combinedLogs.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
    });

    // Slicing the combined array back to the limit size for UI optimization
    combinedLogs = combinedLogs.slice(0, limitParams);

    return NextResponse.json({ success: true, logs: combinedLogs });
  } catch (error: any) {
    console.error("Failed to fetch admin logs:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
