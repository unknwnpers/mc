"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getCurrentSessionId } from "@/lib/session-manager";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  sessionId: string | null;
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
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  // Create admin session via API
  const createAdminSession = async (u: User, role: string) => {
    try {
      const token = await u.getIdToken();
      const response = await fetch('/api/admin/security/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: u.uid,
          userEmail: u.email,
          role,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Failed to create admin session:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Sync Profile
        const profileRef = doc(db, "users", u.uid);
        const profileSnap = await getDoc(profileRef);
        
        let userRole = "customer";
        
        if (profileSnap.exists()) {
          const data = profileSnap.data() as UserProfile;
          const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@miksandchiks.com";

          // Auto-upgrade existing admin email accounts that weren't promoted yet
          const needsRoleUpgrade = u.email === ADMIN_EMAIL && data.role !== "superadmin" && data.role !== "admin";
          const needsFieldFill   = !data.addressLine1 || !data.phone;

          if (needsRoleUpgrade || needsFieldFill) {
            const updated: UserProfile = {
              ...data,
              addressLine1: data.addressLine1 || "",
              phone:   data.phone   || "",
              role:    needsRoleUpgrade ? "superadmin" : data.role,
              updated_at: new Date().toISOString(),
            };
            await setDoc(profileRef, updated, { merge: true });
            setProfile(updated);
            userRole = updated.role;
          } else {
            setProfile(data);
            userRole = data.role;
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
            addressLine1: "",
            phone: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
          userRole = role;
        }
        
        // Create admin session if user is admin/superadmin
        if (userRole === "admin" || userRole === "superadmin") {
          await createAdminSession(u, userRole);
        }
      } else {
        setProfile(null);
        setSessionId(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile, sessionId }}>
      {children}
    </AuthContext.Provider>
  );
};
