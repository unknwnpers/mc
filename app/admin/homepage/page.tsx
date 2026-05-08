"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, Save, Upload, LayoutTemplate, HeartPulse, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function HomepageSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMaternity, setUploadingMaternity] = useState(false);

  const [settings, setSettings] = useState({
    hero: {
      headline: "Softness That",
      headlineHighlight: "Stays With You",
      subheadline: "Through Every Tiny Moment",
      description: "Thoughtfully designed maternity & kids wear crafted with the softest fabrics, bringing comfort, elegance and joy to every moment of motherhood.",
      buttonText: "Shop Collection",
      buttonLink: "/products",
    },
    maternity: {
      imageUrl: "https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=800",
      label: "Why Moms Love Us",
      headline: "Crafted With Care",
      headlineHighlight: "Little Moment",
      description: "We believe every mother deserves products that are as thoughtful as her love. Each piece is designed from the heart — tested by moms, loved by babies.",
      buttonText: "Explore Our Story",
      buttonLink: "/about",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, "settings", "homepage");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings((prev) => ({
            hero: { ...prev.hero, ...(data.hero || {}) },
            maternity: { ...prev.maternity, ...(data.maternity || {}) },
          }));
        }
      } catch (error) {
        console.error("Error loading homepage settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "settings", "homepage");
      await setDoc(docRef, settings, { merge: true });
      toast.success("Homepage settings updated successfully!");
    } catch (error) {
      console.error("Error saving homepage settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleHeroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings((prev) => ({
      ...prev,
      hero: { ...prev.hero, [e.target.name]: e.target.value },
    }));
  };

  const handleMaternityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings((prev) => ({
      ...prev,
      maternity: { ...prev.maternity, [e.target.name]: e.target.value },
    }));
  };

  const handleMaternityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      setUploadingMaternity(true);
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "marketing");
      formData.append("subcategory", "homepage-maternity");

      const response = await fetch("/api/admin/images/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.image?.url) {
        setSettings((prev) => ({
          ...prev,
          maternity: { ...prev.maternity, imageUrl: data.image.url },
        }));
        toast.success("Image uploaded successfully!");
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingMaternity(false);
      e.target.value = ""; // reset input
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Homepage Content</h1>
          <p className="text-white/40 mt-2">Manage text and images for homepage sections</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-8">
        {/* HERO SECTION */}
        <div className="bg-[#111] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-6">
            <LayoutTemplate className="w-6 h-6 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Hero Section</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-white mb-2">Headline</label>
              <input
                type="text"
                name="headline"
                value={settings.hero.headline}
                onChange={handleHeroChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-2">Headline Highlight (Gradient)</label>
              <input
                type="text"
                name="headlineHighlight"
                value={settings.hero.headlineHighlight}
                onChange={handleHeroChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-white mb-2">Subheadline</label>
              <input
                type="text"
                name="subheadline"
                value={settings.hero.subheadline}
                onChange={handleHeroChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-white mb-2">Description</label>
              <textarea
                name="description"
                value={settings.hero.description}
                onChange={handleHeroChange}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-2">Button Text</label>
              <input
                type="text"
                name="buttonText"
                value={settings.hero.buttonText}
                onChange={handleHeroChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-2">Button Link</label>
              <input
                type="text"
                name="buttonLink"
                value={settings.hero.buttonLink}
                onChange={handleHeroChange}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
              />
            </div>
          </div>
          <p className="text-xs text-white/40 mt-4">
            Note: Hero image is managed automatically from the Images section (Category: marketing, Subcategory: homepage).
          </p>
        </div>

        {/* MATERNITY SECTION */}
        <div className="bg-[#111] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-6">
            <HeartPulse className="w-6 h-6 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Why Choose Us (Maternity) Section</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image Column */}
            <div className="lg:col-span-1 space-y-4">
              <label className="block text-sm font-bold text-white">Section Image</label>
              <div className="relative aspect-[4/5] bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden group">
                {settings.maternity.imageUrl ? (
                  <img src={settings.maternity.imageUrl} alt="Maternity" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                    {uploadingMaternity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload New
                    <input type="file" accept="image/*" onChange={handleMaternityImageUpload} className="hidden" disabled={uploadingMaternity} />
                  </label>
                </div>
              </div>
              <input
                type="text"
                name="imageUrl"
                value={settings.maternity.imageUrl}
                onChange={handleMaternityChange}
                placeholder="Or paste image URL"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:border-rose-500"
              />
            </div>

            {/* Text Content Column */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 self-start">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-white mb-2">Eyebrow Label</label>
                <input
                  type="text"
                  name="label"
                  value={settings.maternity.label}
                  onChange={handleMaternityChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Headline</label>
                <input
                  type="text"
                  name="headline"
                  value={settings.maternity.headline}
                  onChange={handleMaternityChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Headline Highlight (Italic)</label>
                <input
                  type="text"
                  name="headlineHighlight"
                  value={settings.maternity.headlineHighlight}
                  onChange={handleMaternityChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-white mb-2">Description</label>
                <textarea
                  name="description"
                  value={settings.maternity.description}
                  onChange={handleMaternityChange}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Button Text</label>
                <input
                  type="text"
                  name="buttonText"
                  value={settings.maternity.buttonText}
                  onChange={handleMaternityChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Button Link</label>
                <input
                  type="text"
                  name="buttonLink"
                  value={settings.maternity.buttonLink}
                  onChange={handleMaternityChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
