
'use server';

import { db, storage } from '@/lib/firebase/config';
import type { Advertisement } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {ניווט מהיר למאמרים על ידי לחיצה על שם של הכותרת שלהם}
interface CreateAdvertisementInput {
  title: string;
  linkUrl: string;
  imageFile: File; // This will be handled by converting to a buffer or similar for server action
  isActive: boolean;
  uploaderUid: string;
}

// This function is designed to be called from a server environment (e.g. Next.js Server Action)
// The File object needs to be processed (e.g. to ArrayBuffer) before being passed to this server-side function.
// For simplicity in the admin UI, we might handle the file upload directly there and pass data URLs or use a client-side upload to storage.
// However, for a pure server action approach, the file bytes would be passed.
// Let's assume the image is uploaded client-side for now, and imageURL is passed, or handle image upload here.

export async function createAdvertisement(
  uploaderUid: string,
  title: string,
  linkUrl: string,
  imageFileBuffer: ArrayBuffer, // Expecting ArrayBuffer from the client
  imageFileType: string, // e.g., 'image/png'
  imageFileName: string,
  isActive: boolean
): Promise<string> {
  if (!uploaderUid || !title || !linkUrl || !imageFileBuffer || !imageFileType || !imageFileName) {
    throw new Error('Missing required fields for creating advertisement.');
  }

  const adImageRef = storageRef(storage, `advertisements/${Date.now()}_${imageFileName}`);
  await uploadBytes(adImageRef, imageFileBuffer, { contentType: imageFileType });
  const imageUrl = await getDownloadURL(adImageRef);

  try {
    const docRef = await addDoc(collection(db, 'advertisements'), {
      title,
      linkUrl,
      imageUrl,
      isActive,
      uploaderUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating advertisement:', error);
    // If Firestore fails, attempt to delete the uploaded image to prevent orphans
    try {
      await deleteObject(adImageRef);
      console.log("Cleaned up orphaned ad image from storage after Firestore failure.");
    } catch (storageError) {
      console.error("Error cleaning up orphaned ad image:", storageError);
    }
    throw new Error('Failed to create advertisement in Firestore.');
  }
}

export async function getAllAdvertisements(): Promise<Advertisement[]> {
  try {
    const adsCollection = collection(db, 'advertisements');
    const q = query(adsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processDoc(docSnap) as Advertisement).filter(ad => ad !== null);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    throw new Error('Failed to fetch advertisements.');
  }
}

export async function updateAdvertisement(adId: string, data: Partial<Pick<Advertisement, 'title' | 'linkUrl' | 'isActive'>>): Promise<void> {
  try {
    const adDocRef = doc(db, 'advertisements', adId);
    await updateDoc(adDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating advertisement:', error);
    throw new Error('Failed to update advertisement.');
  }
}

export async function deleteAdvertisement(adId: string, imageUrl: string): Promise<void> {
  try {
    const adDocRef = doc(db, 'advertisements', adId);
    await deleteDoc(adDocRef);

    // Delete the image from Firebase Storage
    if (imageUrl) {
      const imageHttpUrl = new URL(imageUrl);
      const imagePath = decodeURIComponent(imageHttpUrl.pathname.split('/o/')[1].split('?')[0]);
      const imageFileRef = storageRef(storage, imagePath);
      try {
        await deleteObject(imageFileRef);
      } catch (storageError: any) {
        // If the image is already deleted or doesn't exist, don't throw an error
        if (storageError.code === 'storage/object-not-found') {
          console.warn(`Image not found in storage during ad deletion (may have been already deleted): ${imagePath}`);
        } else {
          console.error('Error deleting advertisement image from Firebase Storage:', storageError);
          // Decide if you want to re-throw or just log. For now, log and continue.
        }
      }
    }
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    throw new Error('Failed to delete advertisement.');
  }
}

export async function getActiveAdvertisements(count: number = 2): Promise<Advertisement[]> {
  try {
    const adsCollection = collection(db, 'advertisements');
    const q = query(
      adsCollection,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'), // Or random, or based on priority if added
      // limit(count) // Firestore does not support random selection easily along with limit.
                      // Fetch more and pick randomly on client/server or implement more complex random logic.
                      // For now, fetch all active and let client decide, or fetch latest.
    );
    const querySnapshot = await getDocs(q);
    const activeAds = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Advertisement).filter(ad => ad !== null);
    
    // Simple random selection if more ads than count are fetched
    if (activeAds.length > count) {
      const shuffled = activeAds.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
    return activeAds;

  } catch (error) {
    console.error('Error fetching active advertisements:', error);
    // Return empty array or rethrow, depending on how AdPlaceholder should behave
    return [];
    // throw new Error('Failed to fetch active advertisements.');
  }
}
