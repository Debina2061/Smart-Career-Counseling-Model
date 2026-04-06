import { createContext, useCallback, useContext, useState } from 'react';

const AdminNotificationContext = createContext(null);

let nextId = 1;

export function AdminNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'success') => {
    const id = nextId++;
    const notification = { id, message, type, time: new Date(), read: false };
    setNotifications((prev) => [notification, ...prev]);

    // Auto-dismiss toast after 4 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
      );
    }, 4000);

    // Remove from DOM after animation
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, hidden: true } : n))
      );
    }, 4500);

    return id;
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminNotificationContext.Provider
      value={{ notifications, notify, markAllRead, clearAll, unreadCount }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotification() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) {
    throw new Error('useAdminNotification must be used within AdminNotificationProvider');
  }
  return ctx;
}
