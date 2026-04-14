"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, getFirebaseAuth } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { toast } from "sonner";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getCurrentSessionId } from "@/lib/session-manager";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  sessionId: string | null;
  passwordStatus: {
    isExpired: boolean;
    daysUntilExpiration: number | null;
    changeRequired: boolean;
  } | null;
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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{
    isExpired: boolean;
    daysUntilExpiration: number | null;
    changeRequired: boolean;
  } | null>(null);

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

          if (data.blocked) {
            toast.error("Your account has been blocked. Contact support.");
            await getFirebaseAuth().signOut();
            setUser(null);
            setProfile(null);
            router.push("/login");
            return;
          }

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
            blocked: false,
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
          
          // Record login and check for new device/location notification
          try {
            const token = await u.getIdToken();
            await fetch('/api/admin/security/login-notify', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
          } catch (error) {
            console.error('Failed to record login:', error);
          }
          
          // Check password expiration status
          const passwordLastChanged = profileSnap.exists() 
            ? (profileSnap.data() as any).passwordLastChanged 
            : null;
          const passwordChangeRequired = profileSnap.exists()
            ? (profileSnap.data() as any).passwordChangeRequired
            : false;
          
          // Default policy: 90 days
          const maxAgeDays = 90;
          const lastChangedDate = passwordLastChanged?.toDate?.() || null;
          
          let isExpired = false;
          let daysUntilExpiration: number | null = null;
          
          if (lastChangedDate && maxAgeDays > 0) {
            const expirationDate = new Date(lastChangedDate);
            expirationDate.setDate(expirationDate.getDate() + maxAgeDays);
            const now = new Date();
            isExpired = now > expirationDate;
            const diffTime = expirationDate.getTime() - now.getTime();
            daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          
          const status = {
            isExpired,
            daysUntilExpiration: daysUntilExpiration && daysUntilExpiration > 0 ? daysUntilExpiration : null,
            changeRequired: passwordChangeRequired || false,
          };
          
          setPasswordStatus(status);
          
          // Redirect to password change if expired or required
          if (status.isExpired || status.changeRequired) {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/admin/change-password')) {
              router.push(`/admin/change-password?expired=true&redirect=${encodeURIComponent(currentPath)}`);
            }
          }
        }
      } else {
        setProfile(null);
        setSessionId(null);
        setPasswordStatus(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile, sessionId, passwordStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
