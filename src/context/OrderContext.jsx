import React, { createContext, useState, useEffect, useRef } from 'react';
import { orderService } from '../services/orderService';
import { notificationService } from '../services/notificationService';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchOrders = async (userIdOrShowLoading, maybeShowLoading, filterDate = null) => {
    let targetUser = undefined;
    let showLoading = true;
    if (typeof userIdOrShowLoading === 'string') {
      targetUser = userIdOrShowLoading;
      if (typeof maybeShowLoading === 'boolean') showLoading = maybeShowLoading;
    } else if (typeof userIdOrShowLoading === 'boolean') {
      showLoading = userIdOrShowLoading;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showLoading) setLoading(true);
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isStaffRoute = path.includes('/admin') || path.includes('/employee');
      const arg = targetUser || (isStaffRoute ? 'ALL' : undefined);
      const data = await orderService.getOrders(arg, true, true, filterDate);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchOrders error:", e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchOrdersSilently = async (targetUser) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isStaffRoute = path.includes('/admin') || path.includes('/employee');
      const arg = targetUser || (isStaffRoute ? 'ALL' : undefined);
      const data = await orderService.getOrders(arg, true);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchOrdersSilently error:", e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isStaffRoute = path.includes('/admin') || path.includes('/employee');

    if (isStaffRoute) {
      fetchOrders(true);
    }

    const handleOrdersUpdated = () => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isStaff = currentPath.includes('/admin') || currentPath.includes('/employee');
      if (isStaff) {
        fetchOrdersSilently();
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'foodie_orders_sync_trigger' || e.key === 'foodie_order_status_overrides' || e.key === 'foodie_last_placed_order') {
        handleOrdersUpdated();
      }
    };

    window.addEventListener('foodie_orders_updated', handleOrdersUpdated);
    window.addEventListener('foodie_tables_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleStorage);
    
    const handleLogout = () => {
      setOrders(prev => prev.length === 0 ? prev : []);
    };
    window.addEventListener('foodie_logout', handleLogout);

    return () => {
      window.removeEventListener('foodie_orders_updated', handleOrdersUpdated);
      window.removeEventListener('foodie_tables_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('foodie_logout', handleLogout);
    };
  }, []);

  // Set up polling interval to auto-refresh orders periodically (e.g., every 10 seconds)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isStaff = currentPath.includes('/admin') || currentPath.includes('/employee');
      // Only auto-poll if user is on staff/admin routes to prevent unnecessary requests for public customers
      if (isStaff) {
        fetchOrdersSilently();
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  const updateStatus = async (id, status) => {
    const now = Date.now();
    let previousStatus = null;

    // Optimistically update React state immediately with transition timestamp
    setOrders((prevOrders) =>
      prevOrders.map((o) => {
        if (String(o.id) === String(id)) {
          previousStatus = o.status;
          const statusTimes = { ...(o.statusTimes || {}), [status]: now, updatedAt: now };
          return {
            ...o,
            status,
            statusTimes,
            statusUpdatedAt: now,
            ...(status === 'Preparing' ? { preparingAt: now } : {}),
            ...(status === 'Ready' ? { readyAt: now } : {}),
            ...(status === 'Serving' || status === 'Completed' ? { completedAt: now } : {})
          };
        }
        return o;
      })
    );

    try {
      const updated = await orderService.updateOrderStatus(id, status);
      if (status === 'Ready' || status === 'ready') {
        const targetOrd = (orders || []).find(o => String(o.id) === String(id));
        const isTakeaway = targetOrd?.orderType === 'Takeaway' || targetOrd?.table === 'Takeaway' || String(targetOrd?.table).toLowerCase() === 'takeaway';
        const msg = isTakeaway
          ? `Takeaway Order #${id} is READY for counter pickup!`
          : `Order #${id} is READY to be served!`;
        notificationService.createNotification(msg).catch(() => {});
      }
      fetchOrdersSilently();
      return updated;
    } catch (e) {
      console.error("Failed to update status:", e);
      if (previousStatus) {
        setOrders((prevOrders) =>
          prevOrders.map((o) => {
            if (String(o.id) === String(id)) {
              return { ...o, status: previousStatus };
            }
            return o;
          })
        );
      }
      fetchOrdersSilently();
      throw e;
    }
  };

  return (
    <OrderContext.Provider value={{ orders, loading, fetchOrders, updateStatus }}>
      {children}
    </OrderContext.Provider>
  );
};
export default OrderContext;
