"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, Save, Upload, LayoutTemplate, HeartPulse, ImageIcon, ArrowUp, ArrowDown, Trash2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface HeroImage {
  id: string;
  url: string;
  active: boolean;
}

export default function HomepageSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMaternity, setUploadingMaternity] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogin, setUploadingLogin] = useState(false);

  const [settings, setSettings] = useState({
    heroImages: [] as HeroImage[],
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
    login: {
      imageUrl: "/mother-baby.jpg",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        if (!user) return; // Wait for user to be available
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/homepage", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          setSettings((prev) => ({
            heroImages: data.heroImages || [],
            hero: { ...prev.hero, ...(data.hero || {}) },
            maternity: { ...prev.maternity, ...(data.maternity || {}) },
            login: { ...prev.login, ...(data.login || {}) },
          }));
        } else {
          throw new Error(result.error || "Failed to fetch settings");
        }
      } catch (error) {
        console.error("Error loading homepage settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error("Unauthorized");
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings");

      toast.success("Homepage settings updated successfully!");
    } catch (error: any) {
      console.error("Error saving homepage settings:", error);
      toast.error(error.message || "Failed to save settings");
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

  const handleUpload = async (file: File, subcategory: string) => {
    if (!user) throw new Error("Unauthorized");
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "marketing");
    formData.append("subcategory", subcategory);

    const response = await fetch("/api/admin/images/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!data.success || !data.image?.url) throw new Error(data.error || "Upload failed");
    return data.image.url;
  };

  const handleMaternityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be less than 5MB"); return; }

    try {
      setUploadingMaternity(true);
      const url = await handleUpload(file, "homepage-maternity");
      setSettings((prev) => ({ ...prev, maternity: { ...prev.maternity, imageUrl: url } }));
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingMaternity(false);
      e.target.value = "";
    }
  };

  const handleLoginImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be less than 5MB"); return; }

    try {
      setUploadingLogin(true);
      const url = await handleUpload(file, "homepage-login");
      setSettings((prev) => ({ ...prev, login: { ...prev.login, imageUrl: url } }));
      toast.success("Login image uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingLogin(false);
      e.target.value = "";
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be less than 5MB"); return; }

    try {
      setUploadingHero(true);
      const url = await handleUpload(file, "homepage-hero");
      setSettings((prev) => ({
        ...prev,
        heroImages: [...prev.heroImages, { id: Date.now().toString(), url, active: true }],
      }));
      toast.success("Hero image uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload hero image");
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  };

  const moveHeroImage = (index: number, direction: 'up' | 'down') => {
    setSettings((prev) => {
      const newImages = [...prev.heroImages];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return { ...prev, heroImages: newImages };
    });
  };

  const toggleHeroImage = (index: number) => {
    setSettings((prev) => {
      const newImages = [...prev.heroImages];
      newImages[index].active = !newImages[index].active;
      return { ...prev, heroImages: newImages };
    });
  };

  const removeHeroImage = (index: number) => {
    if (!confirm("Remove this image?")) return;
    setSettings((prev) => ({
      ...prev,
      heroImages: prev.heroImages.filter((_, i) => i !== index),
    }));
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

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-white">Hero Images Gallery</label>
              <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Add Image
                <input type="file" accept="image/*" onChange={handleHeroImageUpload} className="hidden" disabled={uploadingHero} />
              </label>
            </div>
            
            {settings.heroImages.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.05] border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-white/40">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No hero images uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.heroImages.map((img, i) => (
                  <div key={img.id} className={`flex items-center gap-4 bg-white/[0.03] border ${img.active ? 'border-rose-500/50' : 'border-white/[0.08] opacity-60'} rounded-xl p-3 transition-all`}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-black shrink-0 relative">
                      <img src={img.url} alt="Hero" className="w-full h-full object-cover" />
                      {!img.active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><EyeOff className="w-4 h-4 text-white" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{img.url.split('/').pop()?.split('?')[0] || 'Image'}</p>
                      <p className="text-xs text-white/40">{img.active ? 'Active' : 'Inactive'} • Position {i + 1}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleHeroImage(i)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors" title={img.active ? "Deactivate" : "Activate"}>
                        {img.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => moveHeroImage(i, 'up')} disabled={i === 0} className="p-2 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 transition-colors">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveHeroImage(i, 'down')} disabled={i === settings.heroImages.length - 1} className="p-2 hover:bg-white/10 rounded-lg text-white/60 disabled:opacity-30 transition-colors">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeHeroImage(i)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-white/40 mt-2">The topmost active image will be displayed on the website.</p>
              </div>
            )}
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

        {/* LOGIN PAGE SECTION */}
        <div className="bg-[#111] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-6">
            <ImageIcon className="w-6 h-6 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Login Page Background</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <label className="block text-sm font-bold text-white">Login Image</label>
              <div className="relative aspect-[16/9] bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden group">
                {settings.login.imageUrl ? (
                  <img src={settings.login.imageUrl} alt="Login" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                    {uploadingLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload New
                    <input type="file" accept="image/*" onChange={handleLoginImageUpload} className="hidden" disabled={uploadingLogin} />
                  </label>
                </div>
              </div>
              <p className="text-xs text-white/40">Recommended: High quality lifestyle image, ratio 16:9 or similar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
