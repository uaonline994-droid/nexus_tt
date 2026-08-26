import { ref, rtdbSet, rtdbOnValue, doc, setDoc, db, rtdb, ADMIN_EMAIL } from './firebase';
import { setModerationStatus, sendChatMessage } from './chatService';

export const MASTER_ADMIN_EMAIL = 'a60840397@gmail.com';

export interface SecurityIncident {
  id: string;
  timestamp: number;
  intruderEmail: string;
  intruderName: string;
  intruderUid?: string;
  location: string;
  attemptedAction: string;
  reason: string;
  vulnerabilityAnalysis: string;
  status: 'AUTO_BANNED' | 'REPORTED';
  ipInfo?: string;
  userAgent?: string;
}

const LOCAL_SECURITY_KEY = 'nexus_security_incidents_v1';
const RTDB_INCIDENTS_PATH = 'nexus_security_incidents';

/**
 * Strict Master Admin Verification
 * Returns true ONLY if email is exactly a60840397@gmail.com (case-insensitive, trimmed)
 */
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase().trim();
}

/**
 * Get cached security incidents
 */
export function getCachedSecurityIncidents(): SecurityIncident[] {
  try {
    const raw = localStorage.getItem(LOCAL_SECURITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Security cache read error:', e);
  }
  return [];
}

/**
 * Subscribe to live security incidents
 */
export function subscribeToSecurityIncidents(onUpdate: (incidents: SecurityIncident[]) => void): () => void {
  let isSubscribed = true;
  onUpdate(getCachedSecurityIncidents());

  let unsubRtdb: (() => void) | null = null;
  try {
    const dbRef = ref(rtdb, RTDB_INCIDENTS_PATH);
    unsubRtdb = rtdbOnValue(dbRef, (snap) => {
      if (!isSubscribed) return;
      if (snap.exists()) {
        const val = snap.val();
        const list: SecurityIncident[] = Object.values(val || {});
        list.sort((a, b) => b.timestamp - a.timestamp);
        try {
          localStorage.setItem(LOCAL_SECURITY_KEY, JSON.stringify(list));
        } catch (e) {}
        onUpdate(list);
      }
    });
  } catch (e) {}

  return () => {
    isSubscribed = false;
    if (unsubRtdb) unsubRtdb();
  };
}

/**
 * Report an unauthorized intrusion attempt:
 * 1. Automatically bans the intruder's email/session in chat & rooms
 * 2. Logs incident into Firebase RTDB & Firestore
 * 3. Sends a prominent system warning log directly to Admin
 */
export async function reportSecurityIntrusion(
  intruder: { email: string; name?: string; uid?: string },
  details: {
    location: string;
    attemptedAction: string;
    reason?: string;
    vulnerabilityAnalysis?: string;
  }
): Promise<SecurityIncident> {
  const incidentId = 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const cleanEmail = (intruder.email || 'unknown_intruder@blocked.net').trim().toLowerCase();
  
  const incident: SecurityIncident = {
    id: incidentId,
    timestamp: Date.now(),
    intruderEmail: cleanEmail,
    intruderName: intruder.name || cleanEmail.split('@')[0] || 'Unknown',
    intruderUid: intruder.uid || 'uid_' + Math.random().toString(36).substring(2, 6),
    location: details.location,
    attemptedAction: details.attemptedAction,
    reason: details.reason || 'Спроба несанкціонованого отримання прав адміністратора без верифікації головної пошти',
    vulnerabilityAnalysis: details.vulnerabilityAnalysis || 'Спроба виклику захищеного функціоналу/модального вікна неавторизованою поштою. Заблоковано системою автоматичного моніторингу.',
    status: 'AUTO_BANNED',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
  };

  console.warn('🚨 SECURITY ALERT - INTRUSION DETECTED & BANNED:', incident);

  // 1. Instantly ban the intruder
  try {
    await setModerationStatus(
      cleanEmail, 
      'ban', 
      0, 
      `🚨 Автоматичний бан системи безпеки: Спроба зламу/несанкціонованого адмін-доступу в [${details.location}]`
    );
  } catch (e) {
    console.error('Failed to ban intruder:', e);
  }

  // 2. Save incident to LocalStorage
  try {
    const current = getCachedSecurityIncidents();
    const updated = [incident, ...current.filter(i => i.id !== incident.id)].slice(0, 50);
    localStorage.setItem(LOCAL_SECURITY_KEY, JSON.stringify(updated));
  } catch (e) {}

  // 3. Save incident to Realtime Database
  try {
    const rtdbRef = ref(rtdb, `${RTDB_INCIDENTS_PATH}/${incident.id}`);
    await rtdbSet(rtdbRef, incident);
  } catch (e) {
    console.error('Failed to log security incident to RTDB:', e);
  }

  // 4. Save to Firestore
  try {
    const docRef = doc(db, 'nexus_security_logs', incident.id);
    await setDoc(docRef, incident, { merge: true });
  } catch (e) {}

  // 5. Post high-priority alert into chat so admin is notified instantly
  try {
    await sendChatMessage(
      {
        id: 'security_bot',
        name: '🛡️ СИСТЕМА БЕЗПЕКИ NEXUS',
        email: 'security@nexus.shield',
        avatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=400&auto=format&fit=crop&q=80'
      },
      `🚨 УВАГА АДМІНІСТРАТОРУ (@nexus)!\nЗафіксовано спробу несанкціонованого доступу до адмінки.\n• Користувач: ${incident.intruderEmail} (${incident.intruderName})\n• Місце спроби: ${incident.location}\n• Дія: ${incident.attemptedAction}\n• Статус: КОРИСТУВАЧА АВТОМАТИЧНО ЗАБЛОКОВАНО (BAN).`,
      null,
      'text'
    );
  } catch (e) {}

  return incident;
}
