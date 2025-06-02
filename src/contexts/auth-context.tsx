
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
  register: (email: string, password: string, name: string) => Promise<void>;
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
        console.log("[AuthContext] onAuthStateChanged: Firebase user detected. UID:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            console.log("[AuthContext] onAuthStateChanged: User document FOUND for UID:", firebaseUser.uid);
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
            console.log("[AuthContext] onAuthStateChanged: User document NOT FOUND for UID:", firebaseUser.uid, ". Attempting to create new profile from onAuthStateChanged.");
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
            // Important: Ensure rules allow this setDoc operation
            await setDoc(userDocRef, newUserProfile);
            console.log("[AuthContext] onAuthStateChanged: New user profile CREATED in Firestore for UID:", firebaseUser.uid);
            setUser(newUserProfile);
          }
        } catch (firestoreError: any) {
          console.error(`[AuthContext] Firestore error in onAuthStateChanged for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
          // If profile can't be fetched/created, it's a critical issue.
          // Depending on policy, you might sign out the user or set a minimal user object.
                  setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Error User',
            displayName: firebaseUser.displayName || 'Error User',
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=E`,
            role: 'user', 
          });
          console.warn("[AuthContext] User state set to minimal due to Firestore error. App functionality might be limited.");
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
      console.error("[AuthContext] Email/Password Login error:", error);
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
      console.log("[AuthContext] Registration: Firebase user CREATED via email/password. UID:", firebaseUser.uid);
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name,
        displayName: name, // Set displayName to name initially
        avatarUrl: `https://placehold.co/40x40.png?text=${name.substring(0,1)}`,
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      console.log("[AuthContext] Registration: User profile CREATED in Firestore for UID:", firebaseUser.uid);
      // setUser will be handled by onAuthStateChanged
    } catch (error: any) {
      console.error("[AuthContext] Email/Password Registration error (Firebase Auth or Firestore):", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (firebaseUser: FirebaseUser, providerName: string) => {
    console.log(`[AuthContext] handleSocialSignIn called for ${providerName}. UID:`, firebaseUser.uid);
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): User document NOT FOUND for UID: ${firebaseUser.uid}. Creating new profile.`);
        const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'AnonymousUser';
        const newUserProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: newName,
          displayName: newName, // Set displayName to name initially
          avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
          role: 'user',
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(userDocRef, newUserProfile); // This is the Firestore write operation
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): New user profile CREATED in Firestore for UID: ${firebaseUser.uid}`);
        // setUser will be handled by onAuthStateChanged
      } else {
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): User document FOUND for UID: ${firebaseUser.uid}. Ensuring user data is consistent.`);
        const existingData = userDocSnap.data() as User;
        const updateData: Partial<User> = {};
        if (!existingData.avatarUrl && firebaseUser.photoURL) {
            updateData.avatarUrl = firebaseUser.photoURL;
        }
        if (!existingData.name && firebaseUser.displayName) {
            updateData.name = firebaseUser.displayName;
        }
        if (!existingData.displayName && firebaseUser.displayName) {
            updateData.displayName = firebaseUser.displayName;
        }
        if (Object.keys(updateData).length > 0) {
            console.log(`[AuthContext] handleSocialSignIn (${providerName}): Updating existing profile with new data from provider. UID: ${firebaseUser.uid}`, updateData);
            await updateDoc(userDocRef, {...updateData, updatedAt: serverTimestamp() });
        }
        // setUser will be handled by onAuthStateChanged
      }
       console.log(`[AuthContext] handleSocialSignIn (${providerName}): User profile processed successfully for UID: ${firebaseUser.uid}`);
    } catch (firestoreError: any) {
      console.error(`[AuthContext] Firestore error during ${providerName} sign-in profile handling for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
      // This error will propagate to the calling function (signInWithGoogle/Facebook) and then to AuthForm
      // The message from firestoreError.message is typically "Missing or insufficient permissions."
      throw new Error(`Error setting up user profile after ${providerName} sign-in: ${firestoreError.message}`);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    console.log("[AuthContext] Attempting Google Sign-In Popup...");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Google Firebase Auth successful. UID:", result.user.uid);
      await handleSocialSignIn(result.user, "Google");
      console.log("[AuthContext] Google Sign-In and profile handling complete for UID:", result.user.uid);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error("[AuthContext] Error during Google Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Google Sign-in cancelled by user.");
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error during Google Sign-in. Please check your connection.");
      }
      // Re-throw the error (which might be from handleSocialSignIn) to be caught by AuthForm
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    console.log("[AuthContext] Attempting Facebook Sign-In Popup...");
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Facebook Firebase Auth successful. UID:", result.user.uid);
      await handleSocialSignIn(result.user, "Facebook");
      console.log("[AuthContext] Facebook Sign-In and profile handling complete for UID:", result.user.uid);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error("[AuthContext] Error during Facebook Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Facebook Sign-in cancelled by user.");
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error("An account already exists with the same email address but different sign-in credentials. Try signing in with Google or email.");
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error during Facebook Sign-in. Please check your connection.");
      }
      // Re-throw the error (which might be from handleSocialSignIn) to be caught by AuthForm
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null); // Clear user state immediately
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
