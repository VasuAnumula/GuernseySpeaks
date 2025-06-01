
'use server';

import { db } from '@/lib/firebase/config';
import type { Post, Comment, AuthorInfo } from '@/types'; // Added AuthorInfo import
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  increment,
  writeBatch,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';

// Helper to convert Firestore Timestamps to Dates for client-side usage
const processDoc = (docSnap: any) => {
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
  
  return { id: docSnap.id, ...convertTimestamps(data) };
};

// Define the input type for createPost more precisely
interface CreatePostInputData {
  title: string;
  content: string;
  author: AuthorInfo;
  flairs: string[];
}

export const createPost = async (postData: CreatePostInputData): Promise<string> => {
  try {
    const slug = await generateSlug(postData.title); // Generate slug here
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      slug, // Add generated slug
      commentsCount: 0,
      likes: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw new Error('Failed to create post.');
  }
};

export const updatePost = async (postId: string, postData: Partial<Pick<Post, 'title' | 'content' | 'flairs'>>): Promise<void> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const firestoreUpdateData: { [key: string]: any } = { // Use a more generic type for the update payload
      ...postData,
      updatedAt: serverTimestamp(),
    };

    if (postData.title) {
      firestoreUpdateData.slug = await generateSlug(postData.title); // Regenerate slug if title changes
    }
    
    await updateDoc(postDocRef, firestoreUpdateData);
  } catch (error) {
    console.error('Error updating post:', error);
    throw new Error('Failed to update post.');
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const batch = writeBatch(db);

    // Delete comments subcollection
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const commentsSnapshot = await getDocs(commentsRef);
    commentsSnapshot.docs.forEach(commentDoc => {
      batch.delete(commentDoc.ref);
    });

    // Delete the post itself
    batch.delete(postDocRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting post:', error);
    throw new Error('Failed to delete post.');
  }
};

export const getPosts = async (): Promise<Post[]> => {
  try {
    console.log('[postService] Attempting to fetch posts from Firestore.');
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    console.log(`[postService] Successfully fetched ${querySnapshot.docs.length} posts.`);
    return querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post).filter(post => post !== null);
  } catch (error: any) {
    console.error('[postService] Error fetching posts:', error);
    if (error.code) { // Firebase errors often have a code
      console.error('[postService] Firebase Error Code:', error.code);
    }
    console.error('[postService] Error Message:', error.message);
    // For more detailed stack trace in server logs if available
    if (error.stack) {
      console.error('[postService] Error Stack:', error.stack);
    }
    throw new Error(`Failed to fetch posts. Original error: ${error.message}`);
  }
};

export const getPostById = async (postId: string): Promise<Post | null> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      return processDoc(docSnap) as Post;
    }
    return null;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw new Error('Failed to fetch post.');
  }
};

export const togglePostLike = async (postId: string, userId: string): Promise<{ likes: number; likedBy: string[] }> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    const postData = postSnap.data() as Post;
    const currentlyLikedBy = postData.likedBy || [];
    let newLikes;
    let newLikedBy;

    if (currentlyLikedBy.includes(userId)) {
      // User has liked, so unlike
      newLikes = increment(-1);
      newLikedBy = arrayRemove(userId);
    } else {
      // User has not liked, so like
      newLikes = increment(1);
      newLikedBy = arrayUnion(userId);
    }

    await updateDoc(postDocRef, {
      likes: newLikes,
      likedBy: newLikedBy
    });
    
    // Return the new state for optimistic updates or direct UI update
    const updatedPostSnap = await getDoc(postDocRef);
    const updatedData = updatedPostSnap.data() as Post;
    return { likes: updatedData.likes, likedBy: updatedData.likedBy };

  } catch (error) {
    console.error('Error toggling post like:', error);
    throw new Error('Failed to toggle like on post.');
  }
};


export const createComment = async (postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<string> => {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const docRef = await addDoc(commentsCollectionRef, {
      ...commentData,
      likes: 0,
      // likedBy: [], // For future comment liking
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Increment commentsCount on the post
    const postDocRef = doc(db, 'posts', postId);
    await updateDoc(postDocRef, {
      commentsCount: increment(1)
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error('Failed to create comment.');
  }
};

export const getCommentsForPost = async (postId: string): Promise<Comment[]> => {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processDoc(docSnap) as Comment).filter(comment => comment !== null);
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error('Failed to fetch comments.');
  }
};

export const generateSlug = async (title: string): Promise<string> => {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') 
    .replace(/\s+/g, '-')     
    .replace(/-+/g, '-');    
};

// TODO: Implement functions for:
// - Liking a comment
// - Editing a comment
// - Deleting a comment 
// - Fetching posts by flair, user, etc.
// - User profile updates

