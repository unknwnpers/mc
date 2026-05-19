"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Palette, RotateCcw, Save, Eye, Loader2, Lock } from "lucide-react";

// ── Brand palette extracted from the codebase ──
const DEFAULT_THEME = {
  // Core brand
  gold: "#C8B273",
  goldDark: "#B89B5E",
  goldLight: "#E8DDB8",
  goldSubtle: "#FFF9EC",

  // Backgrounds
  bgBase: "#F8F4EE",
  bgCard: "#FFFCF9",
  bgSection: "#FFFCF8",
  bgHero: "#F8F4EE",

  // Text
  textHeading: "#3B312C",
  textBody: "#6E625B",
  textMuted: "#B8A89A",
  textSubtle: "#9A9A9A",

  // Borders & surfaces
  borderDefault: "#F0E7DD",
  borderGold: "rgba(200,178,115,0.12)",

  // Unconnected / extra colors
  bgFooter: "#1A1513",
  bgLightSection: "#FAF7F1",
  textLightSectionHeading: "#3B312C",
  textLightSectionBody: "#6E625B",
  bgLightSectionCard: "#FFFCF9",

  // Accents
  blush: "#E8A598",
  charcoal: "#3B312C",
};

const GROUPS = [
  {
    label: "Brand Gold",
    keys: ["gold", "goldDark", "goldLight", "goldSubtle"],
    labels: ["Primary Gold", "Dark Gold (hover)", "Light Gold", "Subtle Gold (bg)"],
  },
  {
    label: "Backgrounds",
    keys: ["bgBase", "bgCard", "bgSection", "bgHero"],
    labels: ["Page Base", "Card Surface", "Section BG", "Hero BG"],
  },
  {
    label: "Typography",
    keys: ["textHeading", "textBody", "textMuted", "textSubtle"],
    labels: ["Headings", "Body Text", "Muted Text", "Subtle Text"],
  },
  {
    label: "Borders & Accents",
    keys: ["borderDefault", "borderGold", "blush", "charcoal"],
    labels: ["Border Default", "Border Gold", "Blush Accent", "Charcoal"],
  },
  {
    label: "Alternating Light Sections & Footer",
    keys: ["bgFooter", "bgLightSection", "textLightSectionHeading", "textLightSectionBody", "bgLightSectionCard"],
    labels: ["Footer Background", "Light Section BG", "Light Section Heading", "Light Section Body", "Light Section Card"],
  },
];

// ── Named theme presets ──
const PRESETS = [
  {
    id: "champagne",
    name: "Classic Champagne Gold",
    desc: "Pale airy ivory with true champagne gold — light, clean, and timelessly elegant.",
    dot: "#C8B273",
    theme: {
      // Pale champagne gold — the signature accent
      gold:          "#C8B273",
      goldDark:      "#B89B5E",
      goldLight:     "#EAE0C4",
      goldSubtle:    "#FDFAF0",

      // Very light airy ivory backgrounds
      bgBase:        "#FAF7F1",
      bgCard:        "#FEFDFB",
      bgSection:     "#F8F4EE",
      bgHero:        "#FAF7F1",

      // Clean warm-dark typography
      textHeading:   "#2C2316",
      textBody:      "#6B6058",
      textMuted:     "#B5A596",
      textSubtle:    "#9E9286",

      // Very light delicate borders
      borderDefault: "#EDE5D6",
      borderGold:    "rgba(200,178,115,0.10)",
      blush:         "#EAA89A",
      charcoal:      "#2C2316",

      // Footer & light section colors
      bgFooter:      "#FAF7F1",
      bgLightSection: "#F8F4EE",
      textLightSectionHeading: "#2C2316",
      textLightSectionBody: "#6B6058",
      bgLightSectionCard: "#FEFDFB",
    },
  },
  {
    id: "warm-luxury",
    name: "Warm Luxury",
    desc: "Rich earthy warmth — deeper ivory, richer gold, a more enveloping luxury boutique feel.",
    dot: "#BF9B5A",
    theme: {
      // Richer, deeper earthy gold
      gold:          "#BF9B5A",
      goldDark:      "#A8864A",
      goldLight:     "#D8C49A",
      goldSubtle:    "#F5EDE0",

      // Distinctly warmer, richer backgrounds vs Champagne
      bgBase:        "#F2EAE0",
      bgCard:        "#FAF5EE",
      bgSection:     "#EEE5D8",
      bgHero:        "#F2EAE0",

      // Deeper, richer heading contrast
      textHeading:   "#2E2018",
      textBody:      "#7A6A5E",
      textMuted:     "#B0A090",
      textSubtle:    "#9A8E82",

      // Warmer, more visible borders
      borderDefault: "#DDD0C0",
      borderGold:    "rgba(191,155,90,0.14)",
      blush:         "#D49A8A",
      charcoal:      "#2E2018",

      // Footer & light section colors
      bgFooter:      "#F2EAE0",
      bgLightSection: "#EEE5D8",
      textLightSectionHeading: "#2E2018",
      textLightSectionBody: "#7A6A5E",
      bgLightSectionCard: "#FAF5EE",
    },
  },
  {
    id: "warm-espresso",
    name: "Warm Espresso",
    desc: "Deep espresso dark mode — layered warm-dark surfaces with restrained gold, luxurious for night browsing.",
    dot: "#C7A96B",
    theme: {
      // Gold glows warmly on dark — slightly brighter for legibility
      gold:          "#C7A96B",
      goldDark:      "#D4B87B",
      goldLight:     "#7A6644",
      goldSubtle:    "#3A2E2A",

      // Layered espresso-toned dark surfaces
      bgBase:        "#1F1B19",
      bgCard:        "#2A2421",
      bgSection:     "#241F1D",
      bgHero:        "#312A27",

      // Warm cream typography — never harsh white
      textHeading:   "#F2ECE5",
      textBody:      "#B7AAA0",
      textMuted:     "#B7AAA0",
      textSubtle:    "#8E8278",

      // Subtle dark warm borders
      borderDefault: "#3A3331",
      borderGold:    "#2F2A28",
      blush:         "#7E5F58",
      charcoal:      "#F2ECE5",

      // Footer & light section colors
      bgFooter:      "#1A1513",
      bgLightSection: "#FAF7F1",
      textLightSectionHeading: "#3B312C",
      textLightSectionBody: "#6E625B",
      bgLightSectionCard: "#FFFCF9",
    },
  },
];

async function getToken() {
  return auth.currentUser?.getIdToken();
}

// Maps Firestore theme tokens → CSS custom properties on <html>
function applyTheme(theme: Record<string, string>) {
  if (typeof window === "undefined") return;
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

export default function ThemePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [theme, setTheme] = useState<Record<string, string>>(DEFAULT_THEME);
  const [saved, setSaved] = useState<Record<string, string>>(DEFAULT_THEME);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  // Superadmin guard
  useEffect(() => {
    if (!loading && profile?.role !== "superadmin") {
      router.push("/admin");
    }
  }, [loading, profile, router]);

  // Load saved theme
  useEffect(() => {
    if (!user) return;
    setFetching(true);
    getToken().then(token =>
      fetch("/api/admin/theme", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.theme) {
            const merged = { ...DEFAULT_THEME, ...d.theme };
            setTheme(merged);
            setSaved(merged);
            applyTheme(merged);
          }
        })
        .catch(console.error)
        .finally(() => setFetching(false))
     );
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme }),
      });
      const d = await res.json();
      if (d.success) {
        setSaved({ ...theme });
        applyTheme(theme);
        toast.success("Theme saved successfully! Storefront updated.");
      } else {
        toast.error(d.error || "Save failed");
      }

    } catch {
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTheme(DEFAULT_THEME);
    toast.info("Reset to defaults — click Save to apply");
  }

  function handleRestoreSaved() {
    setTheme({ ...saved });
    toast.info("Restored to last saved");
  }

  const isDirty = JSON.stringify(theme) !== JSON.stringify(saved);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!user || profile?.role !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-[#111] border border-white/[0.06] p-10 rounded-3xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Superadmin Only</h1>
          <p className="text-white/40 text-sm">This panel requires superadmin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10">
              <Palette className="w-5 h-5 text-rose-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Theme Settings</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 uppercase tracking-widest">Superadmin</span>
          </div>
          <p className="text-white/30 text-sm pl-12">Control the brand color palette across the storefront</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreview(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${preview ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-white/10 bg-white/5 text-white/50 hover:text-white"}`}
          >
            <Eye className="w-4 h-4" />
            {preview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 text-white/50 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Defaults
          </button>
          {isDirty && (
            <button
              onClick={handleRestoreSaved}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 text-white/50 hover:text-white transition-all"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white ${isDirty && !saving ? "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/10" : "bg-[#333]"}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Theme"}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="mb-6 flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Unsaved changes — remember to save
        </div>
      )}

      <div className={`grid gap-6 ${preview ? "lg:grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
        {/* ── COLOR CONTROLS ── */}
        <div className="space-y-6">

          {/* Preset Selector */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-white font-black text-sm">Theme Presets</h2>
              <p className="text-white/30 text-xs mt-0.5">Select a preset to load its colors — then customise and save.</p>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {PRESETS.map(preset => {
                const isActive = Object.entries(preset.theme).every(([k, v]) => theme[k] === v);
                const previewKeys = ['bgBase', 'bgCard', 'gold', 'textHeading', 'borderDefault'];
                return (
                  <button
                    key={preset.id}
                    onClick={() => { setTheme({ ...theme, ...preset.theme }); toast.info(`"${preset.name}" loaded — click Save to apply`); }}
                    className={`text-left p-4 rounded-xl border transition-all ${isActive ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {/* Mini palette strip */}
                      <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
                        {previewKeys.map(k => (
                          <div key={k} className="w-6 h-6" style={{ background: (preset.theme as any)[k] || '#ccc' }} />
                        ))}
                      </div>
                      <span className={`text-sm font-bold ${isActive ? 'text-amber-400' : 'text-white'}`}>{preset.name}</span>
                      {isActive && <span className="text-[10px] font-bold text-amber-400 ml-auto px-2 py-0.5 rounded-full bg-amber-500/10">ACTIVE</span>}
                    </div>
                    <p className="text-white/30 text-xs leading-relaxed">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── PALETTE BALANCE MOSAIC ── */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-sm">Palette Balance</h2>
                <p className="text-white/30 text-xs mt-0.5">Visual overview of all 16 active color tokens</p>
              </div>
            </div>
            <div className="p-4">
              {/* Full mosaic strip */}
              <div className="flex rounded-xl overflow-hidden mb-3 h-12 border border-white/10">
                {Object.entries(theme)
                  .filter(([k]) => !['updatedAt','updatedBy','borderGold'].includes(k))
                  .map(([key, val]) => (
                    <div
                      key={key}
                      title={`${key}: ${val}`}
                      className="flex-1 transition-all hover:flex-[2] cursor-default"
                      style={{ background: val?.startsWith('rgba') ? val : val }}
                    />
                  ))}
              </div>
              {/* Token chips row */}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(theme)
                  .filter(([k]) => !['updatedAt','updatedBy'].includes(k))
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1">
                      <div className="w-3 h-3 rounded-sm border border-white/20 shrink-0" style={{ background: val?.startsWith('rgba') ? val : val }} />
                      <span className="text-[10px] text-white/40 font-mono">{key}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {GROUPS.map(group => (
            <div key={group.label} className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Group header with mini palette strip */}
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-white font-black text-sm">{group.label}</h2>
                <div className="flex rounded-md overflow-hidden border border-white/10">
                  {group.keys.map(k => (
                    <div key={k} className="w-5 h-5" style={{ background: theme[k]?.startsWith('rgba') ? theme[k] : theme[k] || '#888' }} />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {group.keys.map((key, i) => (
                  <div key={key} className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">

                    {/* Large clickable swatch */}
                    <label className="relative cursor-pointer shrink-0 group/swatch">
                      <div
                        className="w-12 h-12 rounded-2xl border-2 border-white/10 shadow-lg transition-all group-hover/swatch:scale-105 group-hover/swatch:border-white/30 cursor-pointer"
                        style={{ background: theme[key]?.startsWith('rgba') ? theme[key] : theme[key] || '#ccc' }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity bg-black/20">
                        <span className="text-white text-[8px] font-black tracking-wider">PICK</span>
                      </div>
                      <input
                        type="color"
                        value={theme[key]?.startsWith('rgba') ? '#C8B273' : theme[key] || '#C8B273'}
                        onChange={e => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>

                    {/* Token info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-white/90 text-sm font-bold">{group.labels[i]}</p>
                        <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{key}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Hex input with color dot prefix */}
                        <div className="flex items-center gap-1.5 flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus-within:border-white/20">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: theme[key]?.startsWith('rgba') ? theme[key] : theme[key] || '#ccc' }} />
                          <input
                            type="text"
                            value={theme[key] || ''}
                            onChange={e => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                            className="bg-transparent text-[12px] font-mono text-white/60 w-full focus:outline-none focus:text-white/90"
                            spellCheck={false}
                          />
                        </div>
                        {/* Reset to default */}
                        <button
                          onClick={() => setTheme(prev => ({ ...prev, [key]: (DEFAULT_THEME as any)[key] }))}
                          title="Reset to default"
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-white/60 hover:bg-white/[0.08] hover:border-white/20 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Change indicator */}
                    {theme[key] !== (DEFAULT_THEME as any)[key] && (
                      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Modified from default" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Metadata */}
          {(saved as any).updatedAt && (
            <p className="text-white/20 text-xs px-1">
              Last saved: {new Date((saved as any).updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {(saved as any).updatedBy && ` · by ${(saved as any).updatedBy.slice(0, 8)}…`}
            </p>
          )}
        </div>

        {/* ── LIVE PREVIEW ── */}
        {preview && (
          <div className="space-y-4">
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-black text-sm">Live Storefront Preview</h2>
              </div>
              <div className="p-5 storefront-preview-container" style={{ background: theme.bgBase, fontFamily: "Georgia, serif" }}>
                {/* Simulated hero snippet */}
                <div className="rounded-2xl p-6 mb-4" style={{ background: theme.bgCard, border: `1px solid ${theme.borderDefault}` }}>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4" style={{ background: `${theme.gold}18` }}>
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.gold }}>Welcome to Miks & Chiks</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: theme.textHeading }}>Softness That</h2>
                  <h2 className="text-2xl font-bold italic mb-3" style={{ color: theme.gold }}>Stays With You</h2>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: theme.textBody }}>
                    Premium maternity & newborn wear — custom-stitched to your measurements.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{ background: theme.gold }}>
                      Shop Collection
                    </button>
                    <button className="px-5 py-2 rounded-xl text-sm font-bold border" style={{ color: theme.gold, borderColor: theme.gold, background: "transparent" }}>
                      Book Custom Stitching
                    </button>
                  </div>
                </div>

                {/* Simulated product card */}
                <div className="rounded-2xl overflow-hidden" style={{ background: theme.bgCard, border: `1px solid ${theme.borderDefault}` }}>
                  <div className="h-28 flex items-center justify-center text-xs font-bold" style={{ background: theme.bgSection, color: theme.textMuted }}>
                    Product Image
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.gold }}>Maternity</p>
                    <p className="font-bold text-sm mb-1" style={{ color: theme.textHeading }}>Premium Maternity Kurti</p>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-base" style={{ color: theme.textHeading }}>₹1,299</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: theme.goldSubtle, color: theme.textBody, border: `1px solid ${theme.borderDefault}` }}>Bestseller</span>
                    </div>
                    <button className="w-full mt-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: theme.gold }}>
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Trust strip preview */}
                <div className="mt-4 p-4 rounded-2xl flex flex-wrap gap-3" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${theme.borderDefault}` }}>
                  {["Premium Quality", "Custom Stitching", "COD Available", "Easy Replacement"].map(t => (
                    <div key={t} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: theme.gold }} />
                      <span className="text-[12px] font-bold" style={{ color: theme.textHeading }}>{t}</span>
                    </div>
                  ))}
                </div>

                {/* Footer color bar */}
                <div className="mt-4 p-3 rounded-xl text-center" style={{ background: theme.bgBase, border: `1px solid ${theme.borderGold}` }}>
                  <span className="text-[11px] font-bold" style={{ color: theme.gold }}>Miks & Chiks</span>
                  <span className="text-[11px] mx-2" style={{ color: theme.textMuted }}>·</span>
                  <span className="text-[11px]" style={{ color: theme.textBody }}>Premium Maternity & Kids</span>
                </div>
              </div>
            </div>

            {/* Color Palette Summary */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-white font-black text-sm mb-4">Palette Summary</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(theme).filter(([k]) => !["updatedAt", "updatedBy"].includes(k)).map(([key, val]) => (
                  <div key={key} title={`${key}: ${val}`} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                    <div className="w-4 h-4 rounded" style={{ background: val?.startsWith("rgba") ? val : val, border: "1px solid rgba(255,255,255,0.1)" }} />
                    <span className="text-[10px] text-white/40 font-mono">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
