"use client";

import { useEffect } from "react";

// Maps Firestore theme tokens → CSS custom properties on <html>
function applyTheme(theme: Record<string, string>) {
  const root = document.documentElement;
  const map: Record<string, string> = {
    gold:          "--mc-gold",
    goldDark:      "--mc-gold-dark",
    goldLight:     "--mc-gold-light",
    goldSubtle:    "--mc-gold-subtle",
    bgBase:        "--mc-bg-base",
    bgCard:        "--mc-bg-card",
    bgSection:     "--mc-bg-section",
    bgHero:        "--mc-bg-hero",
    textHeading:   "--mc-text-heading",
    textBody:      "--mc-text-body",
    textMuted:     "--mc-text-muted",
    textSubtle:    "--mc-text-subtle",
    borderDefault: "--mc-border",
    borderGold:    "--mc-border-gold",
    blush:         "--mc-blush",
    charcoal:      "--mc-charcoal",
    bgFooter:      "--mc-bg-footer",
    bgLightSection: "--mc-bg-light-section",
    textLightSectionHeading: "--mc-text-light-section-heading",
    textLightSectionBody: "--mc-text-light-section-body",
    bgLightSectionCard: "--mc-bg-light-section-card",
  };
  Object.entries(map).forEach(([token, cssVar]) => {
    if (theme[token]) root.style.setProperty(cssVar, theme[token]);
  });
}

export default function ThemeProvider() {
  useEffect(() => {
    fetch("/api/admin/theme")
      .then((r) => r.json())
      .then((d) => {
        if (d.theme && typeof d.theme === "object") {
          applyTheme(d.theme);
        }
      })
      .catch(() => {/* silent — defaults remain */});
  }, []);

  return null;
}
