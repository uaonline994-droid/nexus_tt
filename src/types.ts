export interface BioLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  clicks?: number;
  highlighted?: boolean;
}

export interface TikTokStats {
  followers: string;
  likes: string;
  views: string;
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  date: string;
  tag?: string; // e.g. "🔥 HOT", "⚡ НОВИНА", "🎁 ПРОМОКОД", "🎬 СТРІМ"
  imageUrl?: string;
  isPinned?: boolean;
  createdAt: number;
}

export interface BioProfile {
  avatarUrl: string;
  displayName: string;
  handle: string;
  bioText: string;
  promoCode: string;
  stats: TikTokStats;
  links: BioLink[];
  news: NewsPost[];
  updatedAt?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

// CHAT & MODERATION TYPES
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: string;
  isAdmin: boolean;
  text: string;
  timestamp: number;
  mentionsAdmin?: boolean; // contains @nexus
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  } | null;
  type?: 'text' | 'web_room_invite';
  roomData?: {
    roomId: string;
    roomName?: string;
    creatorEmail: string;
    creatorName: string;
    targetEmail?: string;
    targetName?: string;
    active: boolean;
    isPrivate?: boolean;
  };
}

export interface ChatModerationState {
  mutedUsers: Record<string, { mutedUntil: number; reason?: string; email?: string }>;
  bannedUsers: Record<string, { bannedAt: number; reason?: string; email?: string }>;
}

export interface ChatSettings {
  isChatOpenForAll: boolean; // true = anyone can chat
  isReadOnly: boolean; // true = chat closed / read-only for all non-admins
  whitelistOnly: boolean; // true = only allowedChatEmails can chat
  allowedChatEmails: string[]; // whitelist of users who can write
  slowmodeSeconds: number; // e.g. 300, 60, 30, 0
}

export interface WebRoomSettings {
  betaTestForAll: boolean;
  allowedEmails: string[];
}

export interface WebRoomParticipant {
  id: string;
  email: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

export interface BioUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isAdmin: boolean;
}

export interface SecurityAuditInfo {
  email: string;
  deviceModel: string;
  location: string;
  ipAddress?: string;
  userAgent?: string;
  registeredAt: number;
}

export interface UserProfile {
  uid: string;
  profileId: string; // Randomly generated e.g. #849201
  nickname: string; // Придуманий нікнейм
  username: string; // @ім'я користувача (бер нейм / handle)
  email: string;
  avatar: string;
  isAdmin: boolean;
  securityAudit?: SecurityAuditInfo;
  createdAt: number;
  updatedAt?: number;
}
