
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
            // Ensure Firebase Auth profile is up-to-date with Firestore if necessary
            // This can happen if Firestore has a more recent displayName or avatarUrl
            // than what was cached in Firebase Auth at the time of login.
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
              email: firebaseUser.email, // Always trust Firebase Auth for email
              avatarUrl: firebaseUser.photoURL || userData.avatarUrl, // Prefer Firebase Auth if available, then Firestore
              name: userData.name || firebaseUser.displayName, // Prefer Firestore's 'name', then Firebase Auth
              displayName: userData.displayName || firebaseUser.displayName || userData.name, // Prefer Firestore's 'displayName', then Firebase Auth, then Firestore 'name'
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
            setUser(newUserProfile); // Set user with the newly created profile
          }
        } catch (firestoreError: any) {
          console.error(`[AuthContext] Firestore error in onAuthStateChanged for UID ${firebaseUser.uid}:`, firestoreError.message, firestoreError);
          setUser({ // Fallback to minimal user object from Firebase Auth if Firestore fails
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
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error("[AuthContext] Email/Password Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    console.log("[AuthContext] Attempting Email/Password Registration...");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("[AuthContext] Registration: Firebase user CREATED via email/password. UID:", firebaseUser.uid);
      
      // Update Firebase Auth profile directly
      await updateProfile(firebaseUser, { 
        displayName: name, 
        photoURL: `https://placehold.co/40x40.png?text=${name.substring(0,1)}`
      });
      console.log("[AuthContext] Registration: Firebase Auth profile (displayName, photoURL) updated for UID:", firebaseUser.uid);

      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name,
        displayName: name, 
        avatarUrl: firebaseUser.photoURL, // Use the updated photoURL from Firebase Auth profile
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      console.log("[AuthContext] Registration: User profile CREATED in Firestore for UID:", firebaseUser.uid);
      // setUser will be handled by onAuthStateChanged, which will now pick up the updated Firebase Auth profile
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
          displayName: newName,
          avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
          role: 'user',
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(userDocRef, newUserProfile); 
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): New user profile CREATED in Firestore for UID: ${firebaseUser.uid}`);
      } else {
        console.log(`[AuthContext] handleSocialSignIn (${providerName}): User document FOUND for UID: ${firebaseUser.uid}. Ensuring Firestore data is consistent.`);
        const existingData = userDocSnap.data() as User;
        const updateData: Partial<User> = { updatedAt: serverTimestamp() as Timestamp };
        let changed = false;

        // Prioritize Firebase Auth info for avatar and display name on social sign-in if Firestore is empty for those
        if (!existingData.avatarUrl && firebaseUser.photoURL) {
            updateData.avatarUrl = firebaseUser.photoURL;
            changed = true;
        }
        if (!existingData.name && firebaseUser.displayName) { // If Firestore 'name' is empty, use Firebase 'displayName'
            updateData.name = firebaseUser.displayName;
            changed = true;
        }
        if (!existingData.displayName && firebaseUser.displayName) { // If Firestore 'displayName' is empty, use Firebase 'displayName'
            updateData.displayName = firebaseUser.displayName;
            changed = true;
        }
         // Also ensure Firebase Auth profile is updated if Firestore has something more specific
        if (auth.currentUser && 
            ((existingData.displayName && auth.currentUser.displayName !== existingData.displayName) || 
             (existingData.avatarUrl && auth.currentUser.photoURL !== existingData.avatarUrl) )) {
             try {
                await updateProfile(auth.currentUser, {
                    displayName: existingData.displayName || auth.currentUser.displayName,
                    photoURL: existingData.avatarUrl || auth.currentUser.photoURL
                });
                console.log(`[AuthContext] handleSocialSignIn (${providerName}): Firebase Auth profile updated from existing Firestore data for UID: ${firebaseUser.uid}`);
             } catch (profileUpdateError) {
                 console.error(`[AuthContext] handleSocialSignIn (${providerName}): Error updating Firebase Auth profile from Firestore:`, profileUpdateError);
             }
        }


        if (changed) {
            console.log(`[AuthContext] handleSocialSignIn (${providerName}): Updating existing Firestore profile with new data from provider. UID: ${firebaseUser.uid}`, updateData);
            await updateDoc(userDocRef, updateData);
        } else {
            console.log(`[AuthContext] handleSocialSignIn (${providerName}): No new provider data to update in existing Firestore profile for UID: ${firebaseUser.uid}`);
        }
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
      console.log("[AuthContext] Google Firebase Auth successful. User from popup:", result.user);
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
      console.log("[AuthContext] Facebook Firebase Auth successful. User from popup:", result.user);
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
      throw error;
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


    