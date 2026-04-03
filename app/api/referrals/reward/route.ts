import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * POST /api/referrals/reward
 * Reward referral after first order (call from order completion)
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
    const { ip, userAgent } = getClientInfo(request);
    
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    // Get user data
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.referredBy) {
      return NextResponse.json({
        success: true,
        message: "No referral to reward",
      });
    }
    
    // Check if already rewarded
    if (userData?.referralRewarded) {
      return NextResponse.json({
        success: true,
        message: "Referral already rewarded",
      });
    }
    
    // Verify this is first order
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }
    
    const orderData = orderDoc.data();
    
    if (orderData?.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Order does not belong to user" },
        { status: 403 }
      );
    }
    
    const REWARD_AMOUNT = 50; // ₹50 for both referrer and referee
    
    // Reward the new user (referee)
    await adminDb.collection("users").doc(userId).update({
      wallet: FieldValue.increment(REWARD_AMOUNT),
      referralRewarded: true,
      referralRewardAmount: REWARD_AMOUNT,
      referralRewardedAt: FieldValue.serverTimestamp(),
    });
    
    // Reward the referrer
    await adminDb.collection("users").doc(userData.referredBy).update({
      wallet: FieldValue.increment(REWARD_AMOUNT),
      referralEarnings: FieldValue.increment(REWARD_AMOUNT),
      totalReferrals: FieldValue.increment(1),
    });
    
    // Create referral transaction record
    await adminDb.collection("referral_transactions").add({
      orderId,
      refereeId: userId,
      referrerId: userData.referredBy,
      amount: REWARD_AMOUNT,
      type: "referral_reward",
      createdAt: FieldValue.serverTimestamp(),
    });
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "REFERRAL_REWARD",
      userId,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        orderId,
        referrerId: userData.referredBy,
        rewardAmount: REWARD_AMOUNT,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Both users rewarded ₹${REWARD_AMOUNT}`,
      rewardAmount: REWARD_AMOUNT,
    });
  } catch (error: any) {
    console.error("Failed to process referral reward:", error);
    
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "REFERRAL_REWARD_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process referral reward" },
      { status: error.status || 500 }
    );
  }
}
