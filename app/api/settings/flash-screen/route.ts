import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const docRef = adminDb.collection("settings").doc("flashScreen");
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({ config: snap.data() });
  } catch (error) {
    console.error("Admin SDK Flash Screen Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flash screen config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const docRef = adminDb.collection("settings").doc("flashScreen");
    
    await docRef.set({
      isActive: data.isActive,
      linkUrl: data.linkUrl,
      desktopImage: data.desktopImage,
      mobileImage: data.mobileImage,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin SDK Flash Screen Save Error:", error);
    return NextResponse.json(
      { error: "Failed to save flash screen config" },
      { status: 500 }
    );
  }
}
