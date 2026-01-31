
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getPostById } from './postService';
import type { Post } from '@/types';

/**
 * Toggle save/unsave a post for a user
 * @param userId - The user's UID
 * @param postId - The post ID to toggle
 * @returns Object with isSaved status and updated savedPosts array
 */
export async function toggleSavePost(
  userId: string,
  postId: string
): Promise<{ isSaved: boolean; savedPosts: string[] }> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const currentSavedPosts: string[] = userData.savedPosts || [];
    const isCurrentlySaved = currentSavedPosts.includes(postId);

    if (isCurrentlySaved) {
      // Unsave the post
      await updateDoc(userDocRef, {
        savedPosts: arrayRemove(postId),
      });
      return {
        isSaved: false,
        savedPosts: currentSavedPosts.filter((id) => id !== postId),
      };
    } else {
      // Save the post
      await updateDoc(userDocRef, {
        savedPosts: arrayUnion(postId),
      });
      return {
        isSaved: true,
        savedPosts: [...currentSavedPosts, postId],
      };
    }
  } catch (error) {
    console.error('Error toggling save post:', error);
    throw new Error('Failed to save/unsave post.');
  }
}

/**
 * Check if a post is saved by a user
 * @param userId - The user's UID
 * @param postId - The post ID to check
 * @returns Boolean indicating if the post is saved
 */
export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();
    const savedPosts: string[] = userData.savedPosts || [];
    return savedPosts.includes(postId);
  } catch (error) {
    console.error('Error checking if post is saved:', error);
    return false;
  }
}

/**
 * Get all saved posts for a user
 * @param userId - The user's UID
 * @returns Array of saved Post objects
 */
export async function getSavedPosts(userId: string): Promise<Post[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return [];
    }

    const userData = userSnap.data();
    const savedPostIds: string[] = userData.savedPosts || [];

    if (savedPostIds.length === 0) {
      return [];
    }

    // Fetch all saved posts
    const posts: Post[] = [];
    for (const postId of savedPostIds) {
      try {
        const post = await getPostById(postId);
        if (post) {
          posts.push(post);
        }
      } catch (err) {
        // Post might have been deleted, skip it
        console.warn(`Saved post ${postId} not found, skipping.`);
      }
    }

    // Sort by createdAt descending (newest first)
    posts.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any).toDate();
      const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any).toDate();
      return dateB.getTime() - dateA.getTime();
    });

    return posts;
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    throw new Error('Failed to fetch saved posts.');
  }
}

/**
 * Get saved post IDs for a user
 * @param userId - The user's UID
 * @returns Array of saved post IDs
 */
export async function getSavedPostIds(userId: string): Promise<string[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return [];
    }

    const userData = userSnap.data();
    return userData.savedPosts || [];
  } catch (error) {
    console.error('Error fetching saved post IDs:', error);
    return [];
  }
}
