"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImageWithTracking, validateImageFile } from "@/lib/storage";
import { toast } from "sonner";
import { Save, UploadCloud, Link as LinkIcon, MonitorPlay, Power, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export default function AdminFlashScreenPage() {
  const [isActive, setIsActive] = useState(true);
  const [linkUrl, setLinkUrl] = useState("/products");
  
  const [desktopImagePreview, setDesktopImagePreview] = useState<string>("/Flash_Screen_Desktop.png");
  const [mobileImagePreview, setMobileImagePreview] = useState<string>("/Flash_Screen_Mobile.png");
  
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const snap = await getDoc(doc(db, "settings", "flashScreen"));
        if (snap.exists()) {
          const data = snap.data();
          setIsActive(data.isActive ?? true);
          setLinkUrl(data.linkUrl || "/products");
          setDesktopImagePreview(data.desktopImage || "/Flash_Screen_Desktop.png");
          setMobileImagePreview(data.mobileImage || "/Flash_Screen_Mobile.png");
        }
      } catch (err) {
        toast.error("Failed to load configuration");
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (isMobile) {
      setMobileFile(file);
      setMobileImagePreview(previewUrl);
    } else {
      setDesktopFile(file);
      setDesktopImagePreview(previewUrl);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let finalDesktopUrl = desktopImagePreview;
      let finalMobileUrl = mobileImagePreview;

      // Upload Desktop Image
      if (desktopFile) {
        const { url } = await uploadImageWithTracking(desktopFile, {
          entityType: "system",
          entityId: "flashScreen",
          variant: "original",
          fileName: "flash_desktop",
        });
        finalDesktopUrl = url;
      }

      // Upload Mobile Image
      if (mobileFile) {
        const { url } = await uploadImageWithTracking(mobileFile, {
          entityType: "system",
          entityId: "flashScreen",
          variant: "original",
          fileName: "flash_mobile",
        });
        finalMobileUrl = url;
      }

      // Save to Firestore
      await setDoc(doc(db, "settings", "flashScreen"), {
        isActive,
        linkUrl,
        desktopImage: finalDesktopUrl,
        mobileImage: finalMobileUrl,
        updatedAt: Date.now(),
      });

      toast.success("Flash screen updated successfully");
      setDesktopFile(null);
      setMobileFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <MonitorPlay className="text-rose-400" />
            Flash Screen Configuration
          </h1>
          <p className="text-white/40 text-sm mt-1">Manage the promotional overlay shown to new visitors.</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-white hover:bg-rose-500 text-black hover:text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid gap-6">
        
        {/* Settings Card */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">General Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Enable Flash Screen</p>
                <p className="text-sm text-white/40">Toggle whether the promotional screen appears for visitors.</p>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  isActive ? "bg-rose-500" : "bg-white/10"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-8" : "translate-x-1"
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Redirect URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full bg-black border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-white focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all"
                  placeholder="/products or /offers"
                />
              </div>
              <p className="text-xs text-white/40 mt-2">Where users are taken when they click the flash screen image.</p>
            </div>
          </div>
        </div>

        {/* Images Card */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Promotional Assets</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Desktop Image */}
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-white/40" /> Desktop Image
                </h3>
                <p className="text-xs text-white/40 mt-1">Recommended: Landscape format (e.g., 1200x800px)</p>
              </div>
              
              <div className="relative group rounded-2xl overflow-hidden border border-white/[0.06] bg-black aspect-video flex items-center justify-center">
                {desktopImagePreview ? (
                  <img src={desktopImagePreview} alt="Desktop Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-white/10" />
                )}
                
                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                  <UploadCloud className="w-8 h-8 text-white mb-2" />
                  <span className="text-sm font-medium text-white">Upload Desktop Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                </label>
              </div>
            </div>

            {/* Mobile Image */}
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white/40" /> Mobile Image
                </h3>
                <p className="text-xs text-white/40 mt-1">Recommended: Portrait format (e.g., 800x1200px)</p>
              </div>
              
              <div className="relative group rounded-2xl overflow-hidden border border-white/[0.06] bg-black aspect-[3/4] flex items-center justify-center w-full max-w-[280px] mx-auto">
                {mobileImagePreview ? (
                  <img src={mobileImagePreview} alt="Mobile Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-white/10" />
                )}
                
                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                  <UploadCloud className="w-8 h-8 text-white mb-2" />
                  <span className="text-sm font-medium text-white">Upload Mobile Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, true)}
                  />
                </label>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
