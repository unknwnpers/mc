export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const favRef = adminDb.collection("users").doc(user.uid).collection("favorites").doc(productId);
    const favDoc = await favRef.get();

    if (favDoc.exists) {
      // Remove from favorites
      await favRef.delete();
      return NextResponse.json({ success: true, isFavorite: false });
    } else {
      // Add to favorites
      // Fetch product details to store in favorites (needed for profile page UI)
      const productDoc = await adminDb.collection("products").doc(productId).get();
      if (!productDoc.exists) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }
      
      const productData = productDoc.data();
      const price = productData?.variants?.[0]?.price ?? 0;
      const image = productData?.images?.[0] ?? '/placeholder.svg';
      const name = productData?.name ?? 'Unknown Product';

      await favRef.set({
        productId,
        name,
        price,
        image,
        createdAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({ success: true, isFavorite: true });
    }
  } catch (err: any) {
    console.error("Toggle Favorite Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
