import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
export async function GET(request: NextRequest) {
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
    
    // Get user data
    const userDoc = await adminDb.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data()!;
    
    // Get referral transactions
    const transactionsSnapshot = await adminDb.collection("referral_transactions")
      .where("referrerId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    
    const transactions = transactionsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null,
    }));
    
    return NextResponse.json({
      success: true,
      stats: {
        referralCode: userData.referralCode || null,
        totalReferrals: userData.totalReferrals || 0,
        referralEarnings: userData.referralEarnings || 0,
        wallet: userData.wallet || 0,
        referredBy: userData.referredBy || null,
        referralRewarded: userData.referralRewarded || false,
      },
      recentTransactions: transactions,
    });
  } catch (error: any) {
    console.error("Failed to fetch referral stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch referral stats" },
      { status: error.status || 500 }
    );
  }
}
