import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const THEME_DOC = adminDb.collection("settings").doc("theme");

async function verifySuperAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (snap.data()?.role !== "superadmin") return null;
    return decoded;
  } catch {
    return null;
  }
}

// ── GET — public read (used by the frontend ThemeProvider) ──
export async function GET() {
  try {
    const snap = await THEME_DOC.get();
    if (!snap.exists) {
      return NextResponse.json({ success: true, theme: null });
    }
    return NextResponse.json({ success: true, theme: snap.data() });
  } catch (error) {
    console.error("Theme GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch theme" }, { status: 500 });
  }
}

// ── PUT — superadmin-only write ──
export async function PUT(req: NextRequest) {
  const user = await verifySuperAdmin(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Superadmin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { theme } = body;
    if (!theme || typeof theme !== "object") {
      return NextResponse.json({ success: false, error: "Invalid theme payload" }, { status: 400 });
    }

    const payload = {
      ...theme,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    };

    await THEME_DOC.set(payload, { merge: true });
    return NextResponse.json({ success: true, theme: payload });
  } catch (error) {
    console.error("Theme PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to save theme" }, { status: 500 });
  }
}
