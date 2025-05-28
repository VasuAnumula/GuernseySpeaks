
'use server';

import { db } from '@/lib/firebase/config';
import type { Post, Comment, AuthorInfo } from '@/types';
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
  collectionGroup,
  where,
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
        convertTimestamps(obj[key]); // Recursively check nested objects
      }
    }
    return obj;
  };
  
  return { id: docSnap.id, ...convertTimestamps(data) };
};


export const createPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'commentsCount' | 'likes'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      commentsCount: 0,
      likes: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw new Error('Failed to create post.');
  }
};

export const getPosts = async (): Promise<Post[]> => {
  try {
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(20)); // Get latest 20 posts
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post).filter(post => post !== null);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts.');
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


export const createComment = async (postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'likes'>): Promise<string> => {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const docRef = await addDoc(commentsCollectionRef, {
      ...commentData,
      likes: 0,
      createdAt: serverTimestamp(),
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

// Basic slug generation (consider a more robust library for production)
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');    // Replace multiple hyphens with single hyphen
};

// TODO: Implement functions for:
// - Liking a post / comment
// - Editing a post / comment
// - Deleting a post / comment (handle subcollections like comments if deleting a post)
// - Fetching posts by flair, user, etc.
// - User profile updates
