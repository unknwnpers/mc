import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * POST /api/referrals/apply
 * Apply referral code during signup
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    
    const { referralCode } = await request.json();
    const { ip, userAgent } = getClientInfo(request);
    
    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: "Referral code is required" },
        { status: 400 }
      );
    }
    
    // Find referrer by referral code
    const referrerSnapshot = await adminDb.collection("users")
      .where("referralCode", "==", referralCode.toUpperCase())
      .limit(1)
      .get();
    
    if (referrerSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Invalid referral code" },
        { status: 404 }
      );
    }
    
    const referrerDoc = referrerSnapshot.docs[0];
    const referrerId = referrerDoc.id;
    
    // Cannot refer yourself
    if (referrerId === userId) {
      return NextResponse.json(
        { success: false, error: "Cannot use your own referral code" },
        { status: 400 }
      );
    }
    
    // Check if already referred
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.data()?.referredBy) {
      return NextResponse.json(
        { success: false, error: "Already referred by another user" },
        { status: 400 }
      );
    }
    
    // Update user with referral info
    await adminDb.collection("users").doc(userId).update({
      referredBy: referrerId,
      referralAppliedAt: FieldValue.serverTimestamp(),
    });
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "APPLY_REFERRAL",
      userId,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        referredBy: referrerId,
        referralCode: referralCode.toUpperCase(),
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully",
      referrerId,
    });
  } catch (error: any) {
    console.error("Failed to apply referral:", error);
    
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "APPLY_REFERRAL_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to apply referral" },
      { status: error.status || 500 }
    );
  }
}
