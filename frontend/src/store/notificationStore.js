import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  lastUpdated: null,

  setNotifications: (notifs) => {
    const unreadCount = notifs.filter((n) => !(n.isRead ?? n.read)).length;
    set({ notifications: notifs, unreadCount, lastUpdated: Date.now(), loading: false });
  },

  addNotification: (notif) => {
    set((state) => {
      const isUnread = !(notif.isRead ?? notif.read);
      return {
        notifications: [notif, ...state.notifications],
        unreadCount: state.unreadCount + (isUnread ? 1 : 0),
        lastUpdated: Date.now()
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      let changed = false;
      const notifications = state.notifications.map((n) => {
        if (n.id === id || n._id === id) {
          if (!(n.isRead ?? n.read)) changed = true;
          return { ...n, read: true, isRead: true };
        }
        return n;
      });
      return {
        notifications,
        unreadCount: changed ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        lastUpdated: Date.now()
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true, isRead: true })),
      unreadCount: 0,
      lastUpdated: Date.now()
    }));
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0, lastUpdated: Date.now() }),
  setLoading: (loading) => set({ loading })
}));
