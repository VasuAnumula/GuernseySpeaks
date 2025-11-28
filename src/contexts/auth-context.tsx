
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
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    name?: string | null
  ) => Promise<void>;
  // register: (email: string, password: string, name: string) => Promise<void>; // Duplicate removed
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
        console.debug("[AuthContext] onAuthStateChanged: Firebase user detected. UID:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            console.debug("[AuthContext] onAuthStateChanged: User document FOUND for UID:", firebaseUser.uid);
            const userData = userDocSnap.data() as User;
            if (auth.currentUser &&
              (auth.currentUser.displayName !== (userData.displayName || userData.name) ||
                auth.currentUser.photoURL !== userData.avatarUrl)) {
              try {
                await updateProfile(auth.currentUser, {
                  displayName: userData.displayName || userData.name,
                  photoURL: userData.avatarUrl
                });
                console.debug("[AuthContext] onAuthStateChanged: Firebase Auth profile updated from Firestore data for UID:", firebaseUser.uid);
              } catch (profileUpdateError) {
                console.error("[AuthContext] onAuthStateChanged: Error updating Firebase Auth profile:", profileUpdateError);
              }
            }
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              avatarUrl: firebaseUser.photoURL || userData.avatarUrl,
              name: userData.name || firebaseUser.displayName,
              displayName: userData.displayName || firebaseUser.displayName || userData.name,
            });
          } else {
            console.warn("[AuthContext] onAuthStateChanged: User document NOT FOUND for UID:", firebaseUser.uid, ". Attempting to create new profile from onAuthStateChanged.");
            const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
            const newUserProfile: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: newName,
              displayName: newName,
              avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0, 1)}`,
              role: 'user',
              createdAt: serverTimestamp() as Timestamp,
            };
            await setDoc(userDocRef, newUserProfile);
            console.debug("[AuthContext] onAuthStateChanged: New user profile CREATED in Firestore for UID:", firebaseUser.uid);
            setUser(newUserProfile);
          }
        } catch (firestoreError: any) {
          console.error(`[AuthContext] Firestore error in onAuthStateChanged for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
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
        console.debug("[AuthContext] onAuthStateChanged: No Firebase user.");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to translate Firebase errors to user-friendly messages
  const getFriendlyErrorMessage = (error: any): string => {
    const errorCode = error?.code || '';

    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please check your email or register.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again or use "Forgot password".';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please login instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later or reset your password.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. Please try again if you want to continue.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method. Try signing in with Google or email/password.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized. Please contact support.';
      default:
        return error?.message || 'An unexpected error occurred. Please try again.';
    }
  };


  const login = async (email: string, password: string) => {
    setLoading(true);
    console.debug("[AuthContext] Attempting Email/Password Login...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.debug("[AuthContext] Email/Password Login successful.");
    } catch (error) {
      console.error("[AuthContext] Email/Password Login error:", error);
      const friendlyError = new Error(getFriendlyErrorMessage(error));
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string, // This is intended as the preferred public name
    name?: string | null // This is intended as the "full name" or "real name"
  ) => {
    setLoading(true);
    console.debug("[AuthContext] Attempting Email/Password Registration...");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.debug("[AuthContext] Registration: Firebase user CREATED via email/password. UID:", firebaseUser.uid);

      const actualDisplayName = displayName.trim() || (name ? name.trim() : firebaseUser.email?.split('@')[0]) || 'User';
      const actualName = name ? name.trim() : actualDisplayName;
      const avatarFallbackChar = actualDisplayName.substring(0, 1).toUpperCase() || 'U';


      await updateProfile(firebaseUser, {
        displayName: actualDisplayName,
        photoURL: `https://placehold.co/40x40.png?text=${avatarFallbackChar}`
      });
      console.debug("[AuthContext] Registration: Firebase Auth profile (displayName, photoURL) updated for UID:", firebaseUser.uid);

      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: actualName,
        displayName: actualDisplayName,
        avatarUrl: firebaseUser.photoURL, // Use the updated photoURL from Firebase Auth profile
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      console.debug("[AuthContext] Registration: User profile CREATED in Firestore for UID:", firebaseUser.uid);
    } catch (error: any) {
      console.error("[AuthContext] Email/Password Registration error (Firebase Auth or Firestore):", error);
      const friendlyError = new Error(getFriendlyErrorMessage(error));
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (firebaseUser: FirebaseUser, providerName: string) => {
    console.debug(`[AuthContext] handleSocialSignIn called for ${providerName}. UID:`, firebaseUser.uid);
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.warn(`[AuthContext] handleSocialSignIn (${providerName}): User document NOT FOUND for UID: ${firebaseUser.uid}. Creating new profile.`);
        const baseName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'AnonymousUser';
        const avatarFallbackChar = baseName.substring(0, 1).toUpperCase() || 'U';
        const newUserProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: baseName, // Social provider's display name becomes 'name'
          displayName: baseName, // And also 'displayName' initially
          avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${avatarFallbackChar}`,
          role: 'user',
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(userDocRef, newUserProfile);
        console.debug(`[AuthContext] handleSocialSignIn (${providerName}): New user profile CREATED in Firestore for UID: ${firebaseUser.uid}`);
        setUser(newUserProfile); // Set user immediately
      } else {
        console.debug(`[AuthContext] handleSocialSignIn (${providerName}): User document FOUND for UID: ${firebaseUser.uid}. Ensuring data consistency.`);
        const existingData = userDocSnap.data() as User;
        const updateData: Partial<User & { updatedAt: Timestamp }> = { updatedAt: serverTimestamp() as Timestamp };
        let changedInFirestore = false;
        let authProfileNeedsUpdate = false;
        const authUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};


        // Sync from Firebase Auth to Firestore if Firestore is missing info
        if (!existingData.name && firebaseUser.displayName) {
          updateData.name = firebaseUser.displayName;
          changedInFirestore = true;
        }
        if (!existingData.displayName && firebaseUser.displayName) {
          updateData.displayName = firebaseUser.displayName;
          changedInFirestore = true;
        }
        if (!existingData.avatarUrl && firebaseUser.photoURL) {
          updateData.avatarUrl = firebaseUser.photoURL;
          changedInFirestore = true;
        }

        // Sync from Firestore to Firebase Auth if Firebase Auth is missing or different
        if (existingData.displayName && auth.currentUser && auth.currentUser.displayName !== existingData.displayName) {
          authUpdatePayload.displayName = existingData.displayName;
          authProfileNeedsUpdate = true;
        }
        if (existingData.avatarUrl && auth.currentUser && auth.currentUser.photoURL !== existingData.avatarUrl) {
          authUpdatePayload.photoURL = existingData.avatarUrl;
          authProfileNeedsUpdate = true;
        }

        if (authProfileNeedsUpdate && auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, authUpdatePayload);
            console.debug(`[AuthContext] handleSocialSignIn (${providerName}): Firebase Auth profile updated from existing Firestore data for UID: ${firebaseUser.uid}`);
          } catch (profileUpdateError) {
            console.error(`[AuthContext] handleSocialSignIn (${providerName}): Error updating Firebase Auth profile from Firestore:`, profileUpdateError);
          }
        }

        if (changedInFirestore) {
          console.debug(`[AuthContext] handleSocialSignIn (${providerName}): Updating existing Firestore profile with new data. UID: ${firebaseUser.uid}`, updateData);
          await updateDoc(userDocRef, updateData);
        } else {
          console.debug(`[AuthContext] handleSocialSignIn (${providerName}): No new data to update in existing Firestore profile for UID: ${firebaseUser.uid}`);
        }
        // Set user from potentially merged data (onAuthStateChanged will also run and might refine this)
        setUser({
          ...existingData, // Start with existing Firestore data
          ...updateData,   // Overlay any changes made
          uid: firebaseUser.uid, // Ensure core Firebase Auth fields are current
          email: firebaseUser.email,
          avatarUrl: auth.currentUser?.photoURL || existingData.avatarUrl, // Prefer live auth.currentUser if available
          displayName: auth.currentUser?.displayName || existingData.displayName,
          name: existingData.name || auth.currentUser?.displayName, // name might be more static
        });
      }
      console.debug(`[AuthContext] handleSocialSignIn (${providerName}): User profile processed successfully for UID: ${firebaseUser.uid}`);
    } catch (firestoreError: any) {
      console.error(`[AuthContext] Firestore error during ${providerName} sign-in profile handling for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
      throw new Error(`Error setting up user profile after ${providerName} sign-in: ${firestoreError.message}`);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    console.debug("[AuthContext] Attempting Google Sign-In Popup...");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.debug("[AuthContext] Google Firebase Auth successful. User from popup:", result.user);
      await handleSocialSignIn(result.user, "Google");
      console.debug("[AuthContext] Google Sign-In and profile handling complete for UID:", result.user.uid);
    } catch (error: any) {
      console.error("[AuthContext] Error during Google Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/unauthorized-domain') {
        console.error("[AuthContext] CRITICAL: auth/unauthorized-domain. Ensure your domain is listed in Firebase Console -> Authentication -> Settings -> Authorized domains.");
      }
      const friendlyError = new Error(getFriendlyErrorMessage(error));
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    console.debug("[AuthContext] Attempting Facebook Sign-In Popup...");
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.debug("[AuthContext] Facebook Firebase Auth successful. User from popup:", result.user);
      await handleSocialSignIn(result.user, "Facebook");
      console.debug("[AuthContext] Facebook Sign-In and profile handling complete for UID:", result.user.uid);
    } catch (error: any) {
      console.error("[AuthContext] Error during Facebook Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/unauthorized-domain') {
        console.error("[AuthContext] CRITICAL: auth/unauthorized-domain. Ensure your domain is listed in Firebase Console -> Authentication -> Settings -> Authorized domains.");
      }
      const friendlyError = new Error(getFriendlyErrorMessage(error));
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    console.debug("[AuthContext] Attempting Logout...");
    try {
      await signOut(auth);
      setUser(null);
      console.debug("[AuthContext] Logout successful. User set to null.");
      router.push('/');
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserInContext = (updatedUserData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        const newUser = { ...prevUser, ...updatedUserData };
        console.debug("[AuthContext] updateUserInContext: User data updated in context.", newUser);
        return newUser;
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, signInWithGoogle, signInWithFacebook, logout, updateUserInContext }}>
      {children}
    </AuthContext.Provider>
  );
};
