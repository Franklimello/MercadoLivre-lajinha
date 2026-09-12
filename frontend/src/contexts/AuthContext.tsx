'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { apiFetch } from '@/lib/api';

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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { whatsapp?: string; notificationsEnabled?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const profile = await apiFetch<UserProfile>('/users/me');
      setUser(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil do backend:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      await fetchProfile();
    } catch (error) {
      console.error('Erro no login Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile();
    }
  };

  const updateProfile = async (data: { whatsapp?: string; notificationsEnabled?: boolean }) => {
    const updated = await apiFetch<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
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
