export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const favDoc = await adminDb.collection("users").doc(user.uid).collection("favorites").doc(productId).get();

    return NextResponse.json({ success: true, isFavorite: favDoc.exists });
  } catch (err: any) {
    console.error("Check Favorite Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
