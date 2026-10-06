import React, { createContext, useState, useEffect, useRef } from 'react';
import { notificationService } from '../services/notificationService';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const isFetchingRef = useRef(false);

  const fetchNotifications = async (forceRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await notificationService.getNotifications(forceRefresh);
      setNotifications(list);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleStorage = (e) => {
      if (e.key === 'foodie_live_order_notifications') {
        fetchNotifications(true);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const addNotification = async (text) => {
    try {
      const added = await notificationService.createNotification(text);
      setNotifications((prev) => [added, ...prev]);
    } catch (e) {
      console.error(e);
      setNotifications((prev) => [
        { id: Math.random(), text, read: false },
        ...prev
      ]);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
      setNotifications((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, read: true } : n));
    }
  };

  const clearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
  };

  return (
    <AppContext.Provider value={{
      sidebarCollapsed,
      notifications,
      toggleSidebar,
      addNotification,
      markAllRead,
      markAsRead,
      clearAll
    }}>
      {children}
    </AppContext.Provider>
  );
};
export default AppContext;
