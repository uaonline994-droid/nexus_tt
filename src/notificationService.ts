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

type InAppNotificationListener = (notification: AppNotificationPayload) => void;

class WebNotificationService {
  private isSupported: boolean = false;
  private inAppListeners: Set<InAppNotificationListener> = new Set();
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.isSupported = true;
      }
      this.initServiceWorker();
    }
  }

  private async initServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        this.swRegistration = reg;
      } catch (err) {
        console.warn('Service Worker registration warning:', err);
      }
    }
  }

  public get isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public get permission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  public get isPermissionGranted(): boolean {
    return this.isNotificationSupported && Notification.permission === 'granted';
  }

  public onInAppNotification(listener: InAppNotificationListener): () => void {
    this.inAppListeners.add(listener);
    return () => {
      this.inAppListeners.delete(listener);
    };
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      // Direct Promise-based or callback-based requestPermission
      let result: NotificationPermission;
      if (typeof Notification.requestPermission === 'function') {
        result = await Notification.requestPermission();
      } else {
        result = await new Promise<NotificationPermission>((resolve) => {
          (Notification as any).requestPermission((res: NotificationPermission) => resolve(res));
        });
      }

      try {
        localStorage.setItem('nexus_push_permission', result);
      } catch (e) {}

      return result;
    } catch (err) {
      console.warn('Error requesting notification permission on device:', err);
      return Notification.permission || 'denied';
    }
  }

  public sendNotification(payload: AppNotificationPayload): boolean {
    // 1. Always emit in-app notification for active app view / mobile fallback
    this.inAppListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {}
    });

    if (!this.isNotificationSupported || Notification.permission !== 'granted') {
      return false;
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || NEXUS_ICON,
      badge: payload.icon || NEXUS_ICON,
      tag: payload.tag || 'nexus_' + Date.now(),
      data: payload.data || {},
      silent: false
    };

    // Try Service Worker registration first (Required for mobile PWA/Android Chrome)
    if (this.swRegistration) {
      this.swRegistration.showNotification(payload.title, options).catch(() => {
        this.fallbackNotification(payload.title, options, payload.url);
      });
      return true;
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(payload.title, options);
      }).catch(() => {
        this.fallbackNotification(payload.title, options, payload.url);
      });
      return true;
    } else {
      this.fallbackNotification(payload.title, options, payload.url);
      return true;
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
   * Send Direct Message Notification
   */
  public notifyDirectMessage(senderName: string, messageText: string) {
    this.sendNotification({
      title: `✉️ Приватне повідомлення від ${senderName}`,
      body: messageText.length > 120 ? `${messageText.substring(0, 117)}...` : messageText,
      tag: 'direct_msg_' + Date.now(),
      icon: NEXUS_ICON
    });
  }

  /**
   * Send Web Room Call Push Notification
   */
  public notifyRoomInvite(senderName: string, roomName: string, isPrivate: boolean) {
    this.sendNotification({
      title: isPrivate ? `📞 Приватний дзвінок від ${senderName}` : `🌐 Запрошення у веб-кімнату (${senderName})`,
      body: `Натисніть, щоб приєднатися: ${roomName}`,
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
