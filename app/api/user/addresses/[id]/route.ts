import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/user/addresses/[id]
 * Update an existing address
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyUser(request);
    if (!auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, name, phone, addressLine1, addressLine2, landmark, city, state, pincode, isDefault } = body;

    const addressRef = adminDb
      .collection("users")
      .doc(auth.uid)
      .collection("addresses")
      .doc(id);

    const existingDoc = await addressRef.get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      const snapshot = await adminDb
        .collection("users")
        .doc(auth.uid)
        .collection("addresses")
        .where("isDefault", "==", true)
        .get();

      const batch = adminDb.batch();
      snapshot.docs.forEach(doc => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    const updateData: Record<string, any> = {};
    if (label) updateData.label = label;
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2?.trim() || "";
    if (landmark !== undefined) updateData.landmark = landmark?.trim() || "";
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    await addressRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update address" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/addresses/[id]
 * Delete an address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyUser(request);
    if (!auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const addressRef = adminDb
      .collection("users")
      .doc(auth.uid)
      .collection("addresses")
      .doc(id);

    const existingDoc = await addressRef.get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const wasDefault = existingDoc.data()?.isDefault;

    // Delete the address
    await addressRef.delete();

    // If the deleted address was default, set another one as default
    if (wasDefault) {
      const snapshot = await adminDb
        .collection("users")
        .doc(auth.uid)
        .collection("addresses")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({ isDefault: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete address" },
      { status: 500 }
    );
  }
}
