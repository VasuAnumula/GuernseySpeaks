
'use server';

import { db } from '@/lib/firebase/config';
import type { User } from '@/types';
import {
  collection,
  getDocs,
  Timestamp,
  orderBy,
  query,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';

const processUserDoc = (docSnap: any): User | null => {
  const data = docSnap.data();
  if (!data) return null;

  const convertTimestamps = (obj: any): any => {
    for (const key in obj) {
      if (obj[key] instanceof Timestamp) {
        obj[key] = obj[key].toDate();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Check if any nested value is a Timestamp before recursing
        if (Object.values(obj[key]).some(v => v instanceof Timestamp)) {
           convertTimestamps(obj[key]);
        }
      }
    }
    return obj;
  };

  return { uid: docSnap.id, ...convertTimestamps(data) } as User;
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processUserDoc(docSnap)).filter(user => user !== null) as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users.');
  }
};

export const getUserById = async (uid: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return processUserDoc(docSnap);
    }
    return null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw new Error('Failed to fetch user profile.');
  }
};

export const updateUserProfile = async (uid: string, data: Partial<Pick<User, 'name' | 'displayName' | 'avatarUrl'>>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    // Ensure displayName is explicitly handled
    const updateData: { [key: string]: any } = { ...data };
    if (data.displayName === '') { // Allow clearing display name to fall back to name
        updateData.displayName = null;
    }
    await updateDoc(userDocRef, {
        ...updateData,
        updatedAt: serverTimestamp() // Assuming you add an updatedAt field
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile.');
  }
};
