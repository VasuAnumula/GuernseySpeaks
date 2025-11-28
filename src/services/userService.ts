
'use server';

import { db, auth, storage } from '@/lib/firebase/config'; // Added storage
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
  serverTimestamp,
  writeBatch,
  collectionGroup,
  where,
} from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // Firebase Storage imports

const processUserDoc = (docSnap: any): User | null => {
  const data = docSnap.data();
  if (!data) return null;

  const convertTimestamps = (obj: any): any => {
    for (const key in obj) {
      if (obj[key] instanceof Timestamp) {
        obj[key] = obj[key].toDate();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
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

export const uploadProfilePicture = async (uid: string, file: File): Promise<string> => {
  if (!uid || !file) {
    throw new Error('User ID and file are required for upload.');
  }
  // Sanitize file name or use a fixed name/UUID to prevent issues
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = `profile_pictures/${uid}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = storageRef(storage, filePath);

  try {
    // Check for an existing profile picture to delete (optional, implement if needed)
    // This example overwrites or creates new ones based on timestamped names
    // If you want to replace a fixed name like 'avatar.jpg', you'd fetch the user doc,
    // get the old avatarUrl, parse its storage path, and delete it before uploading new one.

    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading profile picture to Firebase Storage:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('Permission denied. Check Firebase Storage security rules.');
    }
    throw new Error('Failed to upload profile picture.');
  }
};

export const updateUserProfile = async (uid: string, data: Partial<Pick<User, 'name' | 'displayName' | 'avatarUrl' | 'bio'>>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const updateData: { [key: string]: any } = { ...data };

    if (auth.currentUser && auth.currentUser.uid === uid) {
      const authUpdate: { displayName?: string | null, photoURL?: string | null } = {};
      if (data.displayName !== undefined) authUpdate.displayName = data.displayName || null;
      if (data.avatarUrl !== undefined) authUpdate.photoURL = data.avatarUrl || null;

      if (Object.keys(authUpdate).length > 0) {
        await updateAuthProfile(auth.currentUser, authUpdate);
      }
    }

    await updateDoc(userDocRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile.');
  }
};


export const updateUserDisplayNameAndPropagate = async (uid: string, newDisplayName: string): Promise<void> => {
  if (!uid || typeof newDisplayName !== 'string') {
    throw new Error('User ID and a valid new display name are required.');
  }
  const trimmedDisplayName = newDisplayName.trim();
  if (!trimmedDisplayName) {
    throw new Error('Display name cannot be empty.');
  }

  const userDocRef = doc(db, 'users', uid);

  try {
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateAuthProfile(auth.currentUser, { displayName: trimmedDisplayName });
    } else {
      console.warn(`Attempting to update display name for UID ${uid} but current auth user is different or null.`);
    }

    await updateDoc(userDocRef, {
      displayName: trimmedDisplayName,
      updatedAt: serverTimestamp(),
    });

    const postsQuery = query(collection(db, 'posts'), where('author.uid', '==', uid));
    const postsSnapshot = await getDocs(postsQuery);
    if (!postsSnapshot.empty) {
      const postBatch = writeBatch(db);
      postsSnapshot.forEach(postDoc => {
        postBatch.update(postDoc.ref, { 'author.displayName': trimmedDisplayName });
      });
      await postBatch.commit();
    }

    const commentsQuery = query(collectionGroup(db, 'comments'), where('author.uid', '==', uid));
    const commentsSnapshot = await getDocs(commentsQuery);
    if (!commentsSnapshot.empty) {
      const commentBatch = writeBatch(db);
      commentsSnapshot.forEach(commentDoc => {
        commentBatch.update(commentDoc.ref, { 'author.displayName': trimmedDisplayName });
      });
      await commentBatch.commit();
    }

  } catch (error) {
    console.error(`Error updating display name and propagating for UID ${uid}:`, error);
    throw new Error('Failed to update display name and propagate changes.');
  }
};


export const setUserRole = async (targetUserId: string, newRole: User['role']): Promise<void> => {
  if (!targetUserId || !newRole) {
    throw new Error('Target User ID and new role are required.');
  }
  if (!['user', 'moderator', 'superuser'].includes(newRole!)) {
    throw new Error('Invalid role specified.');
  }

  try {
    const userDocRef = doc(db, 'users', targetUserId);
    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error setting user role for ${targetUserId} to ${newRole}:`, error);
    throw new Error('Failed to update user role.');
  }
};

