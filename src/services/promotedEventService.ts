import { db, storage } from '@/lib/firebase/config';
import type { PromotedEvent } from '@/types';
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
  where,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

export async function createPromotedEvent(
  uploaderUid: string,
  title: string,
  description: string,
  location: string,
  eventDate: Date,
  eventTime: string | null,
  linkUrl: string | null,
  imageData: ArrayBuffer | Uint8Array | null,
  imageFileType: string | null,
  imageFileName: string | null,
  isActive: boolean,
  scheduledStart?: Date | null,
  scheduledEnd?: Date | null
): Promise<string> {
  if (!uploaderUid || !title || !description || !location || !eventDate) {
    throw new Error('Missing required fields for creating promoted event.');
  }

  let imageUrl: string | null = null;

  if (imageData && imageFileType && imageFileName) {
    const bytes = new Uint8Array(imageData);
    const eventImageRef = storageRef(storage, `promoted-events/${Date.now()}_${imageFileName}`);
    await uploadBytes(eventImageRef, bytes, { contentType: imageFileType });
    imageUrl = await getDownloadURL(eventImageRef);
  }

  try {
    const docRef = await addDoc(collection(db, 'promotedEvents'), {
      title,
      description,
      location,
      eventDate,
      eventTime: eventTime || null,
      linkUrl: linkUrl || null,
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
    console.error('Error creating promoted event:', error);
    throw new Error('Failed to create promoted event.');
  }
}

export async function getAllPromotedEvents(): Promise<PromotedEvent[]> {
  try {
    const eventsCollection = collection(db, 'promotedEvents');
    const q = query(eventsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => processDoc(docSnap) as PromotedEvent).filter(e => e !== null);
  } catch (error) {
    console.error('Error fetching promoted events:', error);
    throw new Error('Failed to fetch promoted events.');
  }
}

export async function updatePromotedEvent(
  eventId: string,
  data: Partial<Pick<PromotedEvent, 'title' | 'description' | 'location' | 'linkUrl' | 'isActive' | 'scheduledStart' | 'scheduledEnd'>>
): Promise<void> {
  try {
    const eventDocRef = doc(db, 'promotedEvents', eventId);
    await updateDoc(eventDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating promoted event:', error);
    throw new Error('Failed to update promoted event.');
  }
}

export async function trackEventClick(eventId: string): Promise<void> {
  try {
    const eventDocRef = doc(db, 'promotedEvents', eventId);
    const { increment } = await import('firebase/firestore');
    await updateDoc(eventDocRef, { clicks: increment(1) });
  } catch (error) {
    console.error('Error tracking event click:', error);
  }
}

export async function trackEventImpression(eventId: string): Promise<void> {
  try {
    const eventDocRef = doc(db, 'promotedEvents', eventId);
    const { increment } = await import('firebase/firestore');
    await updateDoc(eventDocRef, { impressions: increment(1) });
  } catch (error) {
    console.error('Error tracking event impression:', error);
  }
}

export async function deletePromotedEvent(eventId: string, imageUrl?: string | null): Promise<void> {
  try {
    const eventDocRef = doc(db, 'promotedEvents', eventId);
    await deleteDoc(eventDocRef);

    if (imageUrl) {
      const imageHttpUrl = new URL(imageUrl);
      const imagePath = decodeURIComponent(imageHttpUrl.pathname.split('/o/')[1].split('?')[0]);
      const imageFileRef = storageRef(storage, imagePath);
      try {
        await deleteObject(imageFileRef);
      } catch (storageError: any) {
        if (storageError.code !== 'storage/object-not-found') {
          console.error('Error deleting event image:', storageError);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting promoted event:', error);
    throw new Error('Failed to delete promoted event.');
  }
}

export async function getActivePromotedEvents(count: number = 3): Promise<PromotedEvent[]> {
  try {
    const eventsCollection = collection(db, 'promotedEvents');
    const q = query(
      eventsCollection,
      where('isActive', '==', true),
      orderBy('eventDate', 'asc'),
    );
    const querySnapshot = await getDocs(q);
    const allActiveEvents = querySnapshot.docs.map(docSnap => processDoc(docSnap) as PromotedEvent).filter(e => e !== null);

    const now = new Date();

    const validEvents = allActiveEvents.filter(event => {
      // Only show events whose date hasn't passed
      const eventDate = event.eventDate instanceof Date
        ? event.eventDate
        : (event.eventDate as any).toDate?.() || new Date(0);
      if (eventDate < now) return false;

      // Check promotion schedule
      if (event.scheduledStart) {
        const startDate = event.scheduledStart instanceof Date
          ? event.scheduledStart
          : (event.scheduledStart as any).toDate?.() || new Date(0);
        if (now < startDate) return false;
      }
      if (event.scheduledEnd) {
        const endDate = event.scheduledEnd instanceof Date
          ? event.scheduledEnd
          : (event.scheduledEnd as any).toDate?.() || new Date(0);
        if (now > endDate) return false;
      }
      return true;
    });

    return validEvents.slice(0, count);
  } catch (error) {
    console.error('Error fetching active promoted events:', error);
    return [];
  }
}
