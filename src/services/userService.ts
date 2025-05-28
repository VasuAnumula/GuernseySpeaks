
'use server';

import { db } from '@/lib/firebase/config';
import type { User } from '@/types';
import {
  collection,
  getDocs,
  Timestamp,
  orderBy,
  query
} from 'firebase/firestore';

// Helper to convert Firestore Timestamps to Dates for client-side usage
const processUserDoc = (docSnap: any): User | null => {
  const data = docSnap.data();
  if (!data) return null;

  const convertTimestamps = (obj: any): any => {
    for (const key in obj) {
      if (obj[key] instanceof Timestamp) {
        obj[key] = obj[key].toDate();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        convertTimestamps(obj[key]);
      }
    }
    return obj;
  };
  
  return { uid: docSnap.id, ...convertTimestamps(data) } as User;
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const usersCollection = collection(db, 'users');
    // Optionally order by a field, e.g., createdAt or name
    const q = query(usersCollection, orderBy('createdAt', 'desc')); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processUserDoc(docSnap)).filter(user => user !== null) as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users.');
  }
};
