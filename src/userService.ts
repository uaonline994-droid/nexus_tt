/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, rtdb, doc, setDoc, getDoc, onSnapshot, collection, ref, rtdbSet, rtdbGet, rtdbOnValue, serverTimestamp } from './firebase';
import { UserProfile, SecurityAuditInfo } from './types';

const USER_PROFILES_COLLECTION = 'nexus_user_profiles';
const RTDB_USER_PROFILES_PATH = 'nexus_user_profiles';
const LOCAL_USER_PROFILE_KEY = 'nexus_current_user_profile_v1';

/**
 * Generate random 6-digit Profile ID (e.g., #849201)
 */
export function generateRandomProfileId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `#${num}`;
}

/**
 * Gather device and security audit data quietly on registration/first sign-in
 */
export async function collectDeviceSecurityAudit(userEmail: string): Promise<SecurityAuditInfo> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser';
  
  // Detect phone/device model from User Agent
  let deviceModel = 'Компʼютер / Ноутбук';
  if (/iphone/i.test(ua)) {
    deviceModel = 'Apple iPhone (iOS)';
  } else if (/ipad/i.test(ua)) {
    deviceModel = 'Apple iPad (iPadOS)';
  } else if (/android/i.test(ua)) {
    const match = ua.match(/Android[^;]+; ([^;)]+)/i);
    deviceModel = match && match[1] ? `Android (${match[1].trim()})` : 'Android смартфон';
  } else if (/macintosh/i.test(ua)) {
    deviceModel = 'Apple Mac (macOS)';
  } else if (/windows/i.test(ua)) {
    deviceModel = 'PC (Windows)';
  } else if (/linux/i.test(ua)) {
    deviceModel = 'PC (Linux)';
  }

  // Location / Geolocation attempt + Timezone
  let location = 'Не визначено (Захищено браузером)';
  let ipAddress = 'Приховано / Cloud Proxy';

  // Get Timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    location = `Часовий пояс: ${tz}`;
  } catch (e) {}

  // Fetch Public IP & Geo coordinates in quiet background
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        ipAddress = data.ip || ipAddress;
        const city = data.city || '';
        const country = data.country_name || '';
        const region = data.region || '';
        if (city || country) {
          location = `${city}${region ? ', ' + region : ''}, ${country} (IP: ${ipAddress})`;
        }
      }
    }
  } catch (e) {
    // Fallback if blocked
  }

  return {
    email: userEmail,
    deviceModel,
    location,
    ipAddress,
    userAgent: ua,
    registeredAt: Date.now()
  };
}

/**
 * Get current user profile from cache
 */
export function getLocalUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

/**
 * Save user profile to Firestore & Realtime Database
 */
export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {}
  }

  // 1. Save to Firestore
  try {
    const docRef = doc(db, USER_PROFILES_COLLECTION, profile.uid);
    await setDoc(docRef, {
      ...profile,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore user profile save notice:', e);
  }

  // 2. Save to RTDB
  try {
    const rtdbProfileRef = ref(rtdb, `${RTDB_USER_PROFILES_PATH}/${profile.uid}`);
    await rtdbSet(rtdbProfileRef, profile);
  } catch (e) {}

  return true;
}

/**
 * Fetch profile from Firestore by UID
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USER_PROFILES_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (e) {}

  try {
    const rtdbProfileRef = ref(rtdb, `${RTDB_USER_PROFILES_PATH}/${uid}`);
    const snap = await rtdbGet(rtdbProfileRef);
    if (snap.exists()) {
      return snap.val() as UserProfile;
    }
  } catch (e) {}

  return null;
}

/**
 * Subscribe to all user profiles in real-time (Firestore + Realtime DB)
 */
export function subscribeToAllUserProfiles(onUpdate: (profiles: UserProfile[]) => void): () => void {
  let isSubscribed = true;
  let cachedProfiles: Map<string, UserProfile> = new Map();

  const emit = () => {
    if (!isSubscribed) return;
    const list = Array.from(cachedProfiles.values());
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onUpdate(list);
  };

  // 1. Firestore listener
  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, USER_PROFILES_COLLECTION);
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!isSubscribed) return;
      snap.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data && data.uid) {
          cachedProfiles.set(data.uid, data);
        }
      });
      emit();
    }, (err) => {
      console.warn('Firestore user profiles listener warning:', err);
    });
  } catch (e) {}

  // 2. Realtime Database listener
  let unsubRtdb: (() => void) | null = null;
  try {
    const rtdbRef = ref(rtdb, RTDB_USER_PROFILES_PATH);
    unsubRtdb = rtdbOnValue(rtdbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === 'object') {
          Object.values(val).forEach((p: any) => {
            if (p && p.uid) {
              cachedProfiles.set(p.uid, p);
            }
          });
          emit();
        }
      }
    });
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubFirestore) unsubFirestore();
    if (unsubRtdb) unsubRtdb();
  };
}
