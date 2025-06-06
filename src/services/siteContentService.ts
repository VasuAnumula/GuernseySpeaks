
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';

const PRIVACY_POLICY_DOC_PATH = 'siteContent/privacyPolicy';
const DATA_DELETION_POLICY_DOC_PATH = 'siteContent/dataDeletionPolicy';

interface SiteContentData {
  content: string;
  updatedAt?: Timestamp | Date;
}

const DEFAULT_PRIVACY_POLICY = 'Privacy Policy content has not been set yet.';
const DEFAULT_DATA_DELETION_POLICY = `<h1>Request Data Deletion</h1>
<p>
  If you’d like us to permanently delete all personal data we have about your account (including
  your name, email, profile picture, etc.), please email us at
  <a href="mailto:privacy@example.com?subject=Data%20Deletion%20Request">
    privacy@example.com
  </a>.
</p>
<p>
  In your email, please include:
  <ul>
    <li>Your full name</li>
    <li>The email address you used to sign in</li>
    <li>A short statement requesting deletion</li>
  </ul>
</p>
<p>
  Once we receive your request, we’ll remove all your personal data from our systems within 30 days
  and confirm via email when it’s complete.
</p>
<p>Please replace privacy@example.com with your actual contact email address.</p>`;

/**
 * Fetches the privacy policy content from Firestore.
 * @returns The privacy policy content as a string, or a default message if not found.
 */
export async function getPrivacyPolicy(): Promise<string> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SiteContentData;
      return data.content || DEFAULT_PRIVACY_POLICY;
    } else {
      // If doc doesn't exist, create it with default content
      await setDoc(docRef, { content: DEFAULT_PRIVACY_POLICY, updatedAt: serverTimestamp() });
      return DEFAULT_PRIVACY_POLICY;
    }
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    return 'Could not load the privacy policy due to an error. Please try again later.';
  }
}

/**
 * Updates the privacy policy content in Firestore.
 * @param newContent The new privacy policy content.
 */
export async function updatePrivacyPolicy(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating privacy policy:', error);
    throw new Error('Failed to update privacy policy.');
  }
}

/**
 * Fetches the data deletion policy content from Firestore.
 * @returns The data deletion policy content as a string, or a default message if not found.
 */
export async function getDataDeletionPolicy(): Promise<string> {
  try {
    const docRef = doc(db, DATA_DELETION_POLICY_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SiteContentData;
      return data.content || DEFAULT_DATA_DELETION_POLICY;
    } else {
      // If doc doesn't exist, create it with default content
      await setDoc(docRef, { content: DEFAULT_DATA_DELETION_POLICY, updatedAt: serverTimestamp() });
      return DEFAULT_DATA_DELETION_POLICY;
    }
  } catch (error) {
    console.error('Error fetching data deletion policy:', error);
    return 'Could not load the data deletion policy due to an error. Please try again later.';
  }
}

/**
 * Updates the data deletion policy content in Firestore.
 * @param newContent The new data deletion policy content.
 */
export async function updateDataDeletionPolicy(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, DATA_DELETION_POLICY_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating data deletion policy:', error);
    throw new Error('Failed to update data deletion policy.');
  }
}
