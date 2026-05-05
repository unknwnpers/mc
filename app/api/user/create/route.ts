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
    const { uid, phone: rawPhone, email: rawEmail, name, provider } = body;
    
    const phone = normalizePhone(rawPhone);
    const email = rawEmail?.toLowerCase() || null;

    // Debug logging
    console.log("[API User Create] Received:", { uid, email, name, provider, phone });

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 1. PRIMARY CHECK: Check if user already exists by UID
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const existingData = userSnap.data() || {};
      
      const updateData: Record<string, any> = {
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        loginCount: FieldValue.increment(1),
      };
      
      // Sync fields if missing
      if (email && !existingData?.email) updateData.email = email;
      if (phone && !existingData?.phone) updateData.phone = phone;
      if (name && !existingData?.name)   updateData.name = name;
      
      await userRef.update(updateData);

      return NextResponse.json({
        success: true,
        message: "User login updated",
        isNewUser: false,
      });
    }

    // 2. IDENTITY CHECK: If this is a NEW UID, check for existing profiles by Email or Phone
    // This handles the case where a user signs in with a different provider (e.g., Phone after Google)
    let existingProfileDoc: any = null;

    // Check by Email first (highest confidence)
    if (email) {
      const emailQuery = await adminDb.collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!emailQuery.empty) {
        existingProfileDoc = emailQuery.docs[0];
      }
    }

    // Check by Phone if no email match
    if (!existingProfileDoc && phone) {
      const phoneQuery = await adminDb.collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();
      if (!phoneQuery.empty) {
        existingProfileDoc = phoneQuery.docs[0];
      }
    }

    if (existingProfileDoc) {
      const existingData = existingProfileDoc.data();
      console.log("[API User Create] Found existing account under different UID:", existingProfileDoc.id);

      // STRATEGY: Link the new UID to the existing profile data
      // We create a new doc for the new UID but copy the profile information over
      // OR we could potentially migrate the user, but for simplicity we'll create a 
      // linked profile that shares the same customer data.
      
      const linkedUserData: Record<string, any> = {
        ...existingData,
        uid, // The new UID from the current provider
        authProvider: provider || existingData.authProvider,
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        loginCount: (existingData.loginCount || 0) + 1,
        // Ensure email/phone are synced if the new sign-in provided them
        email: email || existingData.email,
        phone: phone || existingData.phone,
        linkedTo: existingProfileDoc.id, // Reference to original account
      };

      await userRef.set(linkedUserData);

      return NextResponse.json({
        success: true,
        message: "New provider linked to existing account",
        isNewUser: false,
        linked: true
      });
    }

    // 3. NEW USER CREATION: No existing account found by UID, Email, or Phone
    const userData: Record<string, any> = {
      uid,
      email,
      phone,
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

    console.log("[API User Create] Creating brand new user profile");
    await userRef.set(userData);

    return NextResponse.json({
      success: true,
      message: "New user created successfully",
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

