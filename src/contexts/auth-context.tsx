
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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User; // Firestore data
          // Ensure displayName is part of the user object in context
          setUser({
            ...userData, // Spread Firestore data first
            uid: firebaseUser.uid, // Ensure uid from FirebaseUser is used
            email: firebaseUser.email, // email from FirebaseUser
            avatarUrl: firebaseUser.photoURL || userData.avatarUrl || `https://placehold.co/40x40.png?text=${(userData.displayName || userData.name || 'A').substring(0,1)}`, // Prioritize FirebaseUser photoURL
            name: userData.name || firebaseUser.displayName, // name from Firestore or FirebaseUser
            displayName: userData.displayName || userData.name || firebaseUser.displayName, // displayName logic
          });
        } else {
          // New user (e.g. first social sign-in), create profile
          const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
          const newUserProfile: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: newName,
            displayName: newName, // Set displayName same as name initially
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
            role: 'user',
            createdAt: serverTimestamp() as Timestamp,
          };
          await setDoc(userDocRef, newUserProfile);
          setUser(newUserProfile);
        }
      } else {
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
      console.error("Login error:", error);
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
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name, // Use provided name
        displayName: name, // Use provided name as initial displayName
        avatarUrl: `https://placehold.co/40x40.png?text=${name.substring(0,1)}`,
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      const newName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: newName,
        displayName: newName, // Set displayName same as name initially
        avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${newName.substring(0,1)}`,
        role: 'user',
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(userDocRef, newUserProfile);
      setUser(newUserProfile);
    } else {
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
  };


  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleSocialSignIn(result.user);
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleSocialSignIn(result.user);
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      throw error;
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
      console.error("Logout error:", error);
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
