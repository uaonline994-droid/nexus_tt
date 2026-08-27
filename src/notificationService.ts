/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  data?: any;
}

const NEXUS_ICON = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';

class WebNotificationService {
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.isSupported = true;
    }
  }

  public get permission(): NotificationPermission {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  public get isPermissionGranted(): boolean {
    return this.isSupported && Notification.permission === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      try {
        localStorage.setItem('nexus_push_permission', result);
      } catch (e) {}
      return result === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  }

  public sendNotification(payload: AppNotificationPayload): boolean {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || NEXUS_ICON,
        badge: payload.icon || NEXUS_ICON,
        tag: payload.tag || 'nexus_' + Date.now(),
        data: payload.data || {},
        silent: false
      };

      // If ServiceWorker registration is available, prefer showNotification for mobile PWA
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(payload.title, options);
        }).catch(() => {
          this.fallbackNotification(payload.title, options, payload.url);
        });
      } else {
        this.fallbackNotification(payload.title, options, payload.url);
      }

      return true;
    } catch (err) {
      console.warn('Failed to display browser notification:', err);
      return false;
    }
  }

  private fallbackNotification(title: string, options: NotificationOptions, targetUrl?: string) {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
        if (targetUrl) {
          window.location.hash = targetUrl;
        }
        notif.close();
      };
    } catch (e) {
      console.warn('Fallback notification notice:', e);
    }
  }

  /**
   * Send Mention Push Notification
   */
  public notifyMention(senderName: string, messageText: string) {
    this.sendNotification({
      title: `💬 Вас згадали в чаті NEXUS (@${senderName})`,
      body: messageText.length > 120 ? `${messageText.substring(0, 117)}...` : messageText,
      tag: 'chat_mention_' + Date.now(),
      icon: NEXUS_ICON
    });
  }

  /**
   * Send Web Room Call Push Notification
   */
  public notifyRoomInvite(senderName: string, roomName: string, isPrivate: boolean) {
    this.sendNotification({
      title: isPrivate ? `📞 Приватний дзвінок від ${senderName}` : `🌐 Запрошення у веб-кімнату (${senderName})`,
      body: `Натисніть, щоб приєднатися до голосового зв'язку: ${roomName}`,
      tag: 'room_invite_' + Date.now(),
      icon: NEXUS_ICON
    });
  }

  /**
   * Send Admin / Site News Push Notification
   */
  public notifyAdminAnnouncement(title: string, content: string) {
    this.sendNotification({
      title: `📢 NEXUS Оновлення: ${title}`,
      body: content.length > 120 ? `${content.substring(0, 117)}...` : content,
      tag: 'admin_news_' + Date.now(),
      icon: NEXUS_ICON
    });
  }
}

export const webNotificationService = new WebNotificationService();
