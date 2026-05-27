"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Auth, User } from "firebase/auth";
import { setTokenProvider } from "@/lib/api-fetch";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authRef = useRef<Auth | null>(null);

  useEffect(() => {
    // Firebase client SDK must only be imported/used in the browser
    async function init() {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const { firebaseApp } = await import("@/lib/firebase-client");
      const auth = getAuth(firebaseApp);
      authRef.current = auth;

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
        if (firebaseUser) {
          setTokenProvider(() => firebaseUser.getIdToken());
        } else {
          setTokenProvider(() => Promise.resolve(null));
        }
      });
      return unsubscribe;
    }

    let cleanup: (() => void) | undefined;
    init().then((unsub) => { cleanup = unsub; });
    return () => { cleanup?.(); };
  }, []);

  async function signIn(email: string, password: string): Promise<User> {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    if (!authRef.current) throw new Error("Auth not initialized");
    const cred = await signInWithEmailAndPassword(authRef.current, email, password);
    return cred.user;
  }

  async function signOut() {
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    setTokenProvider(() => Promise.resolve(null));
    if (!authRef.current) return;
    await firebaseSignOut(authRef.current);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
