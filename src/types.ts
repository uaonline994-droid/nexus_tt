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
