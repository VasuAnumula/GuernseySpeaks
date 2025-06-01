
'use server';

import { db } from '@/lib/firebase/config'; // Ensure db is exported from firebase config
import type { Post, Comment, AuthorInfo } from '@/types';
import { processDoc } from '@/lib/firestoreUtils'; // Import from new location
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


// Define the input type for createPost more precisely
interface CreatePostInputData {
  title: string;
  content: string;
  author: AuthorInfo;
  flairs: string[];
}

export async function createPost(postData: CreatePostInputData): Promise<string> {
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

export async function updatePost(postId: string, postData: Partial<Pick<Post, 'title' | 'content' | 'flairs'>>): Promise<void> {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const firestoreUpdateData: { [key: string]: any } = { 
      ...postData,
      updatedAt: serverTimestamp(),
    };

    if (postData.title) {
      firestoreUpdateData.slug = await generateSlug(postData.title); 
    }
    
    await updateDoc(postDocRef, firestoreUpdateData);
  } catch (error) {
    console.error('Error updating post:', error);
    throw new Error('Failed to update post.');
  }
};

export async function deletePost(postId: string): Promise<void> {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const batch = writeBatch(db);

    const commentsRef = collection(db, 'posts', postId, 'comments');
    const commentsSnapshot = await getDocs(commentsRef);
    commentsSnapshot.docs.forEach(commentDoc => {
      batch.delete(commentDoc.ref);
    });

    batch.delete(postDocRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting post:', error);
    throw new Error('Failed to delete post.');
  }
};

export async function getPosts(): Promise<Post[]> {
  try {
    console.log('[postService] Attempting to fetch posts from Firestore.');
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    console.log(`[postService] Successfully fetched ${querySnapshot.docs.length} posts.`);
    
    // Use Promise.all if processDoc were async, but it's sync now and imported
    const posts = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post);
    return posts.filter(post => post !== null);

  } catch (error: any) {
    console.error('[postService] Error fetching posts:', error);
    if (error.code) { 
      console.error('[postService] Firebase Error Code:', error.code);
    }
    console.error('[postService] Error Message:', error.message);
    if (error.stack) {
      console.error('[postService] Error Stack:', error.stack);
    }
    throw new Error(`Failed to fetch posts. Original error: ${error.message}`);
  }
};

export async function getPostById(postId: string): Promise<Post | null> {
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

export async function togglePostLike(postId: string, userId: string): Promise<{ likes: number; likedBy: string[] }> {
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
      newLikes = increment(-1);
      newLikedBy = arrayRemove(userId);
    } else {
      newLikes = increment(1);
      newLikedBy = arrayUnion(userId);
    }

    await updateDoc(postDocRef, {
      likes: newLikes,
      likedBy: newLikedBy
    });
    
    const updatedPostSnap = await getDoc(postDocRef);
    const updatedData = updatedPostSnap.data() as Post;
    return { likes: updatedData.likes, likedBy: updatedData.likedBy };

  } catch (error) {
    console.error('Error toggling post like:', error);
    throw new Error('Failed to toggle like on post.');
  }
};


export async function createComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<string> {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const docRef = await addDoc(commentsCollectionRef, {
      ...commentData,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Comment);
    return comments.filter(comment => comment !== null);
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error('Failed to fetch comments.');
  }
};

export async function generateSlug(title: string): Promise<string> {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') 
    .replace(/\s+/g, '-')     
    .replace(/-+/g, '-');    
};

// Removed re-exports of db, doc, getDoc, processDoc.
// Client components should import these from their original sources or utility files.
