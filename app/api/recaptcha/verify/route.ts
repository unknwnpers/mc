import { NextRequest, NextResponse } from "next/server";

/**
 * Verify reCAPTCHA token server-side
 * POST /api/recaptcha/verify
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "reCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY_V2;

    if (!secretKey) {
      console.error("[reCAPTCHA] Secret key not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify token with Google reCAPTCHA API
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await response.json();

    console.log("[reCAPTCHA] Verification response:", data);

    if (!data.success) {
      return NextResponse.json(
        { 
          error: "reCAPTCHA verification failed",
          codes: data["error-codes"] || []
        },
        { status: 400 }
      );
    }

    // Check score for v3 (optional)
    const score = data.score;
    if (score !== undefined && score < 0.5) {
      return NextResponse.json(
        { error: "Low reCAPTCHA score", score },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      score: data.score,
      action: data.action,
    });
  } catch (error: any) {
    console.error("[reCAPTCHA] Verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify reCAPTCHA" },
      { status: 500 }
    );
  }
}
