import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, rtdbSet, rtdbGet, rtdbOnValue } from './firebase';
import { db, rtdb } from './firebase';
import { BioProfile } from './types';
import defaultDatabase from './data/nexus_database.json';

const LOCAL_STORAGE_KEY = 'nexus_profile_database_v2';
const FIRESTORE_COLLECTION = 'nexus_profile';
const FIRESTORE_DOC_ID = 'main';
const RTDB_PATH = 'nexus_profile';

export const DEFAULT_PROFILE: BioProfile = defaultDatabase as unknown as BioProfile;

export interface SaveProfileResult {
  profile: BioProfile;
  firestoreSuccess: boolean;
  firestoreError?: string;
}

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
 * 1. LocalStorage (instant cache on current device)
 * 2. Firebase Realtime Database + Firestore Cloud (syncs worldwide)
 * 3. Server API /api/profile (if backend server is active)
 */
export async function saveProfileToDatabase(data: Partial<BioProfile>): Promise<SaveProfileResult> {
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
      window.dispatchEvent(new CustomEvent('nexus_db_update', { detail: merged }));
    } catch (e) {
      console.warn('LocalStorage write notice:', e);
    }
  }

  let cloudSuccess = false;
  let lastError: string | undefined = undefined;

  // 2a. Save to Firebase Realtime Database (with JSON rules you just published)
  try {
    const dbRef = ref(rtdb, RTDB_PATH);
    await rtdbSet(dbRef, merged);
    cloudSuccess = true;
  } catch (err: any) {
    console.warn('Realtime Database save notice:', err);
    lastError = err?.message || String(err);
  }

  // 2b. Save to Firebase Firestore Cloud
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    await setDoc(docRef, merged, { merge: true });
    cloudSuccess = true;
  } catch (err: any) {
    console.warn('Firestore cloud save notice:', err);
    if (!cloudSuccess) {
      lastError = err?.message || String(err);
    }
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
        return {
          profile: normalizeProfile(json.profile),
          firestoreSuccess: cloudSuccess,
          firestoreError: cloudSuccess ? undefined : lastError
        };
      }
    }
  } catch (serverErr) {
    // Expected on static hosting like Netlify
  }

  return {
    profile: merged,
    firestoreSuccess: cloudSuccess,
    firestoreError: cloudSuccess ? undefined : lastError
  };
}

/**
 * Check if Cloud database (Realtime Database or Firestore) is connected and active
 */
export async function checkFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  // 1. Check Realtime Database first
  try {
    const dbRef = ref(rtdb, RTDB_PATH);
    const snap = await rtdbGet(dbRef);
    if (snap.exists()) {
      return { connected: true, message: '✅ Підключено до Firebase Cloud Database! Дані синхронізовані.' };
    } else {
      // Try writing test probe or confirming connection
      return { connected: true, message: '✅ Підключено до Firebase! База активна і готова до першого збереження.' };
    }
  } catch (rtdbErr: any) {
    console.warn('RTDB check notice:', rtdbErr);
  }

  // 2. Check Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { connected: true, message: '✅ Підключено до Firebase Firestore! Дані синхронізовано для всіх.' };
    } else {
      return { connected: true, message: '✅ Підключено до Firebase Firestore! База активна і готова до першого запису.' };
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
      return { 
        connected: false, 
        message: 'Помилка прав доступу у Cloud Firestore. У Firebase Console перейдіть у Firestore Database -> Rules і вставте: allow read, write: if true;' 
      };
    }
    return { 
      connected: false, 
      message: 'Помилка доступу до бази: ' + msg 
    };
  }
}

/**
 * Subscribe to real-time updates from Realtime Database + Firestore + Local Events
 */
export function subscribeToProfile(onUpdate: (profile: BioProfile) => void): () => void {
  let isSubscribed = true;

  // 1. Initial local load
  const initial = getInitialProfile();
  onUpdate(initial);

  // 2a. Firebase Realtime Database Listener
  let unsubscribeRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, RTDB_PATH);
    unsubscribeRtdb = rtdbOnValue(dbRef, (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val) {
          const normalized = normalizeProfile(val as BioProfile);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
            } catch (e) {}
          }
          onUpdate(normalized);
        }
      }
    }, (err) => {
      console.warn('Realtime Database listener notice:', err);
    });
  } catch (e) {
    console.warn('RTDB listener setup warning:', e);
  }

  // 2b. Firebase Firestore Real-time Listener
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

  return () => {
    isSubscribed = false;
    if (unsubscribeRtdb) unsubscribeRtdb();
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('nexus_db_update', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}
