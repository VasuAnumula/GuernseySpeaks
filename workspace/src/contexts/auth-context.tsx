
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
            if (auth.currentUser &&
                (auth.currentUser.displayName !== (userData.displayName || userData.name) ||
                 auth.currentUser.photoURL !== userData.avatarUrl)) {
                try {
                    await updateProfile(auth.currentUser, {
                        displayName: userData.displayName || userData.name,
                        photoURL: userData.avatarUrl
                    });
                    console.log("[AuthContext] onAuthStateChanged: Firebase Auth profile updated from Firestore data for UID:", firebaseUser.uid);
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
            await setDoc(userDocRef, newUserProfile);
            console.log("[AuthContext] onAuthStateChanged: New user profile CREATED in Firestore for UID:", firebaseUser.uid);
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
        console.log("[AuthContext] onAuthStateChanged: No Firebase user.");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    console.log("[AuthContext] Attempting Email/Password Login...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("[AuthContext] Email/Password Login successful.");
    } catch (error) {
      console.error("[AuthContext] Email/Password Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    nameInput?: string | null // Changed name to nameInput to avoid conflict
  ) => {
    setLoading(true);
    console.log("[AuthContext] Attempting Email/Password Registration...");
    const actualName = nameInput || displayName; // Use displayName if nameInput is not provided
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("[AuthContext] Registration: Firebase user CREATED via email/password. UID:", firebaseUser.uid);

      const avatarInitial = (displayName || actualName).substring(0, 1).toUpperCase() || 'P';
      const generatedAvatarUrl = `https://placehold.co/40x40.png?text=${avatarInitial}`;

      await updateProfile(firebaseUser, {
        displayName: displayName, // Use displayName for Firebase profile's displayName
        photoURL: generatedAvatarUrl
      });
      console.log("[AuthContext] Registration: Firebase Auth profile (displayName, photoURL) updated for UID:", firebaseUser.uid);

      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: actualName, // Store the derived actualName (full name)
        displayName: displayName, // Store the provided public display name
        avatarUrl: generatedAvatarUrl,
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      console.log("[AuthContext] Registration: User profile CREATED in Firestore for UID:", firebaseUser.uid);
    } catch (error: any) {
      console.error("[AuthContext] Email/Password Registration error (Firebase Auth or Firestore):", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (firebaseUser: FirebaseUser, providerName: string) => {
    console.log(`[AuthContext] handleSocialSignIn (${providerName}) called for UID:`, firebaseUser.uid);
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    try {
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): User document NOT FOUND for UID: ${firebaseUser.uid}. Creating new profile.`);
        const nameFromProvider = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'AnonymousUser';
        const avatarInitial = nameFromProvider.substring(0,1).toUpperCase();
        const newUserProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: nameFromProvider, // Use this as the full name initially
          displayName: nameFromProvider, // Also use as display name initially
          avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${avatarInitial}`,
          role: 'user',
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(userDocRef, newUserProfile);
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): New user profile CREATED in Firestore for UID: ${firebaseUser.uid}`);
        setUser(newUserProfile); // Update context
      } else {
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): User document FOUND for UID: ${firebaseUser.uid}. Verifying and updating profile.`);
        const existingData = userDocSnap.data() as User;
        const updateData: Partial<User> = { updatedAt: serverTimestamp() as Timestamp };
        let changedInFirestore = false;

        // Update Firestore if provider has newer/better info AND Firestore is missing it
        if (!existingData.avatarUrl && firebaseUser.photoURL) {
          updateData.avatarUrl = firebaseUser.photoURL;
          changedInFirestore = true;
        }
        // If Firestore 'name' (full name) is empty, take it from provider's displayName
        if (!existingData.name && firebaseUser.displayName) {
          updateData.name = firebaseUser.displayName;
          changedInFirestore = true;
        }
        // If Firestore 'displayName' (public name) is empty, also take it from provider's displayName
        if (!existingData.displayName && firebaseUser.displayName) {
            updateData.displayName = firebaseUser.displayName;
            changedInFirestore = true;
        }


        // Sync Firebase Auth profile if it differs from what we've determined should be current
        const currentAuthDisplayName = auth.currentUser?.displayName;
        const currentAuthPhotoURL = auth.currentUser?.photoURL;
        const targetDisplayName = existingData.displayName || firebaseUser.displayName || existingData.name;
        const targetPhotoURL = firebaseUser.photoURL || existingData.avatarUrl;

        if (auth.currentUser && (currentAuthDisplayName !== targetDisplayName || currentAuthPhotoURL !== targetPhotoURL)) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: targetDisplayName,
              photoURL: targetPhotoURL,
            });
            console.log(`[AuthContext] handleSocialSignIn (${providerName}): Firebase Auth profile updated. UID: ${firebaseUser.uid}`);
          } catch (profileUpdateError) {
            console.error(`[AuthContext] handleSocialSignIn (${providerName}): Error updating Firebase Auth profile:`, profileUpdateError);
          }
        }

        if (changedInFirestore) {
          console.log(`[AuthContext] handleSocialSignIn (${providerName}): Updating Firestore profile. UID: ${firebaseUser.uid}`, updateData);
          await updateDoc(userDocRef, updateData);
        }

        // Set user context with the most up-to-date info
        setUser({
          ...existingData, // Base
          ...updateData,   // Firestore updates
          uid: firebaseUser.uid, // Ensure current
          email: firebaseUser.email, // From provider
          avatarUrl: targetPhotoURL, // Determined target
          name: updateData.name || existingData.name || firebaseUser.displayName,
          displayName: updateData.displayName || existingData.displayName || firebaseUser.displayName,
        });
      }
      console.log(`[AuthContext] handleSocialSignIn (${providerName}): User profile processed successfully for UID: ${firebaseUser.uid}`);
    } catch (firestoreError: any) {
      console.error(`[AuthContext] Firestore error during ${providerName} sign-in profile handling for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
      throw new Error(`Error setting up user profile after ${providerName} sign-in: ${firestoreError.message}`);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    console.log("[AuthContext] Attempting Google Sign-In Popup...");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("[AuthContext] Google Firebase Auth successful. User from popup:", result.user.uid);
      await handleSocialSignIn(result.user, "Google");
      console.log("[AuthContext] Google Sign-In and profile handling complete for UID:", result.user.uid);
    } catch (error: any) {
      console.error("[AuthContext] Error during Google Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Google Sign-in cancelled by user.");
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error during Google Sign-in. Please check your connection.");
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error("[AuthContext] CRITICAL: auth/unauthorized-domain. Ensure your domain is listed in Firebase Console -> Authentication -> Settings -> Authorized domains.");
        throw new Error("This domain is not authorized for Google Sign-in. Please contact support. (auth/unauthorized-domain)");
      }
      throw error; // Re-throw other errors to be caught by UI
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
      console.log("[AuthContext] Facebook Firebase Auth successful. User from popup:", result.user.uid);
      await handleSocialSignIn(result.user, "Facebook");
      console.log("[AuthContext] Facebook Sign-In and profile handling complete for UID:", result.user.uid);
    } catch (error: any) {
      console.error("[AuthContext] Error during Facebook Sign-in flow (Auth Popup or Profile Handling):", error.message, error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Facebook Sign-in cancelled by user.");
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error("An account already exists with the same email address but different sign-in credentials. Try signing in with Google or email.");
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error during Facebook Sign-in. Please check your connection.");
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error("[AuthContext] CRITICAL: auth/unauthorized-domain. Ensure your domain is listed in Firebase Console -> Authentication -> Settings -> Authorized domains.");
        throw new Error("This domain is not authorized for Facebook Sign-in. Please contact support. (auth/unauthorized-domain)");
      }
      throw error; // Re-throw other errors to be caught by UI
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    console.log("[AuthContext] Attempting Logout...");
    try {
      await signOut(auth);
      setUser(null);
      console.log("[AuthContext] Logout successful. User set to null.");
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
        console.log("[AuthContext] updateUserInContext: User data updated in context.", newUser);
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

    