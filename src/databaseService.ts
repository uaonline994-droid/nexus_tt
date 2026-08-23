import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BioProfile } from './types';
import defaultDatabase from './data/nexus_database.json';

const LOCAL_STORAGE_KEY = 'nexus_profile_database_v2';
const FIRESTORE_COLLECTION = 'nexus_profile';
const FIRESTORE_DOC_ID = 'main';

export const DEFAULT_PROFILE: BioProfile = defaultDatabase as unknown as BioProfile;

/**
 * Loads profile from best available source synchronously (LocalStorage or default JSON file)
 */
export function getInitialProfile(): BioProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return normalizeProfile(parsed);
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return DEFAULT_PROFILE;
}

/**
 * Normalize profile object to ensure all required fields are present
 */
export function normalizeProfile(raw: Partial<BioProfile>): BioProfile {
  return {
    displayName: raw.displayName || DEFAULT_PROFILE.displayName,
    handle: raw.handle || DEFAULT_PROFILE.handle,
    bioText: raw.bioText !== undefined ? raw.bioText : DEFAULT_PROFILE.bioText,
    avatarUrl: raw.avatarUrl !== undefined ? raw.avatarUrl : DEFAULT_PROFILE.avatarUrl,
    promoCode: raw.promoCode || DEFAULT_PROFILE.promoCode,
    stats: {
      followers: raw.stats?.followers ?? DEFAULT_PROFILE.stats.followers,
      likes: raw.stats?.likes ?? DEFAULT_PROFILE.stats.likes,
      views: raw.stats?.views ?? DEFAULT_PROFILE.stats.views,
    },
    links: Array.isArray(raw.links) ? raw.links : DEFAULT_PROFILE.links,
    news: Array.isArray(raw.news) ? raw.news : DEFAULT_PROFILE.news,
    updatedAt: raw.updatedAt || Date.now(),
  };
}

/**
 * Save profile to ALL storage tiers:
 * 1. LocalStorage (instant, works on Netlify/static hosting)
 * 2. Firestore Cloud Database (syncs to cloud for all visitors)
 * 3. Server API /api/profile (if backend server is active)
 */
export async function saveProfileToDatabase(data: Partial<BioProfile>): Promise<BioProfile> {
  const current = getInitialProfile();
  const merged: BioProfile = normalizeProfile({
    ...current,
    ...data,
    updatedAt: Date.now()
  });

  // 1. Save to LocalStorage immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      // Notify other tabs in same browser
      window.dispatchEvent(new CustomEvent('nexus_db_update', { detail: merged }));
    } catch (e) {
      console.warn('LocalStorage write notice:', e);
    }
  }

  // 2. Save to Firebase Firestore Cloud
  let firestoreSaved = false;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    await setDoc(docRef, merged, { merge: true });
    firestoreSaved = true;
  } catch (firestoreErr) {
    console.warn('Firestore cloud save notice (fallback active):', firestoreErr);
  }

  // 3. Save to Server Node Backend if available (gracefully ignore 404 on static hosts like Netlify)
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.profile) {
        return normalizeProfile(json.profile);
      }
    }
  } catch (serverErr) {
    // Expected on static hosting like Netlify
  }

  return merged;
}

/**
 * Subscribe to real-time updates from Firestore + Local Events
 */
export function subscribeToProfile(onUpdate: (profile: BioProfile) => void): () => void {
  let isSubscribed = true;

  // 1. Initial local load
  const initial = getInitialProfile();
  onUpdate(initial);

  // 2. Firebase Firestore Real-time Listener
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    unsubscribeFirestore = onSnapshot(docRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const cloudData = snap.data();
        if (cloudData) {
          const normalized = normalizeProfile(cloudData as BioProfile);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
            } catch (e) {}
          }
          onUpdate(normalized);
        }
      }
    }, (err) => {
      console.warn('Firestore live listener notice (using local db):', err);
    });
  } catch (e) {
    console.warn('Firestore init warning:', e);
  }

  // 3. Local Tab Event Listener
  const handleLocalEvent = (e: Event) => {
    if (!isSubscribed) return;
    const customEvent = e as CustomEvent<BioProfile>;
    if (customEvent.detail) {
      onUpdate(customEvent.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (!isSubscribed) return;
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed) onUpdate(normalizeProfile(parsed));
      } catch (err) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('nexus_db_update', handleLocalEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  // 4. Server API Polling / SSE fallback if available
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/profile/events');
    eventSource.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const data = JSON.parse(event.data);
        if (data) {
          const normalized = normalizeProfile(data);
          onUpdate(normalized);
        }
      } catch (e) {}
    };
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (eventSource) eventSource.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('nexus_db_update', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}
