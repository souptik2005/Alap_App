export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notifications.');
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return Notification.permission;
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  // Only trigger native browser notification if tab is hidden or user is on another window
  if (document.hidden) {
    try {
      const notification = new Notification(title, {
        body: options?.body || 'New message on Alap',
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag,
      });

      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      return notification;
    } catch (err) {
      console.warn('Unable to trigger browser notification:', err);
      return null;
    }
  }

  return null;
}
