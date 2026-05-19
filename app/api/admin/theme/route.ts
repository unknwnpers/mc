import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";

const THEME_DOC = adminDb.collection("settings").doc("theme");

async function verifySuperAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const app = getApps()[0];
    if (!app) return null;
    const decoded = await getAuth(app).verifyIdToken(token);
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
    
    // Define the premium warm espresso luxury theme config
    const warmEspressoTheme = {
      gold:          "#C7A96B",
      goldDark:      "#D4B87B",
      goldLight:     "#7A6644",
      goldSubtle:    "#3A2E2A",
      bgBase:        "#1F1B19",
      bgCard:        "#2A2421",
      bgSection:     "#241F1D",
      bgHero:        "#312A27",
      textHeading:   "#F2ECE5",
      textBody:      "#B7AAA0",
      textMuted:     "#B7AAA0",
      textSubtle:    "#8E8278",
      borderDefault: "#3A3331",
      borderGold:    "#2F2A28",
      blush:         "#7E5F58",
      charcoal:      "#F2ECE5",
      bgFooter:      "#1A1513",
      bgLightSection: "#FAF7F1",
      textLightSectionHeading: "#3B312C",
      textLightSectionBody: "#6E625B",
      bgLightSectionCard: "#FFFCF9",
      updatedAt: new Date().toISOString(),
      updatedBy: "system_migration"
    };

    if (!snap.exists) {
      console.log("Initializing database settings/theme to the new Warm Espresso luxury dark theme...");
      await THEME_DOC.set(warmEspressoTheme);
      return NextResponse.json({ success: true, theme: warmEspressoTheme });
    }

    const data = snap.data() || {};
    // Ensure any new theme fields (like bgFooter, bgLightSection, etc.) exist in the document without resetting customization
    const missingKeys = Object.keys(warmEspressoTheme).filter(key => !(key in data));
    if (missingKeys.length > 0) {
      const mergedTheme = { ...warmEspressoTheme, ...data };
      console.log("Merging missing theme keys into database:", missingKeys);
      await THEME_DOC.set(mergedTheme);
      return NextResponse.json({ success: true, theme: mergedTheme });
    }

    return NextResponse.json({ success: true, theme: data });
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
