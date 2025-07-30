
import { db, storage } from '@/lib/firebase/config';
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
  limit,
  where,
  QueryConstraint,
  OrderByDirection
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';


interface CreatePostInputData {
  title: string;
  content: string;
  author: AuthorInfo;
  flairs: string[];
  imageUrl?: string | null;
}

export interface GetPostsFilters {
  flair?: string;
  sortBy?: 'createdAt' | 'likes' | 'commentsCount'; // Added commentsCount
  sortOrder?: OrderByDirection;
}

export async function createPost(postData: CreatePostInputData): Promise<string> {
  try {
    const slug = await generateSlug(postData.title);
    const author: AuthorInfo = {
        uid: postData.author.uid,
        displayName: postData.author.displayName,
        avatarUrl: postData.author.avatarUrl
    };

    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      author,
      slug,
      commentsCount: 0,
      likes: 0,
      likedBy: [],
      dislikes: 0,
      dislikedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating post:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error
    });
    throw new Error(`Failed to create post: ${error.message}`);
  }
};

export async function updatePost(postId: string, postData: Partial<Pick<Post, 'title' | 'content' | 'flairs' | 'imageUrl'>>): Promise<void> {
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

export async function getPosts(filters?: GetPostsFilters): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const queryConstraints: QueryConstraint[] = [];

    if (filters?.flair) {
      // Flairs are stored as an array, e.g., ["news", "local-issue"]
      // The value in filters.flair should match one of these exactly.
      queryConstraints.push(where('flairs', 'array-contains', filters.flair));
    }

    const sortByField = filters?.sortBy || 'createdAt';
    const sortDirection = filters?.sortOrder || 'desc';
    queryConstraints.push(orderBy(sortByField, sortDirection));
    
    // If sorting by a field other than the one used in an inequality filter (none here),
    // and also not createdAt, Firestore might require it as the first orderBy.
    // If `flair` filter is active, and sorting is by `likes` or `commentsCount`,
    // Firestore might require an index on `flairs` and `likes`/`commentsCount`.
    // The error message for missing indexes is helpful.
    if (sortByField !== 'createdAt' && filters?.flair) {
        // If also sorting by createdAt for tie-breaking after likes/commentsCount,
        // ensure 'createdAt' is the last orderBy if the primary sort is different.
        // However, Firestore usually allows multiple orderBy clauses if indexed correctly.
        // For simplicity, we'll rely on the main sort for now.
        // queryConstraints.push(orderBy('createdAt', 'desc')); // Example tie-breaker
    }


    queryConstraints.push(limit(25)); // Default limit


    const q = query(postsCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post);
    return posts.filter(post => post !== null);
  } catch (error: any) {
    console.error('[postService] Error fetching posts:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
        let detailedMessage = `Failed to fetch posts. A Firestore index is likely missing. Please check Firebase console logs for details and a link to create the index.`;
        detailedMessage += ` Query involved: ${filters?.flair ? `flair='${filters.flair}'` : ''} sorted by ${filters?.sortBy || 'createdAt'} ${filters?.sortOrder || 'desc'}.`;
        console.error(detailedMessage);
        throw new Error(detailedMessage + ` Original error: ${error.message}`);
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

export async function togglePostLike(postId: string, userId: string): Promise<{ likes: number; likedBy: string[]; dislikes: number; dislikedBy: string[] }> {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    const postData = postSnap.data() as Post;
    const currentlyLikedBy = postData.likedBy || [];
    const currentlyDislikedBy = postData.dislikedBy || [];
    const updateData: any = {};

    if (currentlyLikedBy.includes(userId)) {
      updateData.likes = increment(-1);
      updateData.likedBy = arrayRemove(userId);
    } else {
      updateData.likes = increment(1);
      updateData.likedBy = arrayUnion(userId);
      if (currentlyDislikedBy.includes(userId)) {
        updateData.dislikes = increment(-1);
        updateData.dislikedBy = arrayRemove(userId);
      }
    }

    await updateDoc(postDocRef, updateData);

    const updatedPostSnap = await getDoc(postDocRef);
    const updatedData = updatedPostSnap.data() as Post;
    return {
      likes: updatedData.likes,
      likedBy: updatedData.likedBy,
      dislikes: updatedData.dislikes,
      dislikedBy: updatedData.dislikedBy,
    };
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw new Error('Failed to toggle like on post.');
  }
};

export async function togglePostDislike(postId: string, userId: string): Promise<{ likes: number; likedBy: string[]; dislikes: number; dislikedBy: string[] }> {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    const postData = postSnap.data() as Post;
    const currentlyDislikedBy = postData.dislikedBy || [];
    const currentlyLikedBy = postData.likedBy || [];
    const updateData: any = {};

    if (currentlyDislikedBy.includes(userId)) {
      updateData.dislikes = increment(-1);
      updateData.dislikedBy = arrayRemove(userId);
    } else {
      updateData.dislikes = increment(1);
      updateData.dislikedBy = arrayUnion(userId);
      if (currentlyLikedBy.includes(userId)) {
        updateData.likes = increment(-1);
        updateData.likedBy = arrayRemove(userId);
      }
    }

    await updateDoc(postDocRef, updateData);
    const updatedPostSnap = await getDoc(postDocRef);
    const updatedData = updatedPostSnap.data() as Post;
    return {
      likes: updatedData.likes,
      likedBy: updatedData.likedBy,
      dislikes: updatedData.dislikes,
      dislikedBy: updatedData.dislikedBy,
    };
  } catch (error) {
    console.error('Error toggling post dislike:', error);
    throw new Error('Failed to toggle dislike on post.');
  }
};

export async function createComment(
  postId: string,
  commentData: Pick<Comment, 'author' | 'content' | 'imageUrl'>,
  parentId: string | null = null
): Promise<string> {
  try {
    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const author: AuthorInfo = {
        uid: commentData.author.uid,
        displayName: commentData.author.displayName,
        avatarUrl: commentData.author.avatarUrl
    };
    const docRef = await addDoc(commentsCollectionRef, {
      postId: postId,
      author,
      content: commentData.content,
      imageUrl: commentData.imageUrl || null,
      parentId: parentId,
      likes: 0,
      likedBy: [],
      dislikes: 0,
      dislikedBy: [],
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
    // Sort by createdAt ascending to maintain chronological order for replies within a thread.
    // Top-level comments are sorted newest first on the client-side after tree construction.
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(docSnap => {
        const processed = processDoc(docSnap) as Comment;
        // Ensure parentId is explicitly null if it's undefined from Firestore
        return { ...processed, parentId: processed.parentId === undefined ? null : processed.parentId };
    });
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
    // Future enhancement: Consider transactional delete or handling orphaned replies if business logic requires it.
    // For now, it's a direct delete. If a comment with replies is deleted, its replies become "orphaned"
    // in terms of parentId linkage but will still exist. The UI's tree building might hide them
    // or they might appear as top-level if not handled carefully.
    // A more robust delete would recursively delete replies or re-parent them.

    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentDocRef);

    const postDocRef = doc(db, 'posts', postId);
    await updateDoc(postDocRef, {
      commentsCount: increment(-1), // Ensure this doesn't go below zero if counts get out of sync.
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment.');
  }
}

export async function uploadPostImage(file: File): Promise<string> {
  try {
    console.log('uploadPostImage called with file:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size must be less than 5MB');
    }
    
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!sanitized) {
      throw new Error('Invalid file name');
    }
    
    // Check if storage is initialized
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    
    // Check if user is authenticated (Firebase Storage often requires auth)
    console.log('Checking authentication status...');
    const { auth } = await import('@/lib/firebase/config');
    
    // Wait for auth to be ready if needed
    await new Promise<void>((resolve) => {
      if (auth.currentUser !== null) {
        resolve();
      } else {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve();
        });
        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, 5000);
      }
    });
    
    const currentUser = auth.currentUser;
    console.log('Current user after auth check:', currentUser ? { 
      uid: currentUser.uid, 
      email: currentUser.email,
      displayName: currentUser.displayName 
    } : 'Not authenticated');
    
    if (!currentUser) {
      throw new Error('User must be authenticated to upload images');
    }
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${sanitized}`;
    const fileRef = storageRef(storage, `post_images/${fileName}`);
    
    console.log('Storage reference created:', fileRef.fullPath);
    console.log('Starting upload to Firebase Storage:', fileName);
    
    // Add progress monitoring
    const uploadTask = uploadBytes(fileRef, file);
    console.log('Upload task created, waiting for completion...');
    
    const uploadResult = await uploadTask;
    console.log('Upload completed successfully:', uploadResult.metadata.fullPath);
    
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(fileRef);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('uploadPostImage error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      name: (error as any)?.name
    });
    throw error;
  }
}

export async function uploadCommentImage(postId: string, file: File): Promise<string> {
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '')
  const fileRef = storageRef(storage, `comment_images/${postId}/${Date.now()}_${sanitized}`)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

export async function toggleCommentLike(postId: string, commentId: string, userId: string): Promise<Comment> {
  try {
    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentDocRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');

    const data = commentSnap.data() as Comment;
    const likedBy = data.likedBy || [];
    const dislikedBy = data.dislikedBy || [];
    const updateData: any = {};

    if (likedBy.includes(userId)) {
      updateData.likes = increment(-1);
      updateData.likedBy = arrayRemove(userId);
    } else {
      updateData.likes = increment(1);
      updateData.likedBy = arrayUnion(userId);
      if (dislikedBy.includes(userId)) {
        updateData.dislikes = increment(-1);
        updateData.dislikedBy = arrayRemove(userId);
      }
    }

    await updateDoc(commentDocRef, updateData);
    const updatedSnap = await getDoc(commentDocRef);
    return processDoc(updatedSnap) as Comment;
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw new Error('Failed to toggle like on comment.');
  }
}

export async function toggleCommentDislike(postId: string, commentId: string, userId: string): Promise<Comment> {
  try {
    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
    const commentSnap = await getDoc(commentDocRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');

    const data = commentSnap.data() as Comment;
    const dislikedBy = data.dislikedBy || [];
    const likedBy = data.likedBy || [];
    const updateData: any = {};

    if (dislikedBy.includes(userId)) {
      updateData.dislikes = increment(-1);
      updateData.dislikedBy = arrayRemove(userId);
    } else {
      updateData.dislikes = increment(1);
      updateData.dislikedBy = arrayUnion(userId);
      if (likedBy.includes(userId)) {
        updateData.likes = increment(-1);
        updateData.likedBy = arrayRemove(userId);
      }
    }

    await updateDoc(commentDocRef, updateData);
    const updatedSnap = await getDoc(commentDocRef);
    return processDoc(updatedSnap) as Comment;
  } catch (error) {
    console.error('Error toggling comment dislike:', error);
    throw new Error('Failed to toggle dislike on comment.');
  }
}

export async function generateSlug(title: string): Promise<string> {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Replace multiple hyphens with a single one
};
