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

export async function createAdvertisement(
  uploaderUid: string,
  title: string,
  linkUrl: string,
  imageData: ArrayBuffer | Uint8Array,
  imageFileType: string,
  imageFileName: string,
  isActive: boolean,
  scheduledStart?: Date | null,
  scheduledEnd?: Date | null
): Promise<string> {
  if (!uploaderUid || !title || !linkUrl || !imageData || !imageFileType || !imageFileName) {
    throw new Error('Missing required fields for creating advertisement.');
  }

  const bytes = new Uint8Array(imageData);

  const adImageRef = storageRef(storage, `advertisements/${Date.now()}_${imageFileName}`);
  await uploadBytes(adImageRef, bytes, { contentType: imageFileType });
  const imageUrl = await getDownloadURL(adImageRef);

  try {
    const docRef = await addDoc(collection(db, 'advertisements'), {
      title,
      linkUrl,
      imageUrl,
      isActive,
      uploaderUid,
      scheduledStart: scheduledStart || null,
      scheduledEnd: scheduledEnd || null,
      clicks: 0,
      impressions: 0,
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

export async function updateAdvertisement(
  adId: string,
  data: Partial<Pick<Advertisement, 'title' | 'linkUrl' | 'isActive' | 'scheduledStart' | 'scheduledEnd'>>
): Promise<void> {
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

/**
 * Track ad click
 */
export async function trackAdClick(adId: string): Promise<void> {
  try {
    const adDocRef = doc(db, 'advertisements', adId);
    const { increment } = await import('firebase/firestore');
    await updateDoc(adDocRef, {
      clicks: increment(1),
    });
  } catch (error) {
    console.error('Error tracking ad click:', error);
    // Don't throw - tracking should not break user experience
  }
}

/**
 * Track ad impression
 */
export async function trackAdImpression(adId: string): Promise<void> {
  try {
    const adDocRef = doc(db, 'advertisements', adId);
    const { increment } = await import('firebase/firestore');
    await updateDoc(adDocRef, {
      impressions: increment(1),
    });
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    // Don't throw - tracking should not break user experience
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
      orderBy('createdAt', 'desc'),
    );
    const querySnapshot = await getDocs(q);
    const allActiveAds = querySnapshot.docs.map(docSnap => processDoc(docSnap) as Advertisement).filter(ad => ad !== null);

    // Filter by schedule
    const now = new Date();
    const scheduledAds = allActiveAds.filter(ad => {
      // Check start date
      if (ad.scheduledStart) {
        const startDate = ad.scheduledStart instanceof Date
          ? ad.scheduledStart
          : (ad.scheduledStart as any).toDate?.() || new Date(0);
        if (now < startDate) return false;
      }
      // Check end date
      if (ad.scheduledEnd) {
        const endDate = ad.scheduledEnd instanceof Date
          ? ad.scheduledEnd
          : (ad.scheduledEnd as any).toDate?.() || new Date(0);
        if (now > endDate) return false;
      }
      return true;
    });

    // Simple random selection if more ads than count are fetched
    if (scheduledAds.length > count) {
      const shuffled = scheduledAds.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
    return scheduledAds;

  } catch (error) {
    console.error('Error fetching active advertisements:', error);
    return [];
  }
}
