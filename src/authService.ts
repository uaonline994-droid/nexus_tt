/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NEXUS Authentication Engine & User Database Service
 * - Manual Registration: Login, Email, Password (hashed securely with SHA-256 + salt)
 * - Manual Login: Login or Email + Password verification
 * - Google Sign-In: Instant seamless linking with existing accounts by email
 * - Session Persistence & Auto-Reconnection
 */

import { AuthUserAccount, UserProfile } from './types';
import { computeSHA256 } from './security';
import { saveUserProfile, collectDeviceSecurityAudit } from './userService';
import { MASTER_ADMIN_EMAIL, isMasterAdmin } from './securityService';
import { db, rtdb, ref, rtdbSet, rtdbGet, doc, setDoc, getDoc } from './firebase';

const LOCAL_SESSION_KEY = 'nexus_auth_session_v2';
const LOCAL_USERS_KEY = 'nexus_users_db_v2';
const RTDB_USERS_PATH = 'nexus_users';
const FIRESTORE_USERS_COLLECTION = 'nexus_users';

/**
 * Get cached users list
 */
function getLocalUsers(): AuthUserAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {}
  return [];
}

/**
 * Save users list locally
 */
function saveLocalUsers(list: AuthUserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Save user to all DB tiers (LocalStorage + RTDB + Firestore + Server API)
 */
async function persistUserAccount(user: AuthUserAccount): Promise<void> {
  // 1. Local
  const localList = getLocalUsers();
  const existingIdx = localList.findIndex(u => u.uid === user.uid || u.email === user.email);
  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...user };
  } else {
    localList.unshift(user);
  }
  saveLocalUsers(localList);

  // 2. Sync to Firebase RTDB
  try {
    const rtdbRef = ref(rtdb, `${RTDB_USERS_PATH}/${user.uid}`);
    await rtdbSet(rtdbRef, user);
  } catch (e) {}

  // 3. Sync to Firestore
  try {
    const docRef = doc(db, FIRESTORE_USERS_COLLECTION, user.uid);
    await setDoc(docRef, user, { merge: true });
  } catch (e) {}

  // 4. Also register as a public UserProfile for chat & room visibility
  try {
    const pubProfile: UserProfile = {
      uid: user.uid,
      profileId: user.profileId,
      nickname: user.nickname,
      username: user.login,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: Date.now()
    };
    await saveUserProfile(pubProfile);
  } catch (e) {}

  // 5. Server API
  try {
    fetch('/api/auth/register-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Get active session
 */
export function getActiveAuthSession(): AuthUserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Set active session
 */
export function setActiveAuthSession(user: AuthUserAccount | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    window.dispatchEvent(new CustomEvent('nexus_auth_change', { detail: null }));
    return;
  }
  // Store without password hash for safety
  const safeSession: AuthUserAccount = {
    ...user,
    passwordHash: undefined,
    passwordSalt: undefined
  };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(safeSession));
  window.dispatchEvent(new CustomEvent('nexus_auth_change', { detail: safeSession }));
}

/**
 * Find user by email or login across all DB sources
 */
export async function findUserByLoginOrEmail(identifier: string): Promise<AuthUserAccount | null> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) return null;

  // 1. Check Local DB
  const localList = getLocalUsers();
  const localFound = localList.find(u => 
    u.email.toLowerCase() === cleanId || 
    u.login.toLowerCase() === cleanId
  );
  if (localFound) return localFound;

  // 2. Check Server API
  try {
    const res = await fetch(`/api/auth/lookup?id=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        return data.user;
      }
    }
  } catch (e) {}

  // 3. Check RTDB
  try {
    const rtdbRef = ref(rtdb, RTDB_USERS_PATH);
    const snap = await rtdbGet(rtdbRef);
    if (snap.exists()) {
      const val = snap.val();
      if (val && typeof val === 'object') {
        const list = Object.values(val) as AuthUserAccount[];
        const match = list.find(u => 
          u.email?.toLowerCase() === cleanId || 
          u.login?.toLowerCase() === cleanId
        );
        if (match) return match;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Register a new user with manual fields (Login, Email, Password)
 */
export async function registerWithCredentials(data: {
  login: string;
  email: string;
  password: string;
  nickname?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: AuthUserAccount; error?: string }> {
  const cleanLogin = data.login.trim().toLowerCase();
  const cleanEmail = data.email.trim().toLowerCase();
  const rawPassword = data.password.trim();

  // 1. Validations
  if (!cleanLogin || cleanLogin.length < 3) {
    return { success: false, error: 'Логін повинен містити щонайменше 3 символи' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(cleanLogin)) {
    return { success: false, error: 'Логін може містити лише латинські літери, цифри, крапку та підкреслення' };
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Введіть коректну електронну пошту (наприклад: name@gmail.com)' };
  }
  if (!rawPassword || rawPassword.length < 4) {
    return { success: false, error: 'Пароль повинен містити щонайменше 4 символи' };
  }

  // 2. Check if user already exists
  const existingUser = await findUserByLoginOrEmail(cleanEmail);
  if (existingUser && existingUser.passwordHash) {
    return { 
      success: false, 
      error: 'Користувач з такою поштою вже зареєстрований. Будь ласка, натисніть "Увійти".' 
    };
  }

  const existingLogin = await findUserByLoginOrEmail(cleanLogin);
  if (existingLogin && existingLogin.uid !== existingUser?.uid) {
    return { 
      success: false, 
      error: 'Цей логін вже зайнятий іншим користувачем. Оберіть інший логін.' 
    };
  }

  // 3. Cryptographic Password Hashing (Salt + SHA-256)
  const salt = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const passwordHash = await computeSHA256(rawPassword + ':' + salt);

  const isAdmin = isMasterAdmin(cleanEmail);
  const profileId = '#' + Math.floor(100000 + Math.random() * 900000);
  const uid = existingUser?.uid || 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newAccount: AuthUserAccount = {
    uid,
    login: cleanLogin,
    nickname: data.nickname?.trim() || data.login.trim(),
    email: cleanEmail,
    passwordHash,
    passwordSalt: salt,
    avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    profileId,
    isAdmin,
    authProvider: 'password',
    createdAt: existingUser?.createdAt || Date.now(),
    lastLoginAt: Date.now()
  };

  // 4. Save to database
  await persistUserAccount(newAccount);

  // 5. Gather device audit quietly
  collectDeviceSecurityAudit(cleanEmail).then(audit => {
    saveUserProfile({
      uid: newAccount.uid,
      profileId: newAccount.profileId,
      nickname: newAccount.nickname,
      username: newAccount.login,
      email: newAccount.email,
      avatar: newAccount.avatar,
      isAdmin: newAccount.isAdmin,
      securityAudit: audit,
      createdAt: newAccount.createdAt,
      updatedAt: Date.now()
    });
  }).catch(() => {});

  // 6. Set active session
  setActiveAuthSession(newAccount);

  return { success: true, user: newAccount };
}

/**
 * Login with manual credentials (Login or Email + Password)
 */
export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUserAccount; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const rawPassword = password.trim();

  if (!cleanId) {
    return { success: false, error: 'Введіть ваш логін або електронну пошту' };
  }
  if (!rawPassword) {
    return { success: false, error: 'Введіть ваш пароль' };
  }

  // 1. Find user in database
  const user = await findUserByLoginOrEmail(cleanId);
  if (!user) {
    return { 
      success: false, 
      error: 'Користувача з таким логіном або поштою не знайдено. Перевірте правильність або зареєструйтесь.' 
    };
  }

  // 2. Verify password
  if (!user.passwordHash || !user.passwordSalt) {
    return { 
      success: false, 
      error: 'Цей акаунт було створено через Google. Будь ласка, увійдіть через кнопку Google.' 
    };
  }

  const computedHash = await computeSHA256(rawPassword + ':' + user.passwordSalt);
  if (computedHash !== user.passwordHash) {
    return { 
      success: false, 
      error: 'Невірний пароль. Будь ласка, перевірте пароль та спробуйте знову.' 
    };
  }

  // 3. Update last login
  const updatedUser: AuthUserAccount = {
    ...user,
    lastLoginAt: Date.now(),
    isAdmin: isMasterAdmin(user.email) // Real-time admin check
  };

  await persistUserAccount(updatedUser);
  setActiveAuthSession(updatedUser);

  return { success: true, user: updatedUser };
}

/**
 * Google Sign-In Integration: Links or creates account seamlessly
 */
export async function syncGoogleAuthUser(googleData: {
  email: string;
  name?: string;
  avatar?: string;
  uid?: string;
}): Promise<{ success: boolean; user: AuthUserAccount }> {
  const cleanEmail = googleData.email.trim().toLowerCase();
  const isAdmin = isMasterAdmin(cleanEmail);

  // Check if account already exists with this email (e.g. registered manually)
  const existing = await findUserByLoginOrEmail(cleanEmail);

  let targetAccount: AuthUserAccount;

  if (existing) {
    // Link existing account with Google
    targetAccount = {
      ...existing,
      nickname: existing.nickname || googleData.name || cleanEmail.split('@')[0],
      avatar: existing.avatar || googleData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      isAdmin,
      authProvider: existing.passwordHash ? 'linked' : 'google',
      lastLoginAt: Date.now()
    };
  } else {
    // Create new account for Google user
    const login = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
    targetAccount = {
      uid: googleData.uid || 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      login,
      nickname: googleData.name || login,
      email: cleanEmail,
      avatar: googleData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      profileId: '#' + Math.floor(100000 + Math.random() * 900000),
      isAdmin,
      authProvider: 'google',
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };
  }

  await persistUserAccount(targetAccount);
  setActiveAuthSession(targetAccount);

  return { success: true, user: targetAccount };
}
