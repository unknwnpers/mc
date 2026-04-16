import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

const provider = new GoogleAuthProvider();

// Add scopes to request email and profile information
provider.addScope('email');
provider.addScope('profile');

// Set custom parameters to ensure we get all user data
provider.setCustomParameters({
  prompt: 'select_account',
});

// Use getFirebaseAuth() — the REAL Auth instance — not the `auth` Proxy export.
// Proxy-wrapped auth breaks signInWithPopup (auth/internal-error) due to
// Firebase's internal class-instance checks on the auth parameter.
export const loginWithGoogle = () => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Auth not available");
  }
  return signInWithPopup(auth, provider);
};

export const logoutUser = () => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Auth not available");
  }
  return signOut(auth);
};
