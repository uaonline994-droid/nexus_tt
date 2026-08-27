/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NEXUS 30-Day Automated Profile Snapshot & Backup Service
 * - Saves complete snapshot of profile (stats, links, news, bio, avatar) with every edit
 * - Retains full historical records for 30 days
 * - Allows 1-click restore of any previous version
 */

import { BioProfile, ProfileSnapshot } from './types';
import { db, rtdb, ref, rtdbSet, rtdbGet, doc, setDoc, getDoc } from './firebase';
import { saveProfileToDatabase, DEFAULT_PROFILE, normalizeProfile } from './databaseService';

const BACKUP_STORAGE_KEY = 'nexus_profile_backups_v2';
const RTDB_BACKUPS_PATH = 'nexus_profile_backups';
const FIRESTORE_BACKUPS_COLLECTION = 'nexus_profile_backups';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Initial pre-seeded historical backups to recover lost data anytime
const INITIAL_BACKUPS: ProfileSnapshot[] = [
  {
    id: 'snap_initial_stable',
    timestamp: Date.now() - 3600000 * 2,
    label: '✨ Еталонна стабільна версія NEXUS (Повні посилання та новини)',
    profile: {
      displayName: "NEXUS",
      handle: "@chak.tt",
      bioText: "🚀 Офіційний акаунт NEXUS | Трендовий контент, стріми та промокод #NEXUS ✨",
      avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
      promoCode: "#NEXUS",
      stats: {
        followers: "125.4K",
        likes: "3.8M",
        views: "18.2M"
      },
      links: [
        {
          id: "nexus_tt_1",
          title: "TikTok @chak.tt (Офіційний)",
          url: "https://tiktok.com/@chak.tt",
          icon: "tiktok",
          highlighted: true,
          clicks: 1420
        },
        {
          id: "nexus_tg_2",
          title: "Telegram Канал NEXUS",
          url: "https://t.me",
          icon: "telegram",
          highlighted: true,
          clicks: 980
        },
        {
          id: "nexus_yt_3",
          title: "YouTube Канал",
          url: "https://youtube.com",
          icon: "youtube",
          highlighted: false,
          clicks: 430
        },
        {
          id: "nexus_inst_4",
          title: "Instagram Профіль",
          url: "https://instagram.com",
          icon: "instagram",
          highlighted: false,
          clicks: 512
        }
      ],
      news: [
        {
          id: "news_init_1",
          title: "🔥 Активуйте офіційний промокод #NEXUS!",
          content: "Отримуйте ексклюзивні бонуси та знижки за нашим фірмовим промокодом #NEXUS. Тисніть на плашку промокоду, щоб скопіювати!",
          tag: "🎁 ПРОМОКОД",
          isPinned: true,
          date: "Сьогодні",
          createdAt: Date.now() - 3600000
        },
        {
          id: "news_init_2",
          title: "🎬 Нове відео вже на TikTok @chak.tt",
          content: "Свіжий ролик уже опубліковано! Залітайте, ставте лайки та залишайте коментарі під відео.",
          tag: "🔥 HOT",
          isPinned: false,
          date: "Вчора",
          createdAt: Date.now() - 86400000
        }
      ],
      updatedAt: Date.now() - 3600000 * 2
    }
  }
];

/**
 * Get all cached snapshots from localStorage
 */
export function getLocalSnapshots(): ProfileSnapshot[] {
  if (typeof window === 'undefined') return INITIAL_BACKUPS;
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (raw) {
      const list: ProfileSnapshot[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        // Filter out entries older than 30 days
        const cutoff = Date.now() - THIRTY_DAYS_MS;
        const valid = list.filter(item => item.timestamp >= cutoff);
        return valid.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch (e) {
    console.warn('Backup read error:', e);
  }
  return INITIAL_BACKUPS;
}

/**
 * Save snapshot list locally
 */
function saveLocalSnapshots(list: ProfileSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const cleanList = list.filter(item => item.timestamp >= cutoff).slice(0, 100);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(cleanList));
  } catch (e) {
    console.warn('Backup write error:', e);
  }
}

/**
 * Automatically create and store a new snapshot on every profile edit
 */
export async function createProfileSnapshot(profile: BioProfile, label: string = 'Автозбереження'): Promise<ProfileSnapshot> {
  const snapshot: ProfileSnapshot = {
    id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    label,
    profile: normalizeProfile(profile)
  };

  // 1. Save in local state
  const currentList = getLocalSnapshots();
  const updatedList = [snapshot, ...currentList.filter(s => s.id !== snapshot.id)];
  saveLocalSnapshots(updatedList);

  // 2. Save in Firebase Realtime Database
  try {
    const rtdbRef = ref(rtdb, `${RTDB_BACKUPS_PATH}/${snapshot.id}`);
    await rtdbSet(rtdbRef, snapshot);
  } catch (e) {}

  // 3. Save in Firestore
  try {
    const docRef = doc(db, FIRESTORE_BACKUPS_COLLECTION, snapshot.id);
    await setDoc(docRef, snapshot, { merge: true });
  } catch (e) {}

  // 4. Save in Server Backend
  try {
    fetch('/api/profile/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    }).catch(() => {});
  } catch (e) {}

  return snapshot;
}

/**
 * Fetch all available snapshots from Cloud & Server
 */
export async function fetchAllBackups(): Promise<ProfileSnapshot[]> {
  const local = getLocalSnapshots();
  const mergedMap = new Map<string, ProfileSnapshot>();
  
  // Add local
  local.forEach(s => mergedMap.set(s.id, s));

  // Try server
  try {
    const res = await fetch('/api/profile/backups');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.backups)) {
        data.backups.forEach((s: ProfileSnapshot) => mergedMap.set(s.id, s));
      }
    }
  } catch (e) {}

  // Try RTDB
  try {
    const rtdbRef = ref(rtdb, RTDB_BACKUPS_PATH);
    const snap = await rtdbGet(rtdbRef);
    if (snap.exists()) {
      const val = snap.val();
      if (val && typeof val === 'object') {
        Object.values(val).forEach((s: any) => {
          if (s && s.id && s.profile) {
            mergedMap.set(s.id, s);
          }
        });
      }
    }
  } catch (e) {}

  const result = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  saveLocalSnapshots(result);
  return result;
}

/**
 * Restore profile from a specific snapshot with 1-click
 */
export async function restoreProfileFromSnapshot(snapshot: ProfileSnapshot): Promise<BioProfile> {
  const restoredProfile = normalizeProfile({
    ...snapshot.profile,
    updatedAt: Date.now()
  });

  // Save to database
  await saveProfileToDatabase(restoredProfile);

  // Create a backup recording this restore action
  await createProfileSnapshot(restoredProfile, `🔄 Відновлено з копії: ${snapshot.label}`);

  return restoredProfile;
}
