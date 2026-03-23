"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, UserProfile } from "@/lib/firebase";
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
          // Ensure address/phone exist
          if (data.address === undefined || data.phone === undefined) {
             const updated = {
                ...data,
                address: data.address || "",
                phone: data.phone || ""
             };
             await setDoc(profileRef, updated, { merge: true });
             setProfile(updated);
          } else {
             setProfile(data);
          }
        } else {
          // Create minimal profile
          const newProfile: UserProfile = {
            uid: u.uid,
            name: u.displayName,
            email: u.email,
            address: "",
            phone: "",
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
