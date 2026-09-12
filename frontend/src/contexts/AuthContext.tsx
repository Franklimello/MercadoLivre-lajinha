"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface UserProfile {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  whatsapp: string | null;
  whatsappVerified: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  _count?: {
    products: number;
    negotiationsAsBuyer: number;
    negotiationsAsSeller: number;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  profileError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { whatsapp?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    try {
      if (!uid) throw new Error("Session unavailable");
      const profile = await queryClient.fetchQuery({
        queryKey: queryKeys.profile(uid),
        queryFn: ({ signal }) => apiFetch<UserProfile>("/users/me", { signal }),
        staleTime: 0,
        gcTime: 60_000,
      });
      if (auth.currentUser?.uid !== uid) throw new Error("Session changed");
      setUser(profile);
      setProfileError(null);
    } catch (error) {
      if (auth.currentUser?.uid !== uid) throw error;
      console.error("Erro ao carregar perfil do backend:", error);
      setUser(null);
      setProfileError(
        "Você entrou com o Google, mas não foi possível carregar sua conta. Tente novamente.",
      );
      throw error;
    }
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.private });
      queryClient.removeQueries({ queryKey: queryKeys.private });
      setUser(null);
      setProfileError(null);
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          await fetchProfile();
        } catch {
          /* The profile error is displayed by LoginPanel. */
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [queryClient, fetchProfile]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      await fetchProfile();
    } catch (error) {
      console.error("Erro no login Google:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await queryClient.cancelQueries({ queryKey: queryKeys.private });
      queryClient.removeQueries({ queryKey: queryKeys.private });
      setUser(null);
      setFirebaseUser(null);
      setProfileError(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile();
    }
  };

  const updateProfile = async (data: { whatsapp?: string }) => {
    const updated = await apiFetch<UserProfile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setUser(updated);
    if (auth.currentUser)
      queryClient.setQueryData(
        queryKeys.profile(auth.currentUser.uid),
        updated,
      );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        profileError,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
