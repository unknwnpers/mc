export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { calculatePaymentBreakdown } from "@/lib/payment-calculator";
import { auth } from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Parse request body
    const body = await req.json();
    const { subtotal, discount = 0, isCOD = false } = body;

    // Validate inputs
    if (typeof subtotal !== "number" || subtotal < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid subtotal" },
        { status: 400 }
      );
    }

    if (typeof discount !== "number" || discount < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid discount" },
        { status: 400 }
      );
    }

    // Fetch user's state from profile
    let userState: string | undefined;
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userState = userData?.state || userData?.address?.state;
      }
    } catch (err) {
      console.error("Error fetching user state:", err);
    }

    // Get business state from environment or default
    const businessState = process.env.BUSINESS_STATE || "Karnataka";

    // Calculate payment breakdown (server-side only)
    const breakdown = calculatePaymentBreakdown({
      subtotal,
      discount,
      isCOD,
      userState,
      businessState,
    });

    // Return breakdown with metadata for security
    return NextResponse.json({
      success: true,
      data: {
        ...breakdown,
        meta: {
          calculatedAt: new Date().toISOString(),
          userState: userState || null,
          isIntraState: userState === businessState,
        },
      },
    });
  } catch (error: any) {
    console.error("Payment calculation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Calculation failed" },
      { status: 500 }
    );
  }
}
