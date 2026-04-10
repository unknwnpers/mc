import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, phone, email, name, provider } = body;

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
      // Update last login
      await userRef.update({
        lastLogin: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "User login updated",
        isNewUser: false,
      });
    }

    // Create new user
    const userData: Record<string, any> = {
      uid,
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      role: "user",
    };

    if (phone) userData.phone = phone;
    if (email) userData.email = email;
    if (name) userData.name = name;
    if (provider) userData.authProvider = provider;

    await userRef.set(userData);

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
