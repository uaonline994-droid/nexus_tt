/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, rtdb, ref, rtdbSet, rtdbGet, rtdbOnValue, doc, setDoc, deleteDoc, onSnapshot, collection } from './firebase';
import { DirectMessage } from './types';
import { webNotificationService } from './notificationService';
import { soundService } from './soundService';

/**
 * Generate a deterministic Chat ID between two users
 */
export function getDirectChatId(idA: string, idB: string): string {
  const cleanA = (idA || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanB = (idB || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleanA.localeCompare(cleanB) < 0 ? `dm_${cleanA}_${cleanB}` : `dm_${cleanB}_${cleanA}`;
}

const LOCAL_DM_PREFIX = 'nexus_dm_messages_';

export function getLocalDirectMessages(chatId: string): DirectMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_DM_PREFIX}${chatId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveLocalDirectMessages(chatId: string, messages: DirectMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_DM_PREFIX}${chatId}`, JSON.stringify(messages));
  } catch (e) {}
}

/**
 * Send a Direct Message
 */
export async function sendDirectMessage(msg: DirectMessage): Promise<boolean> {
  const chatId = msg.chatId;

  // 1. Update LocalStorage immediately
  const localList = getLocalDirectMessages(chatId);
  const updatedList = [...localList.filter(m => m.id !== msg.id), msg];
  updatedList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  saveLocalDirectMessages(chatId, updatedList);

  // Play sound
  soundService.playMessageSound();

  // 2. Realtime Database (SDK)
  try {
    const rtdbMsgRef = ref(rtdb, `nexus_direct_chats/${chatId}/messages/${msg.id}`);
    await rtdbSet(rtdbMsgRef, msg);
  } catch (err) {
    console.warn('RTDB send DM notice:', err);
  }

  // 3. Realtime Database (Direct REST fallback)
  try {
    fetch(`https://fir-50300-default-rtdb.firebaseio.com/nexus_direct_chats/${chatId}/messages/${msg.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(() => {});
  } catch (e) {}

  // 4. Firestore
  try {
    const docRef = doc(db, 'nexus_direct_chats', chatId, 'messages', msg.id);
    await setDoc(docRef, msg, { merge: true });
  } catch (e) {}

  // 5. Server REST API
  try {
    fetch(`/api/direct_chat/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(() => {});
  } catch (e) {}

  return true;
}

/**
 * Delete a Direct Message
 */
export async function deleteDirectMessage(chatId: string, messageId: string): Promise<boolean> {
  // 1. LocalStorage
  const localList = getLocalDirectMessages(chatId);
  saveLocalDirectMessages(chatId, localList.filter(m => m.id !== messageId));

  // 2. RTDB
  try {
    const rtdbMsgRef = ref(rtdb, `nexus_direct_chats/${chatId}/messages/${messageId}`);
    await rtdbSet(rtdbMsgRef, null);
  } catch (e) {}

  // 3. Firestore
  try {
    const docRef = doc(db, 'nexus_direct_chats', chatId, 'messages', messageId);
    await deleteDoc(docRef);
  } catch (e) {}

  // 4. Server API
  try {
    fetch(`/api/direct_chat/${chatId}/messages/${messageId}`, {
      method: 'DELETE'
    }).catch(() => {});
  } catch (e) {}

  return true;
}

/**
 * Subscribe to Direct Messages in Real-Time
 */
export function subscribeToDirectChat(
  chatId: string,
  onUpdate: (messages: DirectMessage[]) => void
): () => void {
  let isSubscribed = true;
  let cachedMessages: Map<string, DirectMessage> = new Map();

  // Load initial local
  const initialLocal = getLocalDirectMessages(chatId);
  initialLocal.forEach(m => cachedMessages.set(m.id, m));
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  const emit = () => {
    if (!isSubscribed) return;
    const list = Array.from(cachedMessages.values());
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    saveLocalDirectMessages(chatId, list);
    onUpdate(list);
  };

  // 1. RTDB listener
  let unsubRtdb: (() => void) | null = null;
  try {
    const rtdbRef = ref(rtdb, `nexus_direct_chats/${chatId}/messages`);
    unsubRtdb = rtdbOnValue(rtdbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === 'object') {
          cachedMessages.clear();
          Object.values(val).forEach((item: any) => {
            if (item && item.id) {
              cachedMessages.set(item.id, item);
            }
          });
          emit();
        }
      }
    });
  } catch (e) {}

  // 2. Firestore listener
  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'nexus_direct_chats', chatId, 'messages');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!isSubscribed) return;
      snap.forEach((docSnap) => {
        const data = docSnap.data() as DirectMessage;
        if (data && data.id) {
          cachedMessages.set(data.id, data);
        }
      });
      emit();
    });
  } catch (e) {}

  // 3. Server polling fallback (every 2.5s)
  const pollInterval = setInterval(async () => {
    if (!isSubscribed) return;
    try {
      const res = await fetch(`/api/direct_chat/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          data.messages.forEach((m: DirectMessage) => {
            if (m && m.id) cachedMessages.set(m.id, m);
          });
          emit();
        }
      }
    } catch (e) {}
  }, 2500);

  return () => {
    isSubscribed = false;
    if (unsubRtdb) unsubRtdb();
    if (unsubFirestore) unsubFirestore();
    clearInterval(pollInterval);
  };
}
