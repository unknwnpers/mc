import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/addresses
 * List all saved addresses for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection("users")
      .doc(auth.uid)
      .collection("addresses")
      .orderBy("createdAt", "desc")
      .get();

    const addresses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error: any) {
    console.error("Failed to fetch addresses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/addresses
 * Add a new address for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { label, name, phone, addressLine1, addressLine2, landmark, city, state, pincode } = body;

    // Validation
    if (!name?.trim() || name.trim().length < 3) {
      return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Please enter a valid 10-digit Indian phone number" }, { status: 400 });
    }

    if (!addressLine1?.trim()) {
      return NextResponse.json({ error: "House/Building name is required" }, { status: 400 });
    }

    if (!city?.trim()) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit PIN code" }, { status: 400 });
    }

    // Check if this is the first address - make it default
    const existingSnapshot = await adminDb
      .collection("users")
      .doc(auth.uid)
      .collection("addresses")
      .get();

    const isFirstAddress = existingSnapshot.empty;
    const shouldSetDefault = isFirstAddress || body.isDefault === true;

    // If setting as default, remove default from other addresses
    if (shouldSetDefault && !isFirstAddress) {
      const batch = adminDb.batch();
      existingSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const addressData = {
      label: label || "Home",
      name: name.trim(),
      phone,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2?.trim() || "",
      landmark: landmark?.trim() || "",
      city: city.trim(),
      state: state || "Kerala",
      pincode,
      isDefault: shouldSetDefault,
      createdAt: new Date(),
    };

    const docRef = await adminDb
      .collection("users")
      .doc(auth.uid)
      .collection("addresses")
      .add(addressData);

    return NextResponse.json({
      success: true,
      address: {
        id: docRef.id,
        ...addressData,
      },
    });
  } catch (error: any) {
    console.error("Failed to add address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add address" },
      { status: 500 }
    );
  }
}
