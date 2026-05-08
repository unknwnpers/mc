import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    
    const doc = await adminDb.collection("settings").doc("homepage").get();
    const data = doc.exists ? doc.data() : {};

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching homepage settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);

    const settingsData = await req.json();

    await adminDb.collection("settings").doc("homepage").set(settingsData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving homepage settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save settings" },
      { status: error.status || 500 }
    );
  }
}
