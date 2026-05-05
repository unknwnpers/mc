import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Normalizes Indian phone numbers to 10 digits
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // If it's 12 digits starting with 91, take last 10
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // If it's 10 digits, it's already clean
  if (digits.length === 10) {
    return digits;
  }
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, phone: rawPhone, email, name, provider } = body;
    
    const phone = normalizePhone(rawPhone);

    // Debug logging
    console.log("[API User Create] Received:", { uid, email, name, provider, phone });

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user already exists by UID (primary key)
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const existingData = userSnap.data() || {};
      
      // Build update data - sync missing fields from auth provider
      const updateData: Record<string, any> = {
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        loginCount: FieldValue.increment(1),
      };
      
      // Sync email if missing or changed (only if provided)
      if (email && !existingData?.email) {
        updateData.email = email;
      }
      
      // Sync phone if missing
      if (phone && !existingData?.phone) {
        updateData.phone = phone;
      }
      
      // Sync name if missing
      if (name && !existingData?.name) {
        updateData.name = name;
      }
      
      // Ensure new fields exist for older users
      if (existingData?.isActive === undefined) {
        updateData.isActive = true;
      }
      if (existingData?.defaultAddressId === undefined) {
        updateData.defaultAddressId = null;
      }

      await userRef.update(updateData);

      return NextResponse.json({
        success: true,
        message: "User login updated",
        isNewUser: false,
      });
    }

    // IF USER DOES NOT EXIST BY UID:
    // Check if another account already exists with this PHONE number
    // This handles the "Number based account already exists" requirement
    if (phone) {
      const existingPhoneQuery = await adminDb.collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (!existingPhoneQuery.empty) {
        const existingUserDoc = existingPhoneQuery.docs[0];
        const existingUserData = existingUserDoc.data();
        
        console.log("[API User Create] Phone already exists under different UID:", existingUserDoc.id);

        // OPTION: We could "link" them by updating the existing doc, 
        // but since Firebase Auth UID is the primary key for client-side queries,
        // it's safer to create the new UID doc but maybe copy some data over?
        // For now, we'll proceed but log it. Real "linking" happens in Firebase Auth.
      }
    }

    // Create new user with complete profile
    const userData: Record<string, any> = {
      uid,
      email: email || null,
      phone: phone || null,
      name: name || "",
      authProvider: provider || "unknown",
      role: "customer",
      isActive: true,
      emailVerified: false,
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      defaultAddressId: null,
      loginCount: 1,
    };

    console.log("[API User Create] Creating user with data:", userData);

    await userRef.set(userData);
    
    console.log("[API User Create] User created successfully");

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      isNewUser: true,
    });
  } catch (error: any) {
    console.error("[API] User create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

