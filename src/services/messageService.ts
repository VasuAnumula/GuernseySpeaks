
import { db } from '@/lib/firebase/config';
import type { Conversation, Message, ParticipantInfo } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  Unsubscribe,
} from 'firebase/firestore';

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  currentUserId: string,
  currentUserInfo: ParticipantInfo,
  otherUserId: string,
  otherUserInfo: ParticipantInfo
): Promise<Conversation> {
  try {
    // Check if conversation already exists
    const existingConversation = await findConversationBetweenUsers(currentUserId, otherUserId);
    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const participants = [currentUserId, otherUserId].sort(); // Sort for consistency
    const participantInfo: { [uid: string]: ParticipantInfo } = {
      [currentUserId]: currentUserInfo,
      [otherUserId]: otherUserInfo,
    };

    const docRef = await addDoc(collection(db, 'conversations'), {
      participants,
      participantInfo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newConversation: Conversation = {
      id: docRef.id,
      participants,
      participantInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return newConversation;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw new Error('Failed to start conversation.');
  }
}

/**
 * Find existing conversation between two users
 */
export async function findConversationBetweenUsers(
  userId1: string,
  userId2: string
): Promise<Conversation | null> {
  try {
    // Firestore requires array-contains for one element at a time
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId1)
    );

    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      if (data.participants.includes(userId2)) {
        return { id: docSnap.id, ...data } as Conversation;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding conversation:', error);
    return null;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as Conversation);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
      console.error('A Firestore index is required for conversations.');
    }
    return [];
  }
}

/**
 * Subscribe to conversations in real-time
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((docSnap) => processDoc(docSnap) as Conversation);
      callback(conversations);
    },
    (error) => {
      console.error('Error in conversations subscription:', error);
      callback([]);
    }
  );
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    const docSnap = await getDoc(doc(db, 'conversations', conversationId));
    if (docSnap.exists()) {
      return processDoc(docSnap) as Conversation;
    }
    return null;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<string> {
  try {
    // Add message to subcollection
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageDoc = await addDoc(messagesRef, {
      senderId,
      content,
      read: false,
      createdAt: serverTimestamp(),
    });

    // Update conversation with last message
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        content: content.substring(0, 100),
        senderId,
        sentAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message.');
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limitCount: number = 50
): Promise<Message[]> {
  try {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as Message);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Subscribe to messages in real-time
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => processDoc(docSnap) as Message);
      callback(messages);
    },
    (error) => {
      console.error('Error in messages subscription:', error);
      callback([]);
    }
  );
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);

    const updates = querySnapshot.docs.map((docSnap) =>
      updateDoc(docSnap.ref, { read: true })
    );

    await Promise.all(updates);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const conversations = await getUserConversations(userId);
    let count = 0;

    for (const conv of conversations) {
      if (conv.lastMessage && conv.lastMessage.senderId !== userId) {
        // Check if last message is unread
        const q = query(
          collection(db, 'conversations', conv.id, 'messages'),
          where('senderId', '!=', userId),
          where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        count += snapshot.size;
      }
    }

    return count;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
}
