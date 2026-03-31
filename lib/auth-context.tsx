"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    const now = new Date().toISOString();
    
    setProfile(prev => {
        const updated = { 
          ...(prev || {}), 
          ...data, 
          uid: user.uid, // Ensure UID is always present
          updated_at: now 
        } as UserProfile;
        
        // Persist to Firestore in background
        setDoc(profileRef, updated, { merge: true });
        return updated;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Sync Profile
        const profileRef = doc(db, "users", u.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const data = profileSnap.data() as UserProfile;
          const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@miksandchiks.com";

          // Auto-upgrade existing admin email accounts that weren't promoted yet
          const needsRoleUpgrade = u.email === ADMIN_EMAIL && data.role !== "superadmin" && data.role !== "admin";
          const needsFieldFill   = data.address === undefined || data.phone === undefined;

          if (needsRoleUpgrade || needsFieldFill) {
            const updated: UserProfile = {
              ...data,
              address: data.address || "",
              phone:   data.phone   || "",
              role:    needsRoleUpgrade ? "superadmin" : data.role,
              updated_at: new Date().toISOString(),
            };
            await setDoc(profileRef, updated, { merge: true });
            setProfile(updated);
          } else {
            setProfile(data);
          }
        } else {
          // Auto-promote known admin email to superadmin
          const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@miksandchiks.com";
          const role = u.email === ADMIN_EMAIL ? "superadmin" : "customer";

          const newProfile: UserProfile = {
            uid: u.uid,
            name: u.displayName,
            email: u.email,
            role,
            address: "",
            phone: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
