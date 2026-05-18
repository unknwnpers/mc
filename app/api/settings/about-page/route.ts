import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const docRef = adminDb.collection("settings").doc("homepage");
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ config: null });
    }

    const data = snap.data();
    return NextResponse.json({ config: data?.about || null });
  } catch (error) {
    console.error("About Page Settings Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch about page config" },
      { status: 500 }
    );
  }
}
