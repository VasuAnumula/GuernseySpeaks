
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const PRIVACY_POLICY_DOC_PATH = 'siteContent/privacyPolicy';

interface PrivacyPolicyData {
  content: string;
  updatedAt?: Timestamp | Date;
}

/**
 * Fetches the privacy policy content from Firestore.
 * @returns The privacy policy content as a string, or a default message if not found.
 */
export async function getPrivacyPolicy(): Promise<string> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as PrivacyPolicyData;
      return data.content || '';
    } else {
      return 'Privacy Policy content has not been set yet.';
    }
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    // It's important to not throw here if the page should still render with a default message
    return 'Could not load the privacy policy due to an error. Please try again later.';
  }
}

/**
 * Updates the privacy policy content in Firestore.
 * This function should ideally be protected to ensure only superusers can call it.
 * The protection is currently implemented on the client-side UI.
 * @param newContent The new privacy policy content.
 */
export async function updatePrivacyPolicy(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // merge: true creates the document if it doesn't exist
  } catch (error) {
    console.error('Error updating privacy policy:', error);
    throw new Error('Failed to update privacy policy.');
  }
}
