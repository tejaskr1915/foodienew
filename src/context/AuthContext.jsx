import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

const restoreInitialAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, isAuthenticated: false };
  }

  const path = window.location.pathname;
  const isAdminRoute = path.startsWith('/admin') || path.includes('/admin') || path.startsWith('/employee');
  const roleKey = isAdminRoute ? 'admin' : 'customer';
  const key = `foodie_auth_${roleKey}`;
  const tokenKey = `foodie_token_${roleKey}`;

  let savedAuth = sessionStorage.getItem(key);
  let savedToken = sessionStorage.getItem(tokenKey);

  if (roleKey === 'admin') {
    savedAuth = savedAuth || localStorage.getItem(key);
    savedToken = savedToken || localStorage.getItem(tokenKey);
  }

  if (savedAuth) {
    try {
      const parsed = JSON.parse(savedAuth);
      if (parsed && parsed.user && parsed.isAuthenticated !== false) {
        try {
          sessionStorage.setItem(key, savedAuth);
          sessionStorage.setItem(tokenKey, savedToken || 'dummy-token');
        } catch (e) {}
        return { user: parsed.user, isAuthenticated: true };
      }
    } catch (e) {
      console.error('Error parsing initial auth state:', e);
    }
  }

  return { user: null, isAuthenticated: false };
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(restoreInitialAuth);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = authState;

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'foodie_auth_admin' || e.key === 'foodie_auth_customer') {
        if (!e.newValue) {
          setAuthState({ user: null, isAuthenticated: false });
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveSession = (userObj, token) => {
    // Save unauthenticated guest cart temporarily for seamless login cart merging ONLY for customers
    if (!authState.isAuthenticated && userObj.role !== 'admin' && userObj.role !== 'employee') {
      try {
        const guestCart = sessionStorage.getItem('foodie_guest_cart_temp') ||
          sessionStorage.getItem('foodie_guest_cart') ||
          sessionStorage.getItem('foodie_cart') ||
          localStorage.getItem('foodie_guest_cart_temp') ||
          localStorage.getItem('foodie_guest_cart') ||
          localStorage.getItem('foodie_cart');
        if (guestCart && guestCart !== '[]') {
          sessionStorage.setItem('foodie_guest_cart_unmerged', guestCart);
          localStorage.setItem('foodie_guest_cart_unmerged', guestCart);
          sessionStorage.setItem('foodie_guest_cart_temp', guestCart);
          localStorage.setItem('foodie_guest_cart_temp', guestCart);
        }
      } catch (e) {}
    } else if (userObj.role === 'admin' || userObj.role === 'employee') {
      try {
        sessionStorage.removeItem('foodie_guest_cart_unmerged');
        localStorage.removeItem('foodie_guest_cart_unmerged');
        sessionStorage.removeItem('foodie_cart');
      } catch (e) {}
    }

    const roleKey = (userObj.role === 'admin' || userObj.role === 'employee') ? 'admin' : 'customer';
    const payload = JSON.stringify({ user: userObj, isAuthenticated: true });

    sessionStorage.setItem(`foodie_token_${roleKey}`, token || 'dummy-token');
    sessionStorage.setItem(`foodie_auth_${roleKey}`, payload);

    if (roleKey === 'admin') {
      localStorage.setItem(`foodie_token_${roleKey}`, token || 'dummy-token');
      localStorage.setItem(`foodie_auth_${roleKey}`, payload);
    }

    const userPhone = userObj.phone || userObj.customerPhone || userObj.customer_phone || userObj.mobile;
    if (userPhone) {
      const cleanDigits = String(userPhone).replace(/\D/g, '').slice(-10);
      if (cleanDigits) {
        localStorage.setItem('foodie_customer_phone', cleanDigits);
        sessionStorage.setItem('foodie_customer_phone', cleanDigits);
      }
    }

    setAuthState({ user: userObj, isAuthenticated: true });

    try {
      window.dispatchEvent(new CustomEvent('foodie_orders_updated'));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) {}
  };

  const login = async (email, password) => {
    try {
      const res = await authService.login(email, password);
      saveSession(res, 'dummy-token');
      return res;
    } catch (err) {
      throw err;
    }
  };

  const signup = async (name, email, phone) => {
    try {
      const res = await authService.signup(name, email, phone);
      saveSession(res, 'dummy-token');
      return res;
    } catch (err) {
      throw err;
    }
  };

  const sendOTP = async (phone) => {
    try {
      return await authService.sendOTP(phone);
    } catch (err) {
      throw err;
    }
  };

  const verifyOTP = async (phone, otp) => {
    try {
      const res = await authService.verifyOTP(phone, otp);
      saveSession(res, 'dummy-token');
      return res;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    const isCustomer = authState?.user?.role === 'customer';
    setAuthState({ user: null, isAuthenticated: false });

    if (isCustomer) {
      sessionStorage.removeItem('foodie_token_customer');
      sessionStorage.removeItem('foodie_auth_customer');
      localStorage.removeItem('foodie_token_customer');
      localStorage.removeItem('foodie_auth_customer');
      sessionStorage.removeItem('foodie_token');
      sessionStorage.removeItem('foodie_auth');
      localStorage.removeItem('foodie_token');
      localStorage.removeItem('foodie_auth');
      
      sessionStorage.removeItem('foodie_cart');
      sessionStorage.removeItem('foodie_last_placed_order');
      localStorage.removeItem('foodie_last_placed_order');
      sessionStorage.removeItem('foodie_last_order_items');
      localStorage.removeItem('foodie_last_order_items');
      
      try {
        const phone = localStorage.getItem('foodie_customer_phone') || sessionStorage.getItem('foodie_customer_phone');
        if (phone) localStorage.removeItem(`foodie_customer_order_ids_${phone}`);
      } catch (e) {}

      localStorage.removeItem('foodie_guest_order_ids');
      localStorage.removeItem('foodie_customer_order_ids');
      sessionStorage.removeItem('foodie_customer_phone');
      localStorage.removeItem('foodie_customer_phone');
      localStorage.removeItem('foodie_all_placed_orders');
      sessionStorage.removeItem('foodie_all_placed_orders');
    } else {
      sessionStorage.removeItem('foodie_token_admin');
      sessionStorage.removeItem('foodie_auth_admin');
      localStorage.removeItem('foodie_token_admin');
      localStorage.removeItem('foodie_auth_admin');
    }

    try {
      window.dispatchEvent(new CustomEvent('foodie_logout'));
      window.dispatchEvent(new CustomEvent('foodie_orders_updated'));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, signup, logout, sendOTP, verifyOTP }}>
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContext;
