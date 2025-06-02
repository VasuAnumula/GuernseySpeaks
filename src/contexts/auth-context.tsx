
"use client";

import type { User } from '@/types';
import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>; // name is for both name and initial displayName
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserInContext: (updatedUserData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log("[AuthContext] onAuthStateChanged: Firebase user detected:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            console.log("[AuthContext] onAuthStateChanged: User document exists for UID:", firebaseUser.uid);
            const userData = userDocSnap.data() as User;
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              avatarUrl: firebaseUser.photoURL || userData.avatarUrl || `https://placehold.co/40x40.png?text=${(userData.displayName || userData.name || 'A').substring(0,1)}`,
              name: userData.name || firebaseUser.displayName,
              displayName: userData.displayName || userData.name || firebaseUser.displayName,
            });
          } else {
            console.log("[AuthContext] onAuthStateChanged: User document DOES NOT exist for UID:", firebaseUser.uid, ". Creating new profile.");
            const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
            const newUserProfile: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: newName,
              displayName: newName,
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
              role: 'user',
              createdAt: serverTimestamp() as Timestamp,
            };
            await setDoc(userDocRef, newUserProfile);
            console.log("[AuthContext] onAuthStateChanged: New user profile CREATED for UID:", firebaseUser.uid);
            setUser(newUserProfile);
          }
        } catch (firestoreError: any) {
          console.error(`[AuthContext] Firestore error in onAuthStateChanged for UID ${firebaseUser.uid}:`, firestoreError);
          // If Firestore operations fail, user might be stuck in a partially authenticated state.
          // Clearing user state or showing a global error might be necessary in a production app.
          setUser(null); // Or set user with an error state
          // This specific error is not directly toast-ed to the user from here, but it's critical for debugging.
        }
      } else {
        console.log("[AuthContext] onAuthStateChanged: No Firebase user.");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("[AuthContext] Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("[AuthContext] Registration: Firebase user CREATED:", firebaseUser.uid);
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name,
        displayName: name,
        avatarUrl: `https://placehold.co/40x40.png?text=${name.substring(0,1)}`,
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      console.log("[AuthContext] Registration: User profile CREATED in Firestore for UID:", firebaseUser.uid);
    } catch (error: any) {
      console.error("[AuthContext] Registration error:", error);
      if (error.code && error.code.startsWith("auth/")) {
        console.error("[AuthContext] This was an Firebase Auth error during registration.");
      } else {
        console.error("[AuthContext] This might be a Firestore error during profile creation post-registration.");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (firebaseUser: FirebaseUser) => {
    console.log("[AuthContext] handleSocialSignIn for UID:", firebaseUser.uid);
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.log("[AuthContext] handleSocialSignIn: User document DOES NOT exist. Creating profile.");
        const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
        const newUserProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: newName,
          displayName: newName,
          avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
          role: 'user',
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(userDocRef, newUserProfile);
        console.log("[AuthContext] handleSocialSignIn: New user profile CREATED.");
        setUser(newUserProfile);
      } else {
        console.log("[AuthContext] handleSocialSignIn: User document exists. Setting user data.");
        const userData = userDocSnap.data() as User;
         setUser({
            ...userData,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            avatarUrl: firebaseUser.photoURL || userData.avatarUrl,
            name: userData.name || firebaseUser.displayName,
            displayName: userData.displayName || userData.name || firebaseUser.displayName,
          });
      }
    } catch (firestoreError: any) {
      console.error("[AuthContext] Firestore error during social sign-in user profile handling:", firestoreError);
      throw new Error(`Error setting up user profile: ${firestoreError.message}`); // This message will propagate to AuthForm's toast
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("[AuthContext] Attempting Google Sign-In Popup...");
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Google Auth successful for UID:", result.user.uid);
      await handleSocialSignIn(result.user);
      console.log("[AuthContext] Google Sign-In: User profile handled successfully.");
    } catch (error: any) {
      console.error("[AuthContext] Error during Google Sign-in or profile handling:", error);
      throw error; // Re-throw to be caught by AuthForm
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      console.log("[AuthContext] Attempting Facebook Sign-In Popup...");
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Facebook Auth successful for UID:", result.user.uid);
      await handleSocialSignIn(result.user);
      console.log("[AuthContext] Facebook Sign-In: User profile handled successfully.");
    } catch (error: any) {
      console.error("[AuthContext] Error during Facebook Sign-in or profile handling:", error);
      throw error; // Re-throw to be caught by AuthForm
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserInContext = (updatedUserData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedUserData } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, signInWithGoogle, signInWithFacebook, logout, updateUserInContext }}>
      {children}
    </AuthContext.Provider>
  );
};
