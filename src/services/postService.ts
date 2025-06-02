
'use server';

import { db } from '@/lib/firebase/config';
import type { Post, Comment, AuthorInfo } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
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


interface CreatePostInputData {
  title: string;
  content: string;
  author: AuthorInfo; // AuthorInfo should now include displayName
  flairs: string[];
}

export async function createPost(postData: CreatePostInputData): Promise<string> {
  try {
    const slug = await generateSlug(postData.title);
    // Ensure author info includes displayName, falling back to name
    const author: AuthorInfo = {
        uid: postData.author.uid,
        name: postData.author.name,
        displayName: postData.author.displayName || postData.author.name,
        avatarUrl: postData.author.avatarUrl
    };

    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      author, // Use the processed author object
      slug,
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
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post);
    return posts.filter(post => post !== null);
  } catch (error: any) {
    console.error('[postService] Error fetching posts:', error);
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

// Note: Comment author info now includes displayName
export async function createComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<string> {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
     // Ensure author info includes displayName, falling back to name
    const author: AuthorInfo = {
        uid: commentData.author.uid,
        name: commentData.author.name,
        displayName: commentData.author.displayName || commentData.author.name,
        avatarUrl: commentData.author.avatarUrl
    };
    const docRef = await addDoc(commentsCollectionRef, {
      ...commentData,
      author, // Use the processed author object
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

export async function updateComment(postId: string, commentId: string, newContent: string): Promise<void> {
  try {
    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentDocRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    throw new Error('Failed to update comment.');
  }
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  try {
    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentDocRef);

    // Decrement commentsCount on the post
    const postDocRef = doc(db, 'posts', postId);
    await updateDoc(postDocRef, {
      commentsCount: increment(-1),
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment.');
  }
}

export async function generateSlug(title: string): Promise<string> {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};
