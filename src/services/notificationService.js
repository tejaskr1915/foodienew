/**
 * Notification Service — Local-Only
 *
 * This application does NOT have a backend Notifications API.
 * All notifications are stored and managed via localStorage.
 * No requests to /api/users/notifications/ are made.
 */

const LOCAL_NOTIF_KEY = 'foodie_live_order_notifications';
const CLEARED_NOTIF_KEY = 'foodie_cleared_notif_ids';
const CLEARED_AT_KEY = 'foodie_notif_cleared_at';
const READ_ORDER_NOTIF_KEY = 'foodie_read_order_notifs';

/*
|--------------------------------------------------------------------------
| Local notification helpers
|--------------------------------------------------------------------------
*/

const getLocalNotifications = () => {
  try {
    const data = localStorage.getItem(LOCAL_NOTIF_KEY);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read local notifications:', error);
    return [];
  }
};

const saveLocalNotification = (notification) => {
  try {
    const existing = getLocalNotifications();

    const filtered = existing.filter(
      (item) => String(item.id) !== String(notification.id)
    );

    const updated = [notification, ...filtered];

    localStorage.setItem(
      LOCAL_NOTIF_KEY,
      JSON.stringify(updated.slice(0, 50))
    );
  } catch (error) {
    console.warn('Unable to save local notification:', error);
  }
};

const getClearedNotifIds = () => {
  try {
    const data = localStorage.getItem(CLEARED_NOTIF_KEY);

    if (!data) {
      return new Set();
    }

    const parsed = JSON.parse(data);

    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch (error) {
    console.warn('Unable to read cleared notification IDs:', error);
    return new Set();
  }
};

const getClearedAtTimestamp = () => {
  try {
    const value = localStorage.getItem(CLEARED_AT_KEY);

    if (!value) {
      return 0;
    }

    const timestamp = Number(value);

    return Number.isFinite(timestamp) ? timestamp : 0;
  } catch (error) {
    return 0;
  }
};

const getReadOrderNotificationIds = () => {
  try {
    const data = localStorage.getItem(READ_ORDER_NOTIF_KEY);

    if (!data) {
      return new Set();
    }

    const parsed = JSON.parse(data);

    return new Set(
      Array.isArray(parsed) ? parsed.map(String) : []
    );
  } catch (error) {
    return new Set();
  }
};

const saveReadOrderNotificationIds = (ids) => {
  try {
    localStorage.setItem(
      READ_ORDER_NOTIF_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (error) {
    console.warn('Unable to save read notification IDs:', error);
  }
};

/*
|--------------------------------------------------------------------------
| Remove cleared notifications
|--------------------------------------------------------------------------
*/

const filterActiveNotifications = (notifications) => {
  const clearedIds = getClearedNotifIds();
  const clearedAt = getClearedAtTimestamp();

  return notifications.filter((notification) => {
    const id = String(notification.id);

    // Explicitly cleared notification
    if (clearedIds.has(id)) {
      return false;
    }

    // Notifications created before "clear all"
    if (clearedAt > 0) {
      const notificationTime = new Date(
        notification.date || 0
      ).getTime();

      if (
        notificationTime > 0 &&
        notificationTime <= clearedAt
      ) {
        return false;
      }
    }

    return true;
  });
};

/*
|--------------------------------------------------------------------------
| Sort notifications
|--------------------------------------------------------------------------
*/

const sortNotifications = (notifications) => {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();

    return dateB - dateA;
  });
};

/*
|--------------------------------------------------------------------------
| Notification Service — Local Only (No Backend API)
|--------------------------------------------------------------------------
*/

let cachedNotificationsList = null;
let cachedNotificationsTime = 0;
const NOTIFICATION_CACHE_TTL = 20000; // 20 seconds

export const clearNotificationCache = () => {
  cachedNotificationsList = null;
  cachedNotificationsTime = 0;
};

export const notificationService = {
  getNotifications: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedNotificationsList && (now - cachedNotificationsTime < NOTIFICATION_CACHE_TTL)) {
      return cachedNotificationsList;
    }

    /*
    |--------------------------------------------------------------------------
    | Local notifications only — no backend API call
    |--------------------------------------------------------------------------
    */

    const localNotifications = getLocalNotifications();

    /*
    |--------------------------------------------------------------------------
    | Remove cleared notifications
    |--------------------------------------------------------------------------
    */

    const activeNotifications =
      filterActiveNotifications(localNotifications);

    /*
    |--------------------------------------------------------------------------
    | Sort newest first
    |--------------------------------------------------------------------------
    */

    const sorted = sortNotifications(activeNotifications);
    cachedNotificationsList = sorted;
    cachedNotificationsTime = now;
    return sorted;
  },

  /*
  |--------------------------------------------------------------------------
  | Create notification — local only
  |--------------------------------------------------------------------------
  */

  createNotification: async (message) => {
    clearNotificationCache();
    const temporaryId = `local_${Date.now()}`;

    const localNotification = {
      id: temporaryId,
      text: message,
      read: false,
      date: new Date().toISOString()
    };

    saveLocalNotification(localNotification);

    return localNotification;
  },

  /*
  |--------------------------------------------------------------------------
  | Mark one notification as read — local only
  |--------------------------------------------------------------------------
  */

  markAsRead: async (id) => {
    clearNotificationCache();
    const notificationId = String(id);

    /*
    |--------------------------------------------------------------------------
    | Order notification
    |--------------------------------------------------------------------------
    */

    try {
      const orderMatch =
        notificationId.match(/^order_(\d+)$/);

      if (orderMatch) {
        const orderId = orderMatch[1];

        const readIds =
          getReadOrderNotificationIds();

        readIds.add(String(orderId));

        saveReadOrderNotificationIds(readIds);
      }
    } catch (error) {
      console.warn(
        'Unable to save order notification read state:',
        error
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Local notification
    |--------------------------------------------------------------------------
    */

    try {
      const localNotifications =
        getLocalNotifications();

      const updated =
        localNotifications.map((notification) => {
          if (
            String(notification.id) ===
            notificationId
          ) {
            return {
              ...notification,
              read: true
            };
          }

          return notification;
        });

      localStorage.setItem(
        LOCAL_NOTIF_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn(
        'Unable to update local notification:',
        error
      );
    }

    return true;
  },

  /*
  |--------------------------------------------------------------------------
  | Mark all notifications as read — local only
  |--------------------------------------------------------------------------
  */

  markAllAsRead: async () => {
    clearNotificationCache();

    /*
    |--------------------------------------------------------------------------
    | Mark locally generated order notifications as read
    |--------------------------------------------------------------------------
    */

    try {
      const localNotifications =
        getLocalNotifications();

      const orderReadIds =
        getReadOrderNotificationIds();

      localNotifications.forEach(
        (notification) => {
          const match = String(
            notification.id
          ).match(/^order_(\d+)$/);

          if (match) {
            orderReadIds.add(
              String(match[1])
            );
          }
        }
      );

      saveReadOrderNotificationIds(
        orderReadIds
      );
    } catch (error) {
      console.warn(
        'Unable to update order notification read state:',
        error
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Mark local notifications as read
    |--------------------------------------------------------------------------
    */

    try {
      const localNotifications =
        getLocalNotifications();

      const updated =
        localNotifications.map(
          (notification) => ({
            ...notification,
            read: true
          })
        );

      localStorage.setItem(
        LOCAL_NOTIF_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.warn(
        'Unable to mark local notifications as read:',
        error
      );
    }

    return true;
  },

  /*
  |--------------------------------------------------------------------------
  | Clear all notifications — local only
  |--------------------------------------------------------------------------
  */

  clearAll: async () => {
    clearNotificationCache();

    try {
      /*
      Get the currently visible notifications.
      */
      const currentNotifications =
        await notificationService.getNotifications();

      const currentIds =
        currentNotifications.map(
          (notification) =>
            String(notification.id)
        );

      /*
      Add their IDs to the cleared list.
      */
      const clearedIds =
        getClearedNotifIds();

      currentIds.forEach((id) => {
        clearedIds.add(id);
      });

      localStorage.setItem(
        CLEARED_NOTIF_KEY,
        JSON.stringify(
          Array.from(clearedIds)
        )
      );

      /*
      Remember when the user cleared notifications.
      */
      localStorage.setItem(
        CLEARED_AT_KEY,
        String(Date.now())
      );

      /*
      Clear locally generated notifications.
      */
      localStorage.removeItem(
        LOCAL_NOTIF_KEY
      );
    } catch (error) {
      console.warn(
        'Unable to clear notifications:',
        error
      );
    }

    return true;
  }
};

export default notificationService;