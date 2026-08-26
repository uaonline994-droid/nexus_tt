import { ref, rtdbSet, rtdbGet, rtdbOnValue, doc, setDoc, onSnapshot, getDoc } from './firebase';
import { db, rtdb, ADMIN_EMAIL } from './firebase';
import { ChatMessage, ChatModerationState, ChatSettings, WebRoomSettings } from './types';

const CHAT_MESSAGES_RTDB_PATH = 'nexus_chat/messages';
const CHAT_SETTINGS_RTDB_PATH = 'nexus_chat/settings';
const CHAT_MODERATION_RTDB_PATH = 'nexus_chat/moderation';
const WEB_ROOM_SETTINGS_RTDB_PATH = 'nexus_chat/web_room_settings';

const LOCAL_CHAT_KEY = 'nexus_chat_cached_messages_v1';
const LOCAL_COOLDOWN_KEY = 'nexus_chat_last_message_time';

export const CHAT_COOLDOWN_SECONDS = 300;

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  isChatOpenForAll: true,
  isReadOnly: false,
  whitelistOnly: false,
  allowedChatEmails: [ADMIN_EMAIL.toLowerCase()],
  slowmodeSeconds: 300
};

export const DEFAULT_WEB_ROOM_SETTINGS: WebRoomSettings = {
  betaTestForAll: false,
  allowedEmails: [ADMIN_EMAIL.toLowerCase()]
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_welcome_1',
    senderId: 'admin_nexus',
    senderName: 'NEXUS',
    senderEmail: ADMIN_EMAIL,
    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    isAdmin: true,
    text: 'Привіт усім! 👋 Ласкаво просимо до офіційного Загального Чату NEXUS! Тут ви можете спілкуватися, обговорювати відео та тегати мене через кнопку "Написати Nexus tt".',
    timestamp: Date.now() - 3600000,
    mentionsAdmin: false
  },
  {
    id: 'msg_welcome_2',
    senderId: 'system',
    senderName: 'NEXUS Bot',
    senderEmail: 'bot@nexus.tt',
    senderAvatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=400&auto=format&fit=crop&q=80',
    isAdmin: false,
    text: '🛡️ Правила чату: повага один до одного, заборонено спам. Звичайні користувачі можуть надсилати повідомлення згідно з налаштуваннями адміністратора. Для тегу адміна пишіть @nexus.',
    timestamp: Date.now() - 1800000,
    mentionsAdmin: false
  }
];

let cachedChatSettings: ChatSettings = DEFAULT_CHAT_SETTINGS;
let cachedModerationState: ChatModerationState = { mutedUsers: {}, bannedUsers: {} };

/**
 * Get cached chat messages from LocalStorage or default
 */
export function getLocalChatMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return INITIAL_MESSAGES;
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return INITIAL_MESSAGES;
}

/**
 * Check if user is currently under cooldown
 */
export function getUserCooldownRemaining(userEmail: string, slowmodeSeconds: number = 300): number {
  if (!userEmail) return 0;
  if (userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 0; // Admin has no cooldown
  if (slowmodeSeconds <= 0) return 0;

  try {
    const raw = localStorage.getItem(`${LOCAL_COOLDOWN_KEY}_${userEmail.toLowerCase()}`);
    if (raw) {
      const lastTime = parseInt(raw, 10);
      if (!isNaN(lastTime)) {
        const elapsed = Math.floor((Date.now() - lastTime) / 1000);
        const remaining = slowmodeSeconds - elapsed;
        return remaining > 0 ? remaining : 0;
      }
    }
  } catch (e) {}
  return 0;
}

/**
 * Set user message time for cooldown
 */
export function recordUserMessageSent(userEmail: string) {
  if (!userEmail) return;
  try {
    localStorage.setItem(`${LOCAL_COOLDOWN_KEY}_${userEmail.toLowerCase()}`, Date.now().toString());
  } catch (e) {}
}

/**
 * Check if a user is allowed to send messages in chat
 */
export function checkUserChatAccess(
  userEmail: string | undefined,
  isAdmin: boolean = false,
  chatSettings: ChatSettings = cachedChatSettings,
  moderation: ChatModerationState = cachedModerationState
): { allowed: boolean; error?: string; reason?: string } {
  if (!userEmail) {
    const msg = 'Потрібно увійти через Google, щоб писати в чат.';
    return { allowed: false, error: msg, reason: msg };
  }

  const email = userEmail.toLowerCase().trim();
  if (isAdmin || email === ADMIN_EMAIL.toLowerCase().trim()) {
    return { allowed: true };
  }

  // 1. Check Banned
  const emailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
  if (moderation.bannedUsers && moderation.bannedUsers[emailKey]) {
    const msg = `⛔ Ваш доступ до чату заблоковано адміністратором (${moderation.bannedUsers[emailKey].reason || 'Порушення правил'}).`;
    return { 
      allowed: false, 
      error: msg,
      reason: msg
    };
  }

  // 2. Check Muted
  if (moderation.mutedUsers && moderation.mutedUsers[emailKey]) {
    const muteInfo = moderation.mutedUsers[emailKey];
    if (muteInfo.mutedUntil > Date.now()) {
      const remainingMin = Math.ceil((muteInfo.mutedUntil - Date.now()) / 60000);
      const msg = `🔇 Ви перебуваєте у муті ще ${remainingMin} хв (${muteInfo.reason || 'Тимчасове обмеження'}).`;
      return { 
        allowed: false, 
        error: msg,
        reason: msg
      };
    }
  }

  // 3. Check Read-Only Mode
  if (chatSettings.isReadOnly) {
    const msg = '🛑 Чат закрито адміністратором (Режим "Тільки читання").';
    return { allowed: false, error: msg, reason: msg };
  }

  // 4. Check Whitelist Mode
  if (chatSettings.whitelistOnly) {
    const isWhitelisted = (chatSettings.allowedChatEmails || []).some(e => e.toLowerCase().trim() === email);
    if (!isWhitelisted) {
      const msg = '🔒 Чат доступний лише для користувачів із білого списку.';
      return { allowed: false, error: msg, reason: msg };
    }
  }

  return { allowed: true };
}

/**
 * Subscribe to Chat Settings
 */
export function subscribeToChatSettings(onUpdate: (settings: ChatSettings) => void): () => void {
  let isSubscribed = true;

  try {
    const raw = localStorage.getItem('nexus_chat_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...parsed };
      onUpdate(cachedChatSettings);
    } else {
      onUpdate(DEFAULT_CHAT_SETTINGS);
    }
  } catch (e) {
    onUpdate(DEFAULT_CHAT_SETTINGS);
  }

  // Fetch from server API
  fetch('/api/chat/settings')
    .then(r => r.json())
    .then(data => {
      if (isSubscribed && data.success && data.settings) {
        cachedChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...data.settings };
        try {
          localStorage.setItem('nexus_chat_settings_v1', JSON.stringify(cachedChatSettings));
        } catch (e) {}
        onUpdate(cachedChatSettings);
      }
    })
    .catch(() => {});

  let unsubscribeRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, CHAT_SETTINGS_RTDB_PATH);
    unsubscribeRtdb = rtdbOnValue(dbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val();
        if (val) {
          const settings: ChatSettings = {
            isChatOpenForAll: val.isChatOpenForAll !== undefined ? Boolean(val.isChatOpenForAll) : true,
            isReadOnly: Boolean(val.isReadOnly),
            whitelistOnly: Boolean(val.whitelistOnly),
            allowedChatEmails: Array.isArray(val.allowedChatEmails) ? val.allowedChatEmails : [ADMIN_EMAIL.toLowerCase()],
            slowmodeSeconds: typeof val.slowmodeSeconds === 'number' ? val.slowmodeSeconds : 300
          };
          cachedChatSettings = settings;
          try {
            localStorage.setItem('nexus_chat_settings_v1', JSON.stringify(settings));
          } catch (e) {}
          onUpdate(settings);
        }
      }
    });
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubscribeRtdb) unsubscribeRtdb();
  };
}

/**
 * Save Chat Settings (Admin Only)
 */
export async function saveChatSettings(settings: ChatSettings): Promise<boolean> {
  cachedChatSettings = settings;
  try {
    localStorage.setItem('nexus_chat_settings_v1', JSON.stringify(settings));
  } catch (e) {}

  // Server API save
  try {
    await fetch('/api/chat/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  } catch (e) {}

  try {
    const dbRef = ref(rtdb, CHAT_SETTINGS_RTDB_PATH);
    await rtdbSet(dbRef, settings);
  } catch (e) {}

  try {
    const docRef = doc(db, 'nexus_chat_settings', 'general_chat');
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {}

  return true;
}

/**
 * Subscribe to Moderation State (Muted / Banned users)
 */
export function subscribeToModerationState(onUpdate: (state: ChatModerationState) => void): () => void {
  let isSubscribed = true;

  try {
    const raw = localStorage.getItem('nexus_chat_moderation_v1');
    if (raw) {
      cachedModerationState = JSON.parse(raw);
      onUpdate(cachedModerationState);
    } else {
      onUpdate({ mutedUsers: {}, bannedUsers: {} });
    }
  } catch (e) {
    onUpdate({ mutedUsers: {}, bannedUsers: {} });
  }

  // Server API fetch
  fetch('/api/chat/moderation')
    .then(r => r.json())
    .then(data => {
      if (isSubscribed && data.success && data.moderation) {
        cachedModerationState = data.moderation;
        try {
          localStorage.setItem('nexus_chat_moderation_v1', JSON.stringify(data.moderation));
        } catch (e) {}
        onUpdate(data.moderation);
      }
    })
    .catch(() => {});

  let unsubscribeRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, CHAT_MODERATION_RTDB_PATH);
    unsubscribeRtdb = rtdbOnValue(dbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val() || {};
        const state: ChatModerationState = {
          mutedUsers: val.muted || {},
          bannedUsers: val.banned || {}
        };
        cachedModerationState = state;
        try {
          localStorage.setItem('nexus_chat_moderation_v1', JSON.stringify(state));
        } catch (e) {}
        onUpdate(state);
      } else {
        const emptyState: ChatModerationState = { mutedUsers: {}, bannedUsers: {} };
        cachedModerationState = emptyState;
        onUpdate(emptyState);
      }
    });
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubscribeRtdb) unsubscribeRtdb();
  };
}

/**
 * Subscribe to live chat messages (Server SSE + Firestore + RTDB)
 */
export function subscribeToChatMessages(onUpdate: (messages: ChatMessage[]) => void): () => void {
  let isSubscribed = true;
  let currentList: ChatMessage[] = getLocalChatMessages();

  const updateStateAndCache = (newMessages: ChatMessage[]) => {
    currentList = newMessages;
    try {
      localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(newMessages));
    } catch (e) {}
    onUpdate(newMessages);
  };

  // Local load first
  onUpdate(currentList);

  // 1. Fetch current full chat history from server
  fetch('/api/chat/messages')
    .then(res => res.json())
    .then(data => {
      if (isSubscribed && data.success && Array.isArray(data.messages)) {
        updateStateAndCache(data.messages);
      }
    })
    .catch(() => {});

  // 2. Server-Sent Events (SSE) for instant cross-device live sync
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/chat/events');
    eventSource.onmessage = (e) => {
      if (!isSubscribed) return;
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'init' && Array.isArray(event.data)) {
          updateStateAndCache(event.data);
        } else if (event.type === 'message' && event.data) {
          // Avoid duplicates
          const msg = event.data as ChatMessage;
          const exists = currentList.some(m => m.id === msg.id);
          if (!exists) {
            const updated = [...currentList, msg];
            updateStateAndCache(updated);
          }
        } else if (event.type === 'delete' && event.id) {
          const updated = currentList.filter(m => m.id !== event.id);
          updateStateAndCache(updated);
        } else if (event.type === 'clear' && Array.isArray(event.data)) {
          updateStateAndCache(event.data);
        }
      } catch (err) {
        console.warn('Error parsing chat SSE:', err);
      }
    };
  } catch (e) {
    console.warn('Chat SSE init warning:', e);
  }

  // 3. RTDB listener fallback
  let unsubscribeRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, CHAT_MESSAGES_RTDB_PATH);
    unsubscribeRtdb = rtdbOnValue(dbRef, (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val) {
          let list: ChatMessage[] = [];
          if (Array.isArray(val)) {
            list = val.filter(Boolean);
          } else if (typeof val === 'object') {
            list = Object.values(val) as ChatMessage[];
          }
          list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          if (list.length > 0) {
            updateStateAndCache(list);
          }
        }
      }
    });
  } catch (e) {}

  // 4. Cross-tab local events
  const handleLocalEvent = (e: Event) => {
    if (!isSubscribed) return;
    const customEvent = e as CustomEvent<ChatMessage[]>;
    if (customEvent.detail) {
      updateStateAndCache(customEvent.detail);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('nexus_chat_local_update', handleLocalEvent);
  }

  return () => {
    isSubscribed = false;
    if (eventSource) {
      eventSource.close();
    }
    if (unsubscribeRtdb) unsubscribeRtdb();
    if (typeof window !== 'undefined') {
      window.removeEventListener('nexus_chat_local_update', handleLocalEvent);
    }
  };
}

/**
 * Send a new chat message
 */
export async function sendChatMessage(
  sender: { id: string; name: string; email: string; avatar: string },
  text: string,
  replyTo?: { id: string; senderName: string; text: string } | null,
  type: 'text' | 'web_room_invite' = 'text',
  roomData?: ChatMessage['roomData']
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = sender.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  // Access validation (Check Ban, Mute, ReadOnly, Whitelist)
  if (!isAdmin) {
    const accessCheck = checkUserChatAccess(sender.email);
    if (!accessCheck.allowed) {
      return { success: false, error: accessCheck.reason };
    }

    // Cooldown check
    if (type === 'text') {
      const cooldown = getUserCooldownRemaining(sender.email, cachedChatSettings.slowmodeSeconds);
      if (cooldown > 0) {
        const minutes = Math.ceil(cooldown / 60);
        return { 
          success: false, 
          error: `Анти-спам обмеження: ви зможете надіслати наступне повідомлення через ${cooldown} сек (приблизно ${minutes} хв).` 
        };
      }
    }
  }

  const cleanText = text.trim();
  if (!cleanText && type === 'text') {
    return { success: false, error: 'Повідомлення не може бути порожнім.' };
  }

  const mentionsAdmin = cleanText.toLowerCase().includes('@nexus') || cleanText.toLowerCase().includes('@chak.tt');

  const newMsg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    senderId: sender.id || 'user_' + Date.now(),
    senderName: sender.name || 'Гість',
    senderEmail: sender.email,
    senderAvatar: sender.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    isAdmin,
    text: cleanText,
    timestamp: Date.now(),
    mentionsAdmin,
    replyTo: replyTo || null,
    type,
    roomData
  };

  // 1. Optimistic Local Update
  const currentMessages = getLocalChatMessages();
  const updatedMessages = [...currentMessages, newMsg];
  try {
    localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(updatedMessages));
    window.dispatchEvent(new CustomEvent('nexus_chat_local_update', { detail: updatedMessages }));
  } catch (e) {}

  if (!isAdmin && type === 'text') {
    recordUserMessageSent(sender.email);
  }

  // 2. Send via Server REST API (Instant broadcast to all users via SSE)
  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    });
    const result = await res.json();
    if (!result.success && result.error) {
      return { success: false, error: result.error };
    }
  } catch (err: any) {
    console.warn('Server chat post error, relying on RTDB fallback:', err);
  }

  // 3. Save to Firebase Realtime Database
  try {
    const messageRef = ref(rtdb, `${CHAT_MESSAGES_RTDB_PATH}/${newMsg.id}`);
    await rtdbSet(messageRef, newMsg);
  } catch (err: any) {
    console.warn('Realtime database chat send notice:', err);
  }

  // 4. Save to Firestore
  try {
    const docRef = doc(db, 'nexus_chat_messages', newMsg.id);
    await setDoc(docRef, newMsg);
  } catch (err: any) {
    console.warn('Firestore chat send notice:', err);
  }

  return { success: true };
}

/**
 * Delete message (Admin Only)
 */
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  const current = getLocalChatMessages();
  const filtered = current.filter(m => m.id !== messageId);
  try {
    localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('nexus_chat_local_update', { detail: filtered }));
  } catch (e) {}

  // Server API delete
  try {
    await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' });
  } catch (e) {}

  try {
    const messageRef = ref(rtdb, `${CHAT_MESSAGES_RTDB_PATH}/${messageId}`);
    await rtdbSet(messageRef, null);
  } catch (e) {}

  try {
    const docRef = doc(db, 'nexus_chat_messages', messageId);
    await setDoc(docRef, { deleted: true }, { merge: true });
  } catch (e) {}

  return true;
}

/**
 * Clear all chat messages (Admin Only)
 */
export async function clearAllChatMessages(): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(INITIAL_MESSAGES));
    window.dispatchEvent(new CustomEvent('nexus_chat_local_update', { detail: INITIAL_MESSAGES }));
  } catch (e) {}

  // Server API clear
  try {
    await fetch('/api/chat/messages', { method: 'DELETE' });
  } catch (e) {}

  try {
    const chatRef = ref(rtdb, CHAT_MESSAGES_RTDB_PATH);
    const initialObj: Record<string, ChatMessage> = {};
    INITIAL_MESSAGES.forEach(m => { initialObj[m.id] = m; });
    await rtdbSet(chatRef, initialObj);
  } catch (e) {}

  return true;
}

/**
 * Subscribe to Web Room Settings (Beta Test status & Allowed Emails)
 */
export function subscribeToWebRoomSettings(onUpdate: (settings: WebRoomSettings) => void): () => void {
  let isSubscribed = true;

  // Local check
  try {
    const raw = localStorage.getItem('nexus_web_room_settings');
    if (raw) {
      onUpdate(JSON.parse(raw));
    } else {
      onUpdate(DEFAULT_WEB_ROOM_SETTINGS);
    }
  } catch (e) {
    onUpdate(DEFAULT_WEB_ROOM_SETTINGS);
  }

  let unsubscribeRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, WEB_ROOM_SETTINGS_RTDB_PATH);
    unsubscribeRtdb = rtdbOnValue(dbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val();
        if (val) {
          const settings: WebRoomSettings = {
            betaTestForAll: Boolean(val.betaTestForAll),
            allowedEmails: Array.isArray(val.allowedEmails) ? val.allowedEmails : [ADMIN_EMAIL.toLowerCase()]
          };
          try {
            localStorage.setItem('nexus_web_room_settings', JSON.stringify(settings));
          } catch (e) {}
          onUpdate(settings);
        }
      }
    });
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubscribeRtdb) unsubscribeRtdb();
  };
}

/**
 * Save Web Room Settings (Admin Only)
 */
export async function saveWebRoomSettings(settings: WebRoomSettings): Promise<boolean> {
  try {
    localStorage.setItem('nexus_web_room_settings', JSON.stringify(settings));
  } catch (e) {}

  try {
    const dbRef = ref(rtdb, WEB_ROOM_SETTINGS_RTDB_PATH);
    await rtdbSet(dbRef, settings);
  } catch (e) {}

  try {
    const docRef = doc(db, 'nexus_chat_settings', 'web_room');
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {}

  return true;
}

/**
 * Check if a user has access to Web Rooms (Discord-like voice/video rooms)
 */
export function checkUserWebRoomAccess(userEmail: string | undefined, settings: WebRoomSettings): boolean {
  if (!userEmail) return false;
  const email = userEmail.toLowerCase().trim();
  if (email === ADMIN_EMAIL.toLowerCase().trim()) return true; // Admin always has access
  if (settings.betaTestForAll) return true; // Beta test opened for everyone
  return (settings.allowedEmails || []).some(e => e.toLowerCase().trim() === email);
}

/**
 * Moderation: Ban or Mute user
 */
export async function setModerationStatus(
  userEmail: string, 
  action: 'mute' | 'ban' | 'unmute' | 'unban', 
  durationMinutes: number = 60,
  reason: string = 'Порушення правил чату'
): Promise<boolean> {
  if (!userEmail) return false;
  const cleanEmail = userEmail.trim();
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Optimistic local state update
  const currentMod = { ...cachedModerationState };
  currentMod.mutedUsers = { ...(currentMod.mutedUsers || {}) };
  currentMod.bannedUsers = { ...(currentMod.bannedUsers || {}) };

  if (action === 'mute') {
    const calculatedMuteUntil = durationMinutes === -1 ? 9999999999999 : Date.now() + (durationMinutes * 60 * 1000);
    currentMod.mutedUsers[emailKey] = { mutedUntil: calculatedMuteUntil, reason, email: cleanEmail };
  } else if (action === 'ban') {
    currentMod.bannedUsers[emailKey] = { bannedAt: Date.now(), reason, email: cleanEmail };
  } else if (action === 'unmute') {
    delete currentMod.mutedUsers[emailKey];
  } else if (action === 'unban') {
    delete currentMod.bannedUsers[emailKey];
  }

  cachedModerationState = currentMod;
  try {
    localStorage.setItem('nexus_chat_moderation_v1', JSON.stringify(currentMod));
  } catch (e) {}

  try {
    if (action === 'mute') {
      const calculatedMuteUntil = durationMinutes === -1 ? 9999999999999 : Date.now() + (durationMinutes * 60 * 1000);
      const muteRef = ref(rtdb, `${CHAT_MODERATION_RTDB_PATH}/muted/${emailKey}`);
      await rtdbSet(muteRef, { mutedUntil: calculatedMuteUntil, reason, email: cleanEmail });
    } else if (action === 'ban') {
      const banRef = ref(rtdb, `${CHAT_MODERATION_RTDB_PATH}/banned/${emailKey}`);
      await rtdbSet(banRef, { bannedAt: Date.now(), reason, email: cleanEmail });
    } else if (action === 'unmute') {
      const muteRef = ref(rtdb, `${CHAT_MODERATION_RTDB_PATH}/muted/${emailKey}`);
      await rtdbSet(muteRef, null);
    } else if (action === 'unban') {
      const banRef = ref(rtdb, `${CHAT_MODERATION_RTDB_PATH}/banned/${emailKey}`);
      await rtdbSet(banRef, null);
    }
  } catch (e) {
    console.warn('Moderation error:', e);
  }

  return true;
}

