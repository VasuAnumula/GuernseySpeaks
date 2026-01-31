
import { db } from '@/lib/firebase/config';
import type { PlatformSettings } from '@/types';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const SETTINGS_DOC_PATH = 'settings/platform';

// Default settings
const DEFAULT_SETTINGS: PlatformSettings = {
  announcementBanner: {
    enabled: false,
    text: '',
    type: 'info',
    link: undefined,
  },
  contentModeration: {
    autoHideReportedPosts: false,
    autoHideThreshold: 3,
  },
  features: {
    commentsEnabled: true,
    postsEnabled: true,
  },
};

/**
 * Get platform settings
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const settingsDocRef = doc(db, SETTINGS_DOC_PATH);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        announcementBanner: {
          ...DEFAULT_SETTINGS.announcementBanner,
          ...(data.announcementBanner || {}),
        },
        contentModeration: {
          ...DEFAULT_SETTINGS.contentModeration,
          ...(data.contentModeration || {}),
        },
        features: {
          ...DEFAULT_SETTINGS.features,
          ...(data.features || {}),
        },
      } as PlatformSettings;
    }

    // Return defaults if no settings document exists
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update platform settings (admin only)
 */
export async function updatePlatformSettings(
  updates: Partial<PlatformSettings>,
  adminUid: string
): Promise<void> {
  try {
    const settingsDocRef = doc(db, SETTINGS_DOC_PATH);

    // Get current settings
    const currentSettings = await getPlatformSettings();

    // Merge updates with current settings
    const newSettings: PlatformSettings = {
      ...currentSettings,
      ...updates,
      announcementBanner: {
        ...currentSettings.announcementBanner,
        ...(updates.announcementBanner || {}),
      },
      contentModeration: {
        ...currentSettings.contentModeration,
        ...(updates.contentModeration || {}),
      },
      features: {
        ...currentSettings.features,
        ...(updates.features || {}),
      },
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: adminUid,
    };

    await setDoc(settingsDocRef, newSettings);
  } catch (error) {
    console.error('Error updating platform settings:', error);
    throw new Error('Failed to update platform settings.');
  }
}

/**
 * Update just the announcement banner
 */
export async function updateAnnouncementBanner(
  banner: PlatformSettings['announcementBanner'],
  adminUid: string
): Promise<void> {
  try {
    await updatePlatformSettings({ announcementBanner: banner }, adminUid);
  } catch (error) {
    console.error('Error updating announcement banner:', error);
    throw new Error('Failed to update announcement banner.');
  }
}
