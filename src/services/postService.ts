
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
  OrderByDirection,
  collectionGroup,
  runTransaction
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { notifyPostLike, notifyPostComment, notifyCommentReply } from './notificationService';


interface CreatePostInputData {
  title: string;
  content: string;
  author: AuthorInfo;
  flairs: string[];
  imageUrl?: string | null;
}

export interface GetPostsFilters {
  flair?: string;
  sortBy?: 'createdAt' | 'likes' | 'commentsCount';
  sortOrder?: OrderByDirection;
  dateFrom?: Date;
  dateTo?: Date;
  authorUid?: string;
  minLikes?: number;
  hasImage?: boolean;
  searchQuery?: string;
  includeHidden?: boolean; // For moderators/admins to see hidden content
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

/**
 * Toggle the hidden status of a post (moderator action)
 */
export async function togglePostHidden(postId: string, hide: boolean): Promise<void> {
  try {
    const postDocRef = doc(db, 'posts', postId);
    await updateDoc(postDocRef, {
      isHidden: hide,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling post hidden status:', error);
    throw new Error('Failed to update post visibility.');
  }
}

export async function getPosts(filters?: GetPostsFilters): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const queryConstraints: QueryConstraint[] = [];

    // Flair filter (can be combined with other filters)
    if (filters?.flair) {
      queryConstraints.push(where('flairs', 'array-contains', filters.flair));
    }

    // Author filter
    if (filters?.authorUid) {
      queryConstraints.push(where('author.uid', '==', filters.authorUid));
    }

    // Date range filters - note: combining multiple inequality filters requires composite indexes
    if (filters?.dateFrom) {
      queryConstraints.push(where('createdAt', '>=', filters.dateFrom));
    }
    if (filters?.dateTo) {
      // Add one day to include the entire "to" day
      const toDateEnd = new Date(filters.dateTo);
      toDateEnd.setDate(toDateEnd.getDate() + 1);
      queryConstraints.push(where('createdAt', '<=', toDateEnd));
    }

    // Minimum likes filter
    if (filters?.minLikes !== undefined && filters.minLikes > 0) {
      queryConstraints.push(where('likes', '>=', filters.minLikes));
    }

    // Sorting
    const sortByField = filters?.sortBy || 'createdAt';
    const sortDirection = filters?.sortOrder || 'desc';
    queryConstraints.push(orderBy(sortByField, sortDirection));

    // Limit results
    queryConstraints.push(limit(50));

    const q = query(postsCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    let posts = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post);
    posts = posts.filter(post => post !== null);

    // Client-side filters for features not easily queryable in Firestore

    // Has image filter (client-side)
    if (filters?.hasImage === true) {
      posts = posts.filter(post => post.imageUrl && post.imageUrl.length > 0);
    } else if (filters?.hasImage === false) {
      posts = posts.filter(post => !post.imageUrl);
    }

    // Text search (client-side, case-insensitive)
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase().trim();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        (post.author?.displayName?.toLowerCase().includes(searchLower))
      );
    }

    // Filter out hidden posts unless includeHidden is true (for moderators/admins)
    if (!filters?.includeHidden) {
      posts = posts.filter(post => !post.isHidden);
    }

    return posts;
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

export async function togglePostLike(
  postId: string,
  userId: string,
  userDisplayName?: string
): Promise<{ likes: number; likedBy: string[]; dislikes: number; dislikedBy: string[] }> {
  try {
    const postDocRef = doc(db, 'posts', postId);

    const result = await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postDocRef);
      if (!postSnap.exists()) {
        throw new Error("Post not found");
      }

      const postData = postSnap.data() as Post;
      const currentlyLikedBy = postData.likedBy || [];
      const currentlyDislikedBy = postData.dislikedBy || [];
      const isCurrentlyLiked = currentlyLikedBy.includes(userId);
      const isCurrentlyDisliked = currentlyDislikedBy.includes(userId);

      let newLikes = postData.likes || 0;
      let newDislikes = postData.dislikes || 0;
      let newLikedBy = [...currentlyLikedBy];
      let newDislikedBy = [...currentlyDislikedBy];

      if (isCurrentlyLiked) {
        // Unlike
        newLikes -= 1;
        newLikedBy = newLikedBy.filter(uid => uid !== userId);
      } else {
        // Like
        newLikes += 1;
        newLikedBy.push(userId);
        // Remove dislike if exists
        if (isCurrentlyDisliked) {
          newDislikes -= 1;
          newDislikedBy = newDislikedBy.filter(uid => uid !== userId);
        }
      }

      transaction.update(postDocRef, {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      });

      return {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
        isNewLike: !isCurrentlyLiked,
        postTitle: postData.title,
        postAuthorUid: postData.author?.uid,
      };
    });

    // Send notification for new likes (not unlikes) - outside transaction
    if (result.isNewLike && result.postAuthorUid && result.postAuthorUid !== userId) {
      try {
        await notifyPostLike(
          result.postAuthorUid,
          postId,
          result.postTitle,
          userId,
          userDisplayName || 'Someone'
        );
      } catch (notifError) {
        console.error('Failed to send like notification:', notifError);
      }
    }

    return {
      likes: result.likes,
      likedBy: result.likedBy,
      dislikes: result.dislikes,
      dislikedBy: result.dislikedBy,
    };
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw new Error('Failed to toggle like on post.');
  }
}

export async function togglePostDislike(postId: string, userId: string): Promise<{ likes: number; likedBy: string[]; dislikes: number; dislikedBy: string[] }> {
  try {
    const postDocRef = doc(db, 'posts', postId);

    const result = await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postDocRef);
      if (!postSnap.exists()) {
        throw new Error("Post not found");
      }

      const postData = postSnap.data() as Post;
      const currentlyLikedBy = postData.likedBy || [];
      const currentlyDislikedBy = postData.dislikedBy || [];
      const isCurrentlyLiked = currentlyLikedBy.includes(userId);
      const isCurrentlyDisliked = currentlyDislikedBy.includes(userId);

      let newLikes = postData.likes || 0;
      let newDislikes = postData.dislikes || 0;
      let newLikedBy = [...currentlyLikedBy];
      let newDislikedBy = [...currentlyDislikedBy];

      if (isCurrentlyDisliked) {
        // Remove dislike
        newDislikes -= 1;
        newDislikedBy = newDislikedBy.filter(uid => uid !== userId);
      } else {
        // Add dislike
        newDislikes += 1;
        newDislikedBy.push(userId);
        // Remove like if exists
        if (isCurrentlyLiked) {
          newLikes -= 1;
          newLikedBy = newLikedBy.filter(uid => uid !== userId);
        }
      }

      transaction.update(postDocRef, {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      });

      return {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      };
    });

    return result;
  } catch (error) {
    console.error('Error toggling post dislike:', error);
    throw new Error('Failed to toggle dislike on post.');
  }
}

export async function createComment(
  postId: string,
  commentData: Pick<Comment, 'author' | 'content' | 'imageUrl'>,
  parentId: string | null = null,
  parentCommentAuthorUid?: string
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
    const postSnap = await getDoc(postDocRef);

    await updateDoc(postDocRef, {
      commentsCount: increment(1)
    });

    // Send notifications
    if (postSnap.exists()) {
      const postData = postSnap.data() as Post;

      // If this is a reply to another comment, notify the parent comment author
      if (parentId && parentCommentAuthorUid && parentCommentAuthorUid !== commentData.author.uid) {
        try {
          await notifyCommentReply(
            parentCommentAuthorUid,
            postId,
            parentId,
            commentData.author.uid,
            commentData.author.displayName || 'Someone'
          );
        } catch (notifError) {
          console.error('Failed to send reply notification:', notifError);
        }
      }
      // If this is a top-level comment, notify the post author
      else if (!parentId && postData.author?.uid && postData.author.uid !== commentData.author.uid) {
        try {
          await notifyPostComment(
            postData.author.uid,
            postId,
            postData.title,
            commentData.author.uid,
            commentData.author.displayName || 'Someone'
          );
        } catch (notifError) {
          console.error('Failed to send comment notification:', notifError);
        }
      }
    }

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

    const result = await runTransaction(db, async (transaction) => {
      const commentSnap = await transaction.get(commentDocRef);
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const data = commentSnap.data() as Comment;
      const currentlyLikedBy = data.likedBy || [];
      const currentlyDislikedBy = data.dislikedBy || [];
      const isCurrentlyLiked = currentlyLikedBy.includes(userId);
      const isCurrentlyDisliked = currentlyDislikedBy.includes(userId);

      let newLikes = data.likes || 0;
      let newDislikes = data.dislikes || 0;
      let newLikedBy = [...currentlyLikedBy];
      let newDislikedBy = [...currentlyDislikedBy];

      if (isCurrentlyLiked) {
        // Unlike
        newLikes -= 1;
        newLikedBy = newLikedBy.filter(uid => uid !== userId);
      } else {
        // Like
        newLikes += 1;
        newLikedBy.push(userId);
        // Remove dislike if exists
        if (isCurrentlyDisliked) {
          newDislikes -= 1;
          newDislikedBy = newDislikedBy.filter(uid => uid !== userId);
        }
      }

      transaction.update(commentDocRef, {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      });

      const { id: _existingId, ...restData } = data;
      return {
        ...restData,
        id: commentId,
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      } as Comment;
    });

    return result;
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw new Error('Failed to toggle like on comment.');
  }
}

export async function toggleCommentDislike(postId: string, commentId: string, userId: string): Promise<Comment> {
  try {
    const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);

    const result = await runTransaction(db, async (transaction) => {
      const commentSnap = await transaction.get(commentDocRef);
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const data = commentSnap.data() as Comment;
      const currentlyLikedBy = data.likedBy || [];
      const currentlyDislikedBy = data.dislikedBy || [];
      const isCurrentlyLiked = currentlyLikedBy.includes(userId);
      const isCurrentlyDisliked = currentlyDislikedBy.includes(userId);

      let newLikes = data.likes || 0;
      let newDislikes = data.dislikes || 0;
      let newLikedBy = [...currentlyLikedBy];
      let newDislikedBy = [...currentlyDislikedBy];

      if (isCurrentlyDisliked) {
        // Remove dislike
        newDislikes -= 1;
        newDislikedBy = newDislikedBy.filter(uid => uid !== userId);
      } else {
        // Add dislike
        newDislikes += 1;
        newDislikedBy.push(userId);
        // Remove like if exists
        if (isCurrentlyLiked) {
          newLikes -= 1;
          newLikedBy = newLikedBy.filter(uid => uid !== userId);
        }
      }

      transaction.update(commentDocRef, {
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      });

      const { id: _existingId, ...restData } = data;
      return {
        ...restData,
        id: commentId,
        likes: newLikes,
        likedBy: newLikedBy,
        dislikes: newDislikes,
        dislikedBy: newDislikedBy,
      } as Comment;
    });

    return result;
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

/**
 * Get all posts created by a specific user
 */
export async function getPostsByAuthor(authorUid: string): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const q = query(
      postsCollection,
      where('author.uid', '==', authorUid),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to most recent 50 posts
    );
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Post);
    return posts.filter(post => post !== null);
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    throw new Error('Failed to fetch user posts.');
  }
}

/**
 * Get all comments made by a specific user across all posts
 * Returns comments with post context
 */
/**
 * Get all comments made by a specific user across all posts
 * Returns comments with post context
 */
export async function getCommentsByUser(userUid: string): Promise<(Comment & { postId: string })[]> {
  try {
    // Use collectionGroup to query all comments across all posts efficiently
    // This requires a composite index on 'comments' collection group: author.uid ASC, createdAt DESC
    const commentsQuery = query(
      collectionGroup(db, 'comments'),
      where('author.uid', '==', userUid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(commentsQuery);

    // Map comments and ensure they have postId (which is the parent doc ID for subcollection items)
    const comments = querySnapshot.docs.map(docSnap => {
      const processed = processDoc(docSnap) as Comment;
      // For a subcollection 'posts/{postId}/comments/{commentId}', the parent doc is the post
      const postDocRef = docSnap.ref.parent.parent;
      const postId = postDocRef ? postDocRef.id : 'unknown';

      return {
        ...processed,
        postId,
        parentId: processed.parentId === undefined ? null : processed.parentId
      };
    });

    return comments.filter(comment => comment !== null);
  } catch (error: any) {
    console.error('Error fetching comments by user:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
      const detailedMessage = `Failed to fetch user comments. A Firestore index is likely missing. Please check Firebase console logs for details and a link to create the index.`;
      console.error(detailedMessage);
      throw new Error(detailedMessage + ` Original error: ${error.message}`);
    }
    throw new Error('Failed to fetch user comments.');
  }
}

