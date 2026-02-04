
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

/**
 * Helper to get the current authenticated user's UID and role.
 * Returns null if not authenticated.
 */
const getCurrentUserWithRole = async (): Promise<{ uid: string; role: User['role'] } | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      return { uid: currentUser.uid, role: userData.role };
    }
    return { uid: currentUser.uid, role: 'user' };
  } catch (error) {
    console.error('Error fetching current user role:', error);
    return null;
  }
};

/**
 * Verify that the current user is authorized to perform an action.
 * @param targetUid - The user being affected by the action
 * @param requiredRole - Optional minimum role required (e.g., 'superuser')
 * @param allowSelf - Whether the target user can perform the action on themselves
 */
const verifyAuthorization = async (
  targetUid: string,
  options: {
    requiredRole?: 'moderator' | 'superuser';
    allowSelf?: boolean;
  } = {}
): Promise<{ uid: string; role: User['role'] }> => {
  const currentUser = await getCurrentUserWithRole();

  if (!currentUser) {
    throw new Error('Authentication required. Please log in.');
  }

  const { requiredRole, allowSelf = true } = options;

  // If allowSelf and the user is modifying their own data, allow it
  if (allowSelf && currentUser.uid === targetUid) {
    return currentUser;
  }

  // Check role requirements
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = {
      'user': 0,
      'moderator': 1,
      'superuser': 2,
    };

    const currentRoleLevel = roleHierarchy[currentUser.role || 'user'] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (currentRoleLevel < requiredRoleLevel) {
      throw new Error(`Unauthorized. This action requires ${requiredRole} privileges.`);
    }

    return currentUser;
  }

  // If not self and no role grants access, deny
  if (currentUser.uid !== targetUid) {
    throw new Error('Unauthorized. You can only modify your own profile.');
  }

  return currentUser;
};

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

  // Authorization: User can only upload their own profile picture
  await verifyAuthorization(uid, { allowSelf: true });

  // Sanitize file name or use a fixed name/UUID to prevent issues
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = `profile_pictures/${uid}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = storageRef(storage, filePath);

  try {
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
  // Authorization: User can only update their own profile
  await verifyAuthorization(uid, { allowSelf: true });

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

  // Authorization: User can only update their own display name
  await verifyAuthorization(uid, { allowSelf: true });

  const trimmedDisplayName = newDisplayName.trim();
  if (!trimmedDisplayName) {
    throw new Error('Display name cannot be empty.');
  }

  const userDocRef = doc(db, 'users', uid);
  const BATCH_LIMIT = 500; // Firestore batch limit

  try {
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateAuthProfile(auth.currentUser, { displayName: trimmedDisplayName });
    }

    await updateDoc(userDocRef, {
      displayName: trimmedDisplayName,
      updatedAt: serverTimestamp(),
    });

    // Update posts in batches (respecting Firestore 500 operation limit)
    const postsQuery = query(collection(db, 'posts'), where('author.uid', '==', uid));
    const postsSnapshot = await getDocs(postsQuery);
    if (!postsSnapshot.empty) {
      const postDocs = postsSnapshot.docs;
      for (let i = 0; i < postDocs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = postDocs.slice(i, i + BATCH_LIMIT);
        chunk.forEach(postDoc => {
          batch.update(postDoc.ref, { 'author.displayName': trimmedDisplayName });
        });
        await batch.commit();
      }
    }

    // Update comments in batches (respecting Firestore 500 operation limit)
    const commentsQuery = query(collectionGroup(db, 'comments'), where('author.uid', '==', uid));
    const commentsSnapshot = await getDocs(commentsQuery);
    if (!commentsSnapshot.empty) {
      const commentDocs = commentsSnapshot.docs;
      for (let i = 0; i < commentDocs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = commentDocs.slice(i, i + BATCH_LIMIT);
        chunk.forEach(commentDoc => {
          batch.update(commentDoc.ref, { 'author.displayName': trimmedDisplayName });
        });
        await batch.commit();
      }
    }

  } catch (error) {
    console.error(`Error updating display name and propagating for UID ${uid}:`, error);
    throw new Error('Failed to update display name and propagate changes.');
  }
};


export const setUserRole = async (
  targetUserId: string,
  newRole: User['role'],
  adminDisplayName?: string
): Promise<{ oldRole: string; newRole: string }> => {
  if (!targetUserId || !newRole) {
    throw new Error('Target User ID and new role are required.');
  }
  if (!['user', 'moderator', 'superuser'].includes(newRole!)) {
    throw new Error('Invalid role specified.');
  }

  // Authorization: Only superusers can change user roles
  const currentUser = await verifyAuthorization(targetUserId, {
    requiredRole: 'superuser',
    allowSelf: false, // Cannot change your own role
  });

  // Prevent superuser from demoting themselves (safety check)
  if (currentUser.uid === targetUserId) {
    throw new Error('You cannot change your own role.');
  }

  try {
    const userDocRef = doc(db, 'users', targetUserId);

    // Get current role for audit log
    const userSnap = await getDoc(userDocRef);
    const oldRole = userSnap.exists() ? (userSnap.data().role || 'user') : 'user';

    // Don't allow demoting other superusers
    if (oldRole === 'superuser') {
      throw new Error('Cannot change the role of another superuser.');
    }

    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });

    // Create audit log
    const { logUserRoleChange } = await import('./auditLogService');
    await logUserRoleChange(
      currentUser.uid,
      adminDisplayName || 'Admin',
      targetUserId,
      oldRole,
      newRole!
    );

    return { oldRole, newRole: newRole! };
  } catch (error: any) {
    console.error(`Error setting user role for ${targetUserId} to ${newRole}:`, error);
    throw new Error(error.message || 'Failed to update user role.');
  }
};

/**
 * Ban a user (superuser only)
 */
export const banUser = async (
  targetUserId: string,
  reason: string,
  adminDisplayName?: string
): Promise<void> => {
  if (!targetUserId) {
    throw new Error('Target User ID is required.');
  }

  // Authorization: Only superusers can ban users
  const currentUser = await verifyAuthorization(targetUserId, {
    requiredRole: 'superuser',
    allowSelf: false,
  });

  if (currentUser.uid === targetUserId) {
    throw new Error('You cannot ban yourself.');
  }

  try {
    const userDocRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      throw new Error('User not found.');
    }

    const userData = userSnap.data() as User;

    // Don't allow banning superusers
    if (userData.role === 'superuser') {
      throw new Error('Cannot ban a superuser.');
    }

    await updateDoc(userDocRef, {
      isBanned: true,
      bannedAt: serverTimestamp(),
      bannedBy: currentUser.uid,
      banReason: reason || 'No reason provided',
      updatedAt: serverTimestamp(),
    });

    // Create audit log
    const { logUserBan } = await import('./auditLogService');
    await logUserBan(currentUser.uid, adminDisplayName || 'Admin', targetUserId, reason);
  } catch (error: any) {
    console.error(`Error banning user ${targetUserId}:`, error);
    throw new Error(error.message || 'Failed to ban user.');
  }
};

/**
 * Unban a user (superuser only)
 */
export const unbanUser = async (
  targetUserId: string,
  adminDisplayName?: string
): Promise<void> => {
  if (!targetUserId) {
    throw new Error('Target User ID is required.');
  }

  // Authorization: Only superusers can unban users
  const currentUser = await verifyAuthorization(targetUserId, {
    requiredRole: 'superuser',
    allowSelf: false,
  });

  try {
    const userDocRef = doc(db, 'users', targetUserId);

    await updateDoc(userDocRef, {
      isBanned: false,
      bannedAt: null,
      bannedBy: null,
      banReason: null,
      updatedAt: serverTimestamp(),
    });

    // Create audit log
    const { logUserUnban } = await import('./auditLogService');
    await logUserUnban(currentUser.uid, adminDisplayName || 'Admin', targetUserId);
  } catch (error: any) {
    console.error(`Error unbanning user ${targetUserId}:`, error);
    throw new Error(error.message || 'Failed to unban user.');
  }
};

/**
 * Search users by name or email
 */
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    // Firestore doesn't support full-text search, so we fetch all and filter client-side
    // For production, consider using Algolia or Elasticsearch
    const users = await getUsers();
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    return users.filter(user =>
      (user.displayName?.toLowerCase().includes(lowerSearchTerm)) ||
      (user.name?.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email?.toLowerCase().includes(lowerSearchTerm))
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users.');
  }
};

