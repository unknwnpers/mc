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
    keys: ["borderDefault", "blush", "charcoal"],
    labels: ["Border Default", "Blush Accent", "Charcoal"],
  },
];

// ── Named theme presets ──
const PRESETS = [
  {
    id: "champagne",
    name: "Classic Champagne Gold",
    desc: "The original brand palette — warm ivory backgrounds with champagne gold accents.",
    dot: "#C8B273",
    theme: {
      gold: "#C8B273",
      goldDark: "#B89B5E",
      goldLight: "#E8DDB8",
      goldSubtle: "#FFF9EC",
      bgBase: "#F8F4EE",
      bgCard: "#FFFCF9",
      bgSection: "#FFFCF8",
      bgHero: "#F8F4EE",
      textHeading: "#3B312C",
      textBody: "#6E625B",
      textMuted: "#B8A89A",
      textSubtle: "#9A9A9A",
      borderDefault: "#F0E7DD",
      borderGold: "rgba(200,178,115,0.12)",
      blush: "#E8A598",
      charcoal: "#3B312C",
    },
  },
  {
    id: "warm-luxury",
    name: "Warm Luxury",
    desc: "Premium soft-warm palette — eye-friendly for day & night, calm and luxurious.",
    dot: "#C7A96B",
    theme: {
      gold: "#C7A96B",
      goldDark: "#B8974A",
      goldLight: "#DFD0B0",
      goldSubtle: "#F8F4EC",
      bgBase: "#F6F1EA",
      bgCard: "#FFFDFC",
      bgSection: "#F8F3EC",
      bgHero: "#F6F1EA",
      textHeading: "#3B2F2A",
      textBody: "#7E7068",
      textMuted: "#B7AAA0",
      textSubtle: "#9E9387",
      borderDefault: "#E8DED2",
      borderGold: "rgba(199,169,107,0.12)",
      blush: "#E8A598",
      charcoal: "#3B2F2A",
    },
  },
];

async function getToken() {
  return auth.currentUser?.getIdToken();
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
        toast.success("Theme saved successfully");
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${theme.gold}20` }}>
              <Palette className="w-5 h-5" style={{ color: theme.gold }} />
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
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isDirty && !saving ? theme.gold : "#333", color: "#fff" }}
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
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map(preset => {
                const isActive = Object.entries(preset.theme).every(([k, v]) => theme[k] === v);
                return (
                  <button
                    key={preset.id}
                    onClick={() => { setTheme({ ...theme, ...preset.theme }); toast.info(`"${preset.name}" loaded — click Save to apply`); }}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isActive
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0" style={{ background: preset.dot }} />
                      <span className={`text-sm font-bold ${isActive ? "text-amber-400" : "text-white"}`}>{preset.name}</span>
                      {isActive && <span className="text-[10px] font-bold text-amber-400 ml-auto">ACTIVE</span>}
                    </div>
                    <p className="text-white/30 text-xs leading-relaxed pl-8">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {GROUPS.map(group => (
            <div key={group.label} className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-black text-sm">{group.label}</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {group.keys.map((key, i) => (
                  <div key={key} className="flex items-center gap-3">
                    {/* Color swatch picker */}
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-white/10 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        style={{ background: theme[key] || "#ccc" }}
                      />
                      <input
                        type="color"
                        value={theme[key]?.startsWith("rgba") ? "#C8B273" : theme[key] || "#C8B273"}
                        onChange={e => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-semibold truncate">{group.labels[i]}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="text"
                          value={theme[key] || ""}
                          onChange={e => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[12px] font-mono text-white/60 w-full focus:outline-none focus:border-white/20"
                          spellCheck={false}
                        />
                        <button
                          onClick={() => setTheme(prev => ({ ...prev, [key]: (DEFAULT_THEME as any)[key] }))}
                          title="Reset to default"
                          className="shrink-0 text-white/20 hover:text-white/60 transition-colors text-[10px]"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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
              <div className="p-5" style={{ background: theme.bgBase, fontFamily: "Georgia, serif" }}>
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
