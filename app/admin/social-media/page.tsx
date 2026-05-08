"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, Save, Instagram, Facebook, Youtube, Phone, Twitter } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SocialMediaSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    instagram: "",
    facebook: "",
    whatsapp: "",
    x: "",
    youtube: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/social-media", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          setSettings({
            instagram: data.instagram || "",
            facebook: data.facebook || "",
            whatsapp: data.whatsapp || "",
            x: data.x || "",
            youtube: data.youtube || "",
          });
        } else {
          throw new Error(result.error || "Failed to fetch settings");
        }
      } catch (error) {
        console.error("Error loading social media settings:", error);
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
      const response = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings");

      toast.success("Social media links updated successfully!");
    } catch (error: any) {
      console.error("Error saving social media settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Social Media</h1>
          <p className="text-white/40 mt-2">Manage links for your social media accounts</p>
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

      <div className="bg-[#111] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
        
        {/* Instagram */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Instagram className="w-4 h-4 text-[#E9897E]" /> Instagram URL
          </label>
          <input
            type="url"
            name="instagram"
            value={settings.instagram}
            onChange={handleChange}
            placeholder="https://instagram.com/yourbrand"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Phone className="w-4 h-4 text-green-400" /> WhatsApp Link (e.g., wa.me)
          </label>
          <input
            type="url"
            name="whatsapp"
            value={settings.whatsapp}
            onChange={handleChange}
            placeholder="https://wa.me/919876543210"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Facebook */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Facebook className="w-4 h-4 text-blue-400" /> Facebook URL
          </label>
          <input
            type="url"
            name="facebook"
            value={settings.facebook}
            onChange={handleChange}
            placeholder="https://facebook.com/yourbrand"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* X (Twitter) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Twitter className="w-4 h-4 text-white/80" /> X (Twitter) URL
          </label>
          <input
            type="url"
            name="x"
            value={settings.x}
            onChange={handleChange}
            placeholder="https://x.com/yourbrand"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* YouTube */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
            <Youtube className="w-4 h-4 text-red-500" /> YouTube Channel URL
          </label>
          <input
            type="url"
            name="youtube"
            value={settings.youtube}
            onChange={handleChange}
            placeholder="https://youtube.com/@yourbrand"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

      </div>
    </div>
  );
}
