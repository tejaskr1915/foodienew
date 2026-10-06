import api from './api';
import { calculateCouponDiscount } from '../utils/pricing';

export const isFirstTimeCustomer = async (user = null) => {
  try {
    let customerUser = user;
    if (!customerUser && typeof window !== 'undefined') {
      try {
        const savedCustomerAuth = sessionStorage.getItem('foodie_auth_customer') || localStorage.getItem('foodie_auth_customer') || sessionStorage.getItem('foodie_auth') || localStorage.getItem('foodie_auth');
        if (savedCustomerAuth) {
          const parsed = JSON.parse(savedCustomerAuth);
          customerUser = parsed.user || parsed || null;
        }
      } catch (e) {}
    }

    // No user at all — treat as first-time visitor, do NOT hit the backend unauthenticated
    if (!customerUser) return true;

    const userId = customerUser?.id;
    const userPhone = customerUser?.phone || (typeof window !== 'undefined' ? (localStorage.getItem('foodie_customer_phone') || sessionStorage.getItem('foodie_customer_phone')) : null);
    const userEmail = customerUser?.email;

    // 1. Query backend user metadata if available
    if (customerUser) {
      if (typeof customerUser.order_count === 'number' && customerUser.order_count > 0) return false;
      if (typeof customerUser.orders_count === 'number' && customerUser.orders_count > 0) return false;
      if (customerUser.has_placed_order === true) return false;
    }

    // 2. Query backend API orders for user ID / phone / email as primary source of truth
    const targetId = userId || userPhone || userEmail;
    if (targetId) {
      try {
        const { orderService } = await import('./orderService');
        if (orderService && typeof orderService.getOrders === 'function') {
          const userOrders = await orderService.getOrders(targetId, false, true).catch(() => []);
          if (Array.isArray(userOrders) && userOrders.length > 0) {
            return false; // Backend order history exists -> returning customer
          }
        }
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await api.get('/orders/', { bypassCache: true }).catch(() => null);
        const rawOrders = res?.data?.data || (Array.isArray(res?.data) ? res.data : (res?.data?.results || []));
        if (Array.isArray(rawOrders) && rawOrders.length > 0) {
          const cleanTargetPhone = userPhone ? String(userPhone).replace(/\D/g, '').slice(-10) : null;
          const cleanTargetEmail = userEmail ? String(userEmail).toLowerCase().trim() : null;
          const cleanTargetUserId = userId ? String(userId) : null;

          const hasMatchingBackendOrder = rawOrders.some(ord => {
            if (!ord) return false;
            const oUserId = ord.user?.id || ord.user_id || ord.user;
            const oPhone = ord.phone || ord.customerPhone || ord.customer_phone || ord.mobile;
            const oEmail = ord.email || ord.customerEmail || ord.customer_email;

            if (cleanTargetUserId && oUserId && String(oUserId) === cleanTargetUserId) return true;
            if (cleanTargetPhone && oPhone && String(oPhone).replace(/\D/g, '').slice(-10) === cleanTargetPhone) return true;
            if (cleanTargetEmail && oEmail && String(oEmail).toLowerCase().trim() === cleanTargetEmail) return true;
            return false;
          });

          if (hasMatchingBackendOrder) return false;
        }
      } catch (e) {}

      // 3. Local storage fallback check (guest users or offline fallback)
      try {
        const cleanPhone = userPhone ? String(userPhone).replace(/\D/g, '').slice(-10) : null;
        const phoneKey = cleanPhone ? `foodie_customer_order_ids_${cleanPhone}` : null;
        const userKey = userId ? `foodie_customer_order_ids_${userId}` : null;

        const guestSaved = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
        const phoneSaved = phoneKey ? JSON.parse(localStorage.getItem(phoneKey) || '[]') : [];
        const userSaved = userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
        const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');

        if (customerUser) {
          if (phoneSaved.length > 0 || userSaved.length > 0) return false;
        } else {
          if (guestSaved.length > 0 || (Array.isArray(allPlaced) && allPlaced.length > 0)) return false;
        }

        const lastPlaced = localStorage.getItem('foodie_last_placed_order') || sessionStorage.getItem('foodie_last_placed_order');
        if (lastPlaced) {
          const parsed = JSON.parse(lastPlaced);
          if (parsed && (parsed.id || parsed.order_id)) return false;
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error("Error verifying first-time customer status with backend:", e);
  }

  return true;
};

export const mockCoupons = [
  {
    id: 1,
    code: "FOODIE50",
    discount: 50,
    discount_value: 50,
    type: "fixed",
    discount_type: "FIXED",
    minOrderValue: 500,
    minimum_order_amount: 500,
    expiryDate: "2028-12-31",
    status: "Active",
    description: "Flat ₹50 OFF on orders above ₹500"
  },
  {
    id: 2,
    code: "WELCOME100",
    discount: 100,
    discount_value: 100,
    type: "fixed",
    discount_type: "FIXED",
    minOrderValue: 700,
    minimum_order_amount: 700,
    expiryDate: "2028-12-31",
    status: "Active",
    description: "Flat ₹100 OFF on orders above ₹700"
  },
  {
    id: 3,
    code: "SUPER20",
    discount: 20,
    discount_value: 20,
    type: "percentage",
    discount_type: "PERCENTAGE",
    minOrderValue: 300,
    minimum_order_amount: 300,
    maxDiscount: 80,
    maximum_discount: 80,
    expiryDate: "2028-12-31",
    status: "Active",
    description: "20% OFF up to ₹80 on orders above ₹300"
  }
];

const LOCAL_STORAGE_KEY = 'foodie_coupons_store';

const getStoredCoupons = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading coupons from localStorage:", e);
  }
  return null;
};

const setStoredCoupons = (coupons) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(coupons));
  } catch (e) {
    console.error("Error saving coupons to localStorage:", e);
  }
};

export const couponService = {
  getCoupons: async () => {
    let deletedCodes = [];
    try {
      deletedCodes = JSON.parse(localStorage.getItem('foodie_deleted_coupons') || '[]');
    } catch (e) {}

    let backendCoupons = [];
    try {
      let res = await api.get('/coupons/').catch(() => null);
      if (!res || !res.data) {
        res = await api.get('/admin/coupons/').catch(() => null);
      }
      const rawCoupons = res?.data?.data || (Array.isArray(res?.data) ? res.data : (res?.data?.results || []));
      if (Array.isArray(rawCoupons) && rawCoupons.length > 0) {
        backendCoupons = rawCoupons.map(c => {
          const minVal = parseFloat(c.minimum_order_amount || c.min_order_amount || c.minOrderValue || 0);
          const discVal = parseFloat(c.discount_value || c.discount_amount || c.discount || 0);
          const maxDisc = c.maximum_discount || c.maxDiscount ? parseFloat(c.maximum_discount || c.maxDiscount) : null;
          const isPct = c.discount_type === 'PERCENTAGE' || c.type === 'percentage';
          const cleanCode = String(c.code || '').toUpperCase();
          const desc = c.description || (isPct ? `${discVal}% OFF${maxDisc ? ` up to ₹${maxDisc}` : ''} on orders above ₹${minVal}` : `Flat ₹${discVal} OFF on orders above ₹${minVal}`);

          return {
            id: c.id || c.coupon_id,
            code: cleanCode,
            discount: discVal,
            discount_value: discVal,
            type: isPct ? 'percentage' : 'fixed',
            discount_type: isPct ? 'PERCENTAGE' : 'FIXED',
            minOrderValue: minVal,
            minimum_order_amount: minVal,
            maxDiscount: maxDisc,
            maximum_discount: maxDisc,
            expiryDate: c.end_date || c.valid_to || c.expiryDate || c.validity || '2028-12-31',
            validity: c.end_date || c.valid_to || c.expiryDate || c.validity || '30 Dec 2028',
            status: (c.is_active !== false && c.status !== 'Inactive') ? 'Active' : 'Inactive',
            description: desc
          };
        });
      }
    } catch (e) {}

    let finalCoupons = [];
    if (backendCoupons.length > 0) {
      // Backend is available, use it as the source of truth
      finalCoupons = backendCoupons.filter(c => {
        const codeUpper = String(c.code).toUpperCase();
        return !deletedCodes.includes(codeUpper) && !deletedCodes.includes(String(c.id));
      });
    } else {
      // Fallback to local storage or mock if backend is down
      let stored = getStoredCoupons();
      if (!stored) {
        stored = [...mockCoupons];
      }
      finalCoupons = stored.filter(c => {
        const codeUpper = String(c.code).toUpperCase();
        return !deletedCodes.includes(codeUpper) && !deletedCodes.includes(String(c.id));
      });
    }

    setStoredCoupons(finalCoupons);
    return finalCoupons;
  },

  createCoupon: async (couponData) => {
    const cleanCode = String(couponData.code || '').trim().toUpperCase();
    const discountVal = parseFloat(couponData.discount || couponData.discount_value || 0);
    const minVal = parseFloat(couponData.minOrderValue || couponData.minimum_order_amount || 0);
    const isPct = couponData.type === 'percentage' || couponData.discount_type === 'PERCENTAGE';
    const desc = couponData.description || (isPct ? `${discountVal}% OFF on orders above ₹${minVal}` : `Flat ₹${discountVal} OFF on orders above ₹${minVal}`);

    const newCoupon = {
      id: Date.now(),
      code: cleanCode,
      discount: discountVal,
      discount_value: discountVal,
      type: isPct ? 'percentage' : 'fixed',
      discount_type: isPct ? 'PERCENTAGE' : 'FIXED',
      minOrderValue: minVal,
      minimum_order_amount: minVal,
      maxDiscount: couponData.maxDiscount || couponData.maximum_discount || null,
      maximum_discount: couponData.maxDiscount || couponData.maximum_discount || null,
      expiryDate: couponData.validity || couponData.expiryDate || couponData.end_date || '2028-12-31',
      validity: couponData.validity || couponData.expiryDate || couponData.end_date || '30 Dec 2028',
      status: 'Active',
      description: desc
    };

    // Remove from deleted list if recreated
    try {
      const deletedCodes = JSON.parse(localStorage.getItem('foodie_deleted_coupons') || '[]');
      const filtered = deletedCodes.filter(c => c !== cleanCode);
      localStorage.setItem('foodie_deleted_coupons', JSON.stringify(filtered));
    } catch (e) {}

    try {
      await api.post('/coupons/', {
        code: cleanCode,
        discount_value: String(newCoupon.discount),
        discount_type: newCoupon.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
        minimum_order_amount: String(newCoupon.minOrderValue),
        maximum_discount: newCoupon.maxDiscount ? String(newCoupon.maxDiscount) : null,
        start_date: new Date().toISOString(),
        end_date: new Date(newCoupon.expiryDate).toISOString(),
        is_active: true,
        description: newCoupon.description
      }).catch(async () => {
        await api.post('/admin/coupons/', {
          code: cleanCode,
          discount_amount: newCoupon.discount,
          discount_type: newCoupon.type === 'percentage' ? 'PERCENTAGE' : 'FLAT',
          min_order_amount: newCoupon.minOrderValue,
          valid_to: newCoupon.expiryDate,
          is_active: true,
          description: newCoupon.description
        });
      });
    } catch (e) {
      console.warn("Backend coupon creation fallback to local persistence:", e);
    }

    let stored = getStoredCoupons() || mockCoupons;
    const updated = [newCoupon, ...stored.filter(c => String(c.code).toUpperCase() !== cleanCode)];
    setStoredCoupons(updated);
    return newCoupon;
  },

  toggleStatus: async (id, code, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      if (id && typeof id === 'number' && id < 100000) {
        await api.patch(`/coupons/${id}/`, {
          is_active: newStatus === 'Active'
        }).catch(async () => {
          await api.patch(`/admin/coupons/${id}/`, {
            is_active: newStatus === 'Active'
          });
        });
      }
    } catch (e) {}

    let stored = getStoredCoupons() || mockCoupons;
    const updated = stored.map(c => {
      const match = (c.id === id || String(c.id) === String(id)) || 
                    (code && String(c.code).toUpperCase() === String(code).toUpperCase());
      return match ? { ...c, status: newStatus } : c;
    });
    setStoredCoupons(updated);
    return updated;
  },

  deleteCoupon: async (id, code) => {
    try {
      if (id && typeof id === 'number' && id < 100000) {
        await api.delete(`/coupons/${id}/`).catch(async () => {
          await api.delete(`/admin/coupons/${id}/`);
        });
      }
    } catch (e) {
      console.error("Failed to delete coupon in backend:", e);
    }

    const cleanCode = code ? String(code).toUpperCase() : null;
    try {
      const deletedCodes = JSON.parse(localStorage.getItem('foodie_deleted_coupons') || '[]');
      if (cleanCode && !deletedCodes.includes(cleanCode)) {
        deletedCodes.push(cleanCode);
      }
      if (id && !deletedCodes.includes(String(id))) {
        deletedCodes.push(String(id));
      }
      localStorage.setItem('foodie_deleted_coupons', JSON.stringify(deletedCodes));
    } catch (e) {}

    let stored = getStoredCoupons() || mockCoupons;
    const updated = stored.filter(c => {
      if (id && (c.id === id || String(c.id) === String(id))) return false;
      if (cleanCode && String(c.code).toUpperCase() === cleanCode) return false;
      return true;
    });
    setStoredCoupons(updated);
    return updated;
  },
  
  validateCoupon: async (code, subtotalBeforeGst, user = null) => {
    const codeUpper = String(code || '').trim().toUpperCase();
    const coupons = await couponService.getCoupons();
    const c = coupons.find(coupon => String(coupon.code).toUpperCase() === codeUpper);
    if (!c) {
      throw new Error("Invalid coupon code");
    }
    if (c.status !== "Active") {
      throw new Error("This coupon is currently inactive");
    }

    if (codeUpper === 'WELCOME100') {
      const firstTime = await isFirstTimeCustomer(user);
      if (!firstTime) {
        throw new Error("WELCOME100 coupon is valid for first-time customers only.");
      }
    }

    const now = new Date();
    const expiry = new Date(c.expiryDate);
    if (now > expiry) {
      throw new Error("This coupon has expired");
    }
    const minOrder = Number(c.minOrderValue || c.minimum_order_amount || 0);
    if (subtotalBeforeGst < minOrder) {
      const remaining = Math.round(minOrder - subtotalBeforeGst);
      throw new Error(`Add ₹${remaining} more to use this coupon (minimum order ₹${minOrder}).`);
    }

    const discountAmount = calculateCouponDiscount(c, subtotalBeforeGst);
    return {
      valid: true,
      code: c.code,
      discountAmount,
      coupon: c
    };
  }
};

export default couponService;

