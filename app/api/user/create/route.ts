import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, phone, email, name, provider } = body;

    // Debug logging
    console.log("[API User Create] Received:", { uid, email, name, provider, phone });

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
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
      
      // Sync email if missing or changed
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

    // Create new user with complete profile
    const userData: Record<string, any> = {
      uid,
      email: email || null,
      phone: phone || null,
      name: name || "",
      authProvider: provider || "unknown",
      role: "user",
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
