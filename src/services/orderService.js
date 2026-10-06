import api, { clearApiCache } from './api';
import { mockOrders } from '../data/mockData/orders';
import { inventoryService } from './inventoryService';
import { tableService } from './tableService';
import { clearNotificationCache } from './notificationService';
import { productService } from './productService';

const _isValidNumericId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return false;
  const n = Number(s);
  return !Number.isNaN(n) && Number.isFinite(n);
};

const _extractBackendOrderId = async (orderLike) => {
  if (orderLike === undefined || orderLike === null) return null;
  if (typeof orderLike === 'object') {
    const candidates = [
      orderLike._backendId,
      orderLike.backend_id,
      orderLike.backendId,
      orderLike.backendNumericId,
      orderLike.pk,
      orderLike.id,
      orderLike.order_id,
      orderLike.orderId
    ];
    for (const c of candidates) {
      if (_isValidNumericId(c)) return Number(c);
    }
  }
  const s = String(orderLike).trim();
  if (_isValidNumericId(s)) return Number(s);
  const stripped = s.replace(/^(FD|ORD|order_|-)/gi, '').replace(/-/g, '');
  if (_isValidNumericId(stripped) && stripped.length <= 6) return Number(stripped);

  // Check saved local orders
  try {
    const raw = localStorage.getItem(`foodie_saved_order_${s}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const bId = parsed?._backendId || parsed?.backendNumericId || parsed?.id;
      if (_isValidNumericId(bId)) return Number(bId);
    }
  } catch (e) { }

  try {
    const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
    const match = (allPlaced || []).find(o =>
      String(o.id || o.order_id || o.order_number || o.orderNumber || '') === s ||
      String(o.order_number || o.orderNumber || '').toUpperCase() === s.toUpperCase()
    );
    if (match) {
      const bId = match._backendId || match.backendNumericId || match.id;
      if (_isValidNumericId(bId)) return Number(bId);
    }
  } catch (e) { }

  // Resolve from backend list
  try {
    const res = await api.get('/orders/');
    const raw = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
    const list = Array.isArray(raw) ? raw : [];
    const match = list.find(o => {
      const oNum = String(o.order_number || o.orderNumber || '').toUpperCase();
      const oId = String(o.id || o.pk || '');
      const search = s.toUpperCase();
      return oNum === search || oId === search || (search.length > 5 && oNum.includes(search)) || (search.length > 5 && search.includes(oNum));
    });
    if (match && _isValidNumericId(match.id || match.pk)) {
      return Number(match.id || match.pk);
    }
  } catch (e) { }

  return null;
};

const mapStatusToFrontend = (status) => {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase().trim();
  if (s === 'placed' || s === 'pending' || s === 'confirmed' || s === 'new' || s === 'ordered' || s === 'created' || s === 'processing') return 'Pending';
  if (s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen') return 'Preparing';
  if (s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup') return 'Ready';
  if (s === 'served' || s === 'serving') return 'Serving';
  if (s === 'delivered' || s === 'completed' || s === 'done' || s === 'settled') return 'Completed';
  if (s === 'cancelled' || s === 'canceled' || s === 'cancel' || s === 'rejected' || s === 'void' || s === 'voided') return 'Cancelled';
  return status;
};

const mapStatusToBackend = (status) => {
  if (!status) return 'CONFIRMED';
  const s = String(status).toUpperCase();
  if (s === 'PENDING' || s === 'CONFIRMED' || s === 'PLACED' || s === 'NEW') return 'CONFIRMED';
  if (s === 'PREPARING' || s === 'ACCEPT' || s === 'ACCEPTED' || s === 'IN_KITCHEN' || s === 'COOKING') return 'PREPARING';
  if (s === 'READY' || s === 'OUT_FOR_DELIVERY' || s === 'PREPARED') return 'READY';
  if (s === 'SERVING' || s === 'SERVED') return 'SERVED';
  if (s === 'DELIVERED' || s === 'COMPLETED' || s === 'DONE' || s === 'SETTLED') return 'COMPLETED';
  if (s === 'CANCELLED' || s === 'CANCELED' || s === 'CANCEL' || s === 'REJECTED') return 'CANCELLED';
  return s;
};

export const getLatestActiveOrder = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) return null;

  const ACTIVE_STATUSES = ['pending', 'confirmed', 'placed', 'new', 'ordered', 'created', 'processing', 'accepted', 'preparing', 'cooking', 'in_kitchen', 'ready', 'prepared', 'out_for_delivery', 'ready_for_pickup', 'served', 'serving'];
  const INACTIVE_STATUSES = ['completed', 'cancelled', 'canceled', 'cancel', 'done', 'settled', 'delivered', 'rejected', 'void', 'voided'];

  const activeOrders = orders.filter(o => {
    if (!o || (!o.id && !o.order_id)) return false;
    const st = String(o.status || '').toLowerCase().trim();
    if (INACTIVE_STATUSES.includes(st)) return false;
    return ACTIVE_STATUSES.includes(st) || !st;
  });

  if (activeOrders.length === 0) return null;

  activeOrders.sort((a, b) => {
    const timeA = Number(a.placedAt || a.rawCreatedAt) || (a.created_at ? new Date(a.created_at).getTime() : 0) || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = Number(b.placedAt || b.rawCreatedAt) || (b.created_at ? new Date(b.created_at).getTime() : 0) || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    if (timeA && timeB && timeA !== timeB) {
      return timeB - timeA;
    }
    const idA = parseInt(String(a.backendNumericId || a.id || a.order_id).replace(/\D/g, ''), 10) || 0;
    const idB = parseInt(String(b.backendNumericId || b.id || b.order_id).replace(/\D/g, ''), 10) || 0;
    return idB - idA;
  });

  return activeOrders[0] || null;
};

const getOrderStatusOverrides = () => {
  try {
    const data = localStorage.getItem('foodie_order_status_overrides');
    if (data) return JSON.parse(data);
  } catch (e) { }
  return {};
};

const getOrderStatusOverride = (id) => {
  if (!id) return null;
  try {
    const overrides = getOrderStatusOverrides();
    const rawId = String(id);
    return overrides[rawId] || null;
  } catch (e) {
    return null;
  }
};

const saveOrderStatusOverride = (id, status) => {
  if (!id) return;
  try {
    const overrides = getOrderStatusOverrides();
    const rawId = String(id);
    overrides[rawId] = status;
    localStorage.setItem('foodie_order_status_overrides', JSON.stringify(overrides));
  } catch (e) { }
};

const getOrderStatusTimestamps = () => {
  try {
    const data = localStorage.getItem('foodie_order_status_timestamps');
    if (data) return JSON.parse(data);
  } catch (e) { }
  return {};
};

const saveOrderStatusTimestamp = (id, status, timestamp = Date.now()) => {
  try {
    const all = getOrderStatusTimestamps();
    const orderKey = String(id);
    if (!all[orderKey]) all[orderKey] = {};
    all[orderKey][status] = timestamp;
    all[orderKey].updatedAt = timestamp;
    localStorage.setItem('foodie_order_status_timestamps', JSON.stringify(all));
  } catch (e) { }
};

const saveOrderPlacedTimestamp = (id, timestamp = Date.now()) => {
  try {
    const all = getOrderStatusTimestamps();
    const orderKey = String(id);
    if (!all[orderKey]) all[orderKey] = {};
    if (!all[orderKey].placedAt) {
      all[orderKey].placedAt = timestamp;
      all[orderKey].Pending = timestamp;
      localStorage.setItem('foodie_order_status_timestamps', JSON.stringify(all));
    }
  } catch (e) { }
};

const getCustomerUser = () => {
  const savedCustomerAuth = sessionStorage.getItem('foodie_auth_customer') || localStorage.getItem('foodie_auth_customer') || sessionStorage.getItem('foodie_auth') || localStorage.getItem('foodie_auth');
  if (savedCustomerAuth) {
    try {
      const parsed = JSON.parse(savedCustomerAuth);
      const userObj = parsed.user || parsed || null;
      if (userObj) return userObj;
    } catch (e) { }
  }
  return null;
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
};

export const getCustomerPhone = () => {
  if (typeof window !== 'undefined') {
    const currentCustomer = getCustomerUser();
    if (currentCustomer) {
      const cPhone = currentCustomer.phone || currentCustomer.customerPhone || currentCustomer.customer_phone || currentCustomer.mobile || currentCustomer.phoneNumber;
      if (cPhone) {
        const clean = normalizePhone(cPhone);
        if (clean) return clean;
      }
      if (currentCustomer.username) {
        const digits = String(currentCustomer.username).replace(/\D/g, '').slice(-10);
        if (digits.length === 10) return digits;
      }
      if (currentCustomer.email) {
        const emailPrefix = String(currentCustomer.email).split('@')[0];
        const digits = emailPrefix.replace(/\D/g, '').slice(-10);
        if (digits.length === 10) return digits;
      }
    }

    const keys = [
      'foodie_customer_phone',
      'foodie_user_phone',
      'foodie_last_phone'
    ];
    for (const k of keys) {
      const p = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (p) {
        const clean = normalizePhone(p);
        if (clean) return clean;
      }
    }

  }

  return null;
};

const getCustomerUserId = () => {
  const customer = getCustomerUser();
  return customer?.id || null;
};

const getLoggedInUserId = () => {
  const savedAuth = sessionStorage.getItem('foodie_auth_customer') || sessionStorage.getItem('foodie_auth_admin');
  if (savedAuth) {
    try {
      const parsed = JSON.parse(savedAuth);
      return parsed.user?.id;
    } catch (e) { }
  }
  return null;
};

const getStableOrderId = (order, fallbackId = '') => {
  if (!order) return fallbackId ? String(fallbackId) : '';
  if (order.id !== undefined && order.id !== null && String(order.id) !== 'undefined' && String(order.id) !== 'null' && String(order.id).trim() !== '') {
    return String(order.id);
  }
  if (order.order_id !== undefined && order.order_id !== null && String(order.order_id) !== 'undefined' && String(order.order_id) !== 'null' && String(order.order_id).trim() !== '') {
    return String(order.order_id);
  }
  if (order.orderId !== undefined && order.orderId !== null && String(order.orderId) !== 'undefined' && String(order.orderId) !== 'null' && String(order.orderId).trim() !== '') {
    return String(order.orderId);
  }
  if (order.pk !== undefined && order.pk !== null && String(order.pk).trim() !== '') {
    return String(order.pk);
  }
  if (order.data?.id) {
    return String(order.data.id);
  }
  if (fallbackId && String(fallbackId).trim() !== '') {
    return String(fallbackId);
  }
  return '';
};

const areOrdersDuplicate = (ordA, ordB) => {
  if (!ordA || !ordB) return false;
  const idA = String(ordA.id || ordA.order_id || ordA.orderId || '').trim();
  const idB = String(ordB.id || ordB.order_id || ordB.orderId || '').trim();

  // If both have non-empty IDs:
  if (idA && idB) {
    if (idA === idB) return true;
    const cleanA = idA.replace(/^(FD|ORD|order_|-)/gi, '').replace(/\D/g, '');
    const cleanB = idB.replace(/^(FD|ORD|order_|-)/gi, '').replace(/\D/g, '');
    if (cleanA && cleanB && cleanA === cleanB) return true;
    // Both have IDs and they are distinctly different -> NOT duplicates!
    return false;
  }

  // Compare table
  const tableA = String(ordA.table || ordA.tableNumber || ordA.table_number || '').replace(/\D/g, '');
  const tableB = String(ordB.table || ordB.tableNumber || ordB.table_number || '').replace(/\D/g, '');
  if (tableA && tableB && tableA !== tableB) return false;

  // Compare total amount
  const totalA = parseFloat(ordA.total || ordA.total_amount || ordA.totalPrice || ordA.amount || 0);
  const totalB = parseFloat(ordB.total || ordB.total_amount || ordB.totalPrice || ordB.amount || 0);
  const totalMatches = Math.abs(totalA - totalB) < 1.0;

  // Compare timestamps if available (within 5 minutes)
  const timeA = Number(ordA.placedAt || ordA.rawCreatedAt) || (ordA.created_at ? new Date(ordA.created_at).getTime() : 0) || (ordA.createdAt ? new Date(ordA.createdAt).getTime() : 0);
  const timeB = Number(ordB.placedAt || ordB.rawCreatedAt) || (ordB.created_at ? new Date(ordB.created_at).getTime() : 0) || (ordB.createdAt ? new Date(ordB.createdAt).getTime() : 0);
  const timeClose = (timeA > 0 && timeB > 0) ? Math.abs(timeA - timeB) < 300000 : true;

  // Compare items
  const itemsA = ordA.items || [];
  const itemsB = ordB.items || [];
  let itemsMatch = false;
  if (itemsA.length > 0 && itemsB.length > 0) {
    const namesA = itemsA.map(i => `${i.name || i.title || ''}x${i.quantity || 1}`.toLowerCase().trim()).sort().join('|');
    const namesB = itemsB.map(i => `${i.name || i.title || ''}x${i.quantity || 1}`.toLowerCase().trim()).sort().join('|');
    if (namesA === namesB) itemsMatch = true;
  }

  return (totalMatches && itemsMatch && timeClose) || (totalMatches && tableA === tableB && timeClose && itemsMatch);
};

const formatOrderObject = (order, allItems = [], allFoods = [], allTables = [], allPayments = [], auditTableMap = {}, fallbackId = '') => {
  const rawDbId = order?.id || order?.order_id || order?.pk;
  if (rawDbId !== undefined && rawDbId !== null && !isNaN(Number(rawDbId)) && Number(rawDbId) > 0) {
    order._backendId = Number(rawDbId);
    order.backendNumericId = Number(rawDbId);
  }

  const orderId = getStableOrderId(order, fallbackId || order?.id || order?.order_id);
  if (orderId) {
    order.id = orderId;
  } else if (fallbackId) {
    order.id = String(fallbackId);
  }

  const rawItemsCandidate = order.items || order.order_items || order.orderItems || order.food_items || order.dishes;
  let parsedRawItems = rawItemsCandidate;
  if (typeof rawItemsCandidate === 'string') {
    try {
      parsedRawItems = JSON.parse(rawItemsCandidate);
    } catch (e) {
      parsedRawItems = [];
    }
  }

  const orderIdCandidates = new Set();
  [orderId, order._backendId, order.backendNumericId, order.id, order.order_id, order.pk, fallbackId].forEach(val => {
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== 'undefined' && String(val) !== 'null') {
      const sVal = String(val).trim();
      orderIdCandidates.add(sVal);
      const digitsOnly = sVal.replace(/\D/g, '');
      if (digitsOnly) orderIdCandidates.add(digitsOnly);
    }
  });

  let orderItems = (Array.isArray(parsedRawItems) && parsedRawItems.length > 0)
    ? parsedRawItems.map(item => {
        if (typeof item === 'string') {
          return { id: item, name: item, quantity: 1, price: 0, instructions: "" };
        }
        const foodId = item.food?.id || item.food_item?.id || item.food || item.food_item || item.food_id || item.id;
        const foodObj = (allFoods || []).find(f => {
          const fId = f.id || f.food_id || f.pk;
          return (foodId && Number(fId) === Number(foodId)) || (item.name && f.name && f.name.toLowerCase() === item.name.toLowerCase());
        });
        return {
          id: item.order_item_id || item.id || item.item_id,
          name: item.name || item.food_name || item.dish_name || (foodObj ? (foodObj.name || foodObj.title) : (typeof item.food === 'object' ? item.food?.name : null)) || 'Dish Item',
          quantity: parseInt(item.quantity || item.qty || 1, 10),
          price: parseFloat(item.unit_price || item.price || (foodObj?.price) || 0),
          instructions: item.special_instructions || item.instructions || "",
          extraIngredients: item.extraIngredients || item.extras || item.toppings || item.customizations || []
        };
      })
    : (allItems || [])
      .filter(item => {
        const rawItemOrder = item.order_id || item.orderId || item.order || item.order_pk;
        let itemOrderId = rawItemOrder;
        if (typeof rawItemOrder === 'object' && rawItemOrder !== null) {
          itemOrderId = rawItemOrder.id || rawItemOrder.order_id || rawItemOrder.pk;
        }
        if (itemOrderId === undefined || itemOrderId === null) return false;
        const sItemOrd = String(itemOrderId).trim();
        const dItemOrd = sItemOrd.replace(/\D/g, '');
        return orderIdCandidates.has(sItemOrd) || (dItemOrd && orderIdCandidates.has(dItemOrd));
      })
      .map(item => {
        const foodId = item.food?.id || item.food_item?.id || item.food || item.food_item || item.food_id;
        const foodObj = (allFoods || []).find(f => {
          const fId = f.id || f.food_id || f.pk;
          return (foodId && Number(fId) === Number(foodId)) || (item.name && f.name && f.name.toLowerCase() === item.name.toLowerCase());
        });
        return {
          id: item.order_item_id || item.id || item.item_id,
          name: item.name || item.food_name || item.dish_name || (foodObj ? (foodObj.name || foodObj.title) : (typeof item.food === 'object' ? item.food?.name : null)) || 'Dish Item',
          quantity: parseInt(item.quantity || item.qty || 1, 10),
          price: parseFloat(item.unit_price || item.price || (foodObj?.price) || 0),
          instructions: item.special_instructions || item.instructions || "",
          extraIngredients: item.extraIngredients || item.extras || item.toppings || item.customizations || []
        };
      });

  if (!orderItems || orderItems.length === 0) {
    try {
      const saved = JSON.parse(localStorage.getItem(`foodie_saved_order_${orderId}`) || 'null');
      if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
        orderItems = saved.items;
      }
    } catch (e) { }
  }

  if (!orderItems || orderItems.length === 0) {
    try {
      const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      const found = (allPlaced || []).find(o => {
        const oId = String(o.id || o.order_id || '').trim();
        const oDigits = oId.replace(/\D/g, '');
        return orderIdCandidates.has(oId) || (oDigits && orderIdCandidates.has(oDigits));
      });
      if (found && Array.isArray(found.items) && found.items.length > 0) {
        orderItems = found.items;
      }
    } catch (e) { }
  }

  let tableObj = null;
  let tableVal = order.table;

  if (tableVal && typeof tableVal === 'object') {
    tableObj = tableVal;
  } else if (tableVal !== null && tableVal !== undefined) {
    tableObj = (allTables || []).find(t => Number(t.id || t.table_id) === Number(tableVal) || String(t.number || t.table_number) === String(tableVal));
  }

  let isExplicitTakeaway = (order.order_type || '').toUpperCase() === 'TAKEAWAY' || order.is_takeaway === true;

  let localTableData = null;
  try {
    const raw = localStorage.getItem(`foodie_order_table_${orderId}`);
    if (raw) localTableData = JSON.parse(raw);
  } catch (e) { }

  const auditTableData = (auditTableMap || {})[String(orderId)];
  const effectiveData = (localTableData && localTableData.tableNumber)
    ? localTableData
    : (auditTableData && auditTableData.tableNumber)
      ? auditTableData
      : null;

  let tableNumber = 'Takeaway';
  let orderType = 'Takeaway';

  if (effectiveData && effectiveData.tableNumber && effectiveData.tableNumber !== 'Takeaway') {
    tableNumber = String(effectiveData.tableNumber);
    orderType = effectiveData.orderType || 'Dining';
  } else if (tableObj) {
    tableNumber = String(tableObj.number || tableObj.table_number || `T0${tableObj.id}`);
    orderType = 'Dining';
  } else if (order.table_number || order.table_no) {
    tableNumber = String(order.table_number || order.table_no);
    orderType = 'Dining';
  } else if (tableVal && tableVal !== null && !isExplicitTakeaway) {
    tableNumber = String(tableVal).startsWith('T') ? String(tableVal) : `T0${tableVal}`;
    orderType = 'Dining';
  } else if (!isExplicitTakeaway) {
    tableNumber = 'T01';
    orderType = 'Dining';
  }

  if (tableNumber && tableNumber !== 'Takeaway') {
    const rawT = String(tableNumber).trim().toUpperCase();
    const cleanT = rawT.replace(/^TABLE\s*/i, '').trim();
    if (cleanT === '1' || cleanT === '01' || cleanT === 'T1' || cleanT === 'T01') tableNumber = 'T01';
    else if (cleanT === '2' || cleanT === '02' || cleanT === 'T2' || cleanT === 'T02') tableNumber = 'T02';
    else if (cleanT === '3' || cleanT === '03' || cleanT === 'T3' || cleanT === 'T03') tableNumber = 'T03';
    else if (cleanT === '4' || cleanT === '04' || cleanT === 'T4' || cleanT === 'T04') tableNumber = 'T04';
  }

  const paymentObj = (allPayments || []).find(p => String(p.order?.id || p.order || p.order_id) === String(orderId));
  let localPaymentMethod = null;
  try {
    const orderPayments = JSON.parse(localStorage.getItem('foodie_order_payments') || '{}');
    localPaymentMethod = orderPayments[orderId] || orderPayments[String(orderId)];
  } catch (e) { }

  let rawPm = (paymentObj && (paymentObj.payment_method || paymentObj.paymentMethod)) ||
    localPaymentMethod ||
    order.paymentMethod ||
    order.payment_method ||
    '';

  rawPm = String(rawPm).toUpperCase();
  let paymentMethod = 'COD';
  if (rawPm === 'UPI' || rawPm.includes('UPI')) {
    paymentMethod = 'UPI';
  } else if (rawPm === 'CREDIT_CARD' || rawPm === 'CARD' || rawPm.includes('CARD')) {
    paymentMethod = 'CARD';
  } else if (rawPm === 'CASH' || rawPm === 'COD' || rawPm.includes('CASH') || rawPm.includes('COD')) {
    paymentMethod = 'COD';
  } else if (rawPm) {
    paymentMethod = rawPm;
  }

  const calculatedSum = orderItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
  const totalItemQty = orderItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0) || 1;
  const subtotal = parseFloat(order.subtotal || order.subTotal || 0) || calculatedSum;
  const isTakeawayOrd = orderType === 'Takeaway' || isExplicitTakeaway || order.packingCharge > 0 || order.packing_charge > 0;
  const packingCharge = parseFloat(order.packing_charge || order.packingCharge || (isTakeawayOrd ? totalItemQty * 15 : 0));
  const discount = parseFloat(order.discount_amount || order.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount) + (isTakeawayOrd ? packingCharge : 0);
  const tax = parseFloat(order.tax_amount || order.tax || 0) || Math.round(taxableAmount * 0.05);
  const deliveryFee = parseFloat(order.delivery_fee || order.deliveryFee || 0);
  let total = parseFloat(order.total_amount || order.totalAmount || order.total || order.totalPrice || order.amount || 0);
  if (!total || total === 0) {
    total = taxableAmount + tax + deliveryFee;
  }

  const statusTimestampsMap = getOrderStatusTimestamps();
  const orderTimestamps = statusTimestampsMap[String(orderId)] || {};

  let rawCreatedAt = null;
  if (order.created_at || order.createdAt) {
    const parsed = new Date(order.created_at || order.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) rawCreatedAt = parsed;
  } else if (orderTimestamps.placedAt) {
    rawCreatedAt = Number(orderTimestamps.placedAt);
  } else if (order.date && order.time) {
    const parsed = new Date(`${order.date} ${order.time}`).getTime();
    if (!isNaN(parsed) && parsed > 0) rawCreatedAt = parsed;
  } else if (order.rawCreatedAt) {
    rawCreatedAt = Number(order.rawCreatedAt);
  }

  if (!rawCreatedAt || isNaN(rawCreatedAt)) {
    rawCreatedAt = Date.now();
  }

  // Ensure placedAt is persisted
  if (!orderTimestamps.placedAt) {
    saveOrderPlacedTimestamp(orderId, rawCreatedAt);
  }

  const dateObj = new Date(rawCreatedAt);
  const date = order.date || dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const time = order.time || dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const overrideStatus = getOrderStatusOverride(orderId) || (order._backendId ? getOrderStatusOverride(String(order._backendId)) : null) || (order.backendNumericId ? getOrderStatusOverride(String(order.backendNumericId)) : null);
  const rawStatus = order.status || order.order_status || overrideStatus;
  const frontendStatus = mapStatusToFrontend(rawStatus);

  if ((order.status || order.order_status) && orderId) {
    saveOrderStatusOverride(orderId, frontendStatus);
    if (order._backendId) saveOrderStatusOverride(String(order._backendId), frontendStatus);
  }

  const statusTimes = {
    Pending: rawCreatedAt,
    ...orderTimestamps
  };
  if (!statusTimes[frontendStatus]) {
    statusTimes[frontendStatus] = orderTimestamps.updatedAt || rawCreatedAt;
  }

  const preparingAt = statusTimes.Preparing || null;
  const readyAt = statusTimes.Ready || null;
  const completedAt = statusTimes.Completed || statusTimes.Serving || null;
  const statusUpdatedAt = orderTimestamps.updatedAt || statusTimes[frontendStatus] || rawCreatedAt;

  const history = [
    { action: "Order Placed", time, operator: "System", message: "Created successfully" }
  ];
  if (frontendStatus === 'Preparing' || frontendStatus === 'Ready' || frontendStatus === 'Serving' || frontendStatus === 'Completed') {
    history.push({ action: "Accepted & Preparing", time, operator: "Kitchen", message: "Chef started cooking" });
  }
  if (frontendStatus === 'Ready' || frontendStatus === 'Serving' || frontendStatus === 'Completed') {
    history.push({ action: "Ready for Pickup", time, operator: "Counter", message: "Food packaged at counter" });
  }
  if (frontendStatus === 'Serving' || frontendStatus === 'Completed') {
    history.push({ action: "Serving to Table", time, operator: "Waiter", message: "Serving to customer" });
  }
  if (frontendStatus === 'Completed') {
    history.push({ action: "Order Completed", time, operator: "Counter", message: "Bill settled successfully" });
  } else if (frontendStatus === 'Cancelled') {
    history.push({ action: "Cancelled", time, operator: "System", message: "Order was cancelled" });
  }

  const voucher = (localTableData && (localTableData.voucher || localTableData.voucherCode)) ||
    (auditTableData && (auditTableData.voucher || auditTableData.voucherCode)) ||
    order.voucher || order.voucher_code || order.coupon || null;

  const rawBackendNumericId = order.id ?? order.order_id ?? order.orderId ?? (order.pk ? String(order.pk) : null);
  const backendNumericId = _isValidNumericId(rawBackendNumericId) ? Number(rawBackendNumericId) : null;
  const orderNumberDisplay = String(backendNumericId || orderId);

  return {
    id: orderId,
    order_number: orderNumberDisplay,
    orderNumber: orderNumberDisplay,
    backendNumericId: backendNumericId,
    _backendId: backendNumericId,
    table: tableNumber,
    orderType,
    items: orderItems,
    subtotal,
    tax,
    deliveryFee,
    discount,
    packingCharge,
    packing_charge: packingCharge,
    voucher,
    voucherCode: voucher,
    coupon: voucher,
    total,
    paymentMethod,
    diners: (localTableData ? localTableData.diners : null) || order.diners || (tableObj ? tableObj.capacity : 2),
    source: orderType === 'Takeaway' ? 'Counter' : 'QR Code',
    status: frontendStatus,
    user: order.user,
    takenBy: (localTableData ? localTableData.takenBy : null) || order.takenBy || order.employee || null,
    restaurant: Number(order.restaurant?.id || order.restaurant_id || order.restaurant || 1),
    restaurant_id: Number(order.restaurant_id || order.restaurant?.id || order.restaurant || 1),
    restaurantId: Number(order.restaurant_id || order.restaurant?.id || order.restaurant || 1),
    special_instructions: order.special_instructions || order.instructions || '',
    date,
    time,
    createdAt: order.created_at || dateObj.toISOString(),
    rawCreatedAt,
    placedAt: rawCreatedAt,
    statusTimes,
    statusUpdatedAt,
    preparingAt,
    readyAt,
    completedAt,
    history
  };
};

export const isOrderOwnedByCustomer = (ord, customerUser) => {
  if (!ord || (!ord.id && !ord.order_id)) return false;

  const currentCustomer = customerUser || getCustomerUser();
  const targetPhone = getCustomerPhone() || (currentCustomer?.phone ? normalizePhone(currentCustomer.phone) : null);
  const targetEmail = currentCustomer?.email ? String(currentCustomer.email).toLowerCase().trim() : null;

  const ordId = String(ord.id || ord.order_id || ord.orderId || '');
  const ordPhone = ord.customerPhone || ord.customer_phone || ord.phone || ord.mobile;
  const normOrdPhone = ordPhone ? normalizePhone(ordPhone) : '';
  const ordEmail = ord.customerEmail || ord.customer_email || ord.email;
  const normOrdEmail = ordEmail ? String(ordEmail).toLowerCase().trim() : '';

  // 1. Phone match
  if (targetPhone) {
    if (normOrdPhone && normOrdPhone === targetPhone) return true;

    if (ordId) {
      try {
        const raw = localStorage.getItem(`foodie_saved_order_${ordId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const locPhone = parsed.phone || parsed.customerPhone || parsed.customer_phone;
          if (locPhone && normalizePhone(locPhone) === targetPhone) return true;
        }
      } catch (e) { }

      try {
        const phoneKey = `foodie_customer_order_ids_${targetPhone}`;
        const phoneOrderIds = JSON.parse(localStorage.getItem(phoneKey) || '[]');
        if (phoneOrderIds.map(String).includes(ordId)) return true;
      } catch (e) { }
    }
  }

  // 2. Email match
  if (targetEmail) {
    if (normOrdEmail && normOrdEmail === targetEmail) return true;
  }

  // Prevent Employee-created orders from leaking to customers via localStorage on shared devices
  const ordEmp = ord.employee || ord.employee_id || ord.employeeId || ord.taken_by || ord.takenBy?.id || ord.takenBy || ord.operator || ord.server;
  if (ordEmp && String(ordEmp) !== 'null' && String(ordEmp) !== 'undefined') {
    return false; // It's an employee's POS order. If phone/email didn't match above, it's not the customer's.
  }

  // 3. Last placed order check
  try {
    const lastPlaced = JSON.parse(sessionStorage.getItem('foodie_last_placed_order') || localStorage.getItem('foodie_last_placed_order') || 'null');
    if (lastPlaced) {
      const lastId = String(lastPlaced.id || lastPlaced.order_id || '');
      if (ordId && lastId && (ordId === lastId || String(ord._backendId || '') === lastId)) return true;
    }
  } catch (e) { }

  // 4. Guest order check
  try {
    const guestIds = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
    if (ordId && guestIds.map(String).includes(ordId)) return true;
  } catch (e) { }

  // 5. Placed orders list in localStorage
  try {
    const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
    if (Array.isArray(allPlaced)) {
      const match = allPlaced.find(p => p && String(p.id || p.order_id) === ordId);
      if (match) {
        const pPhone = match.phone || match.customerPhone || match.customer_phone;
        if (targetPhone && pPhone && normalizePhone(pPhone) === targetPhone) return true;
      }
    }
  } catch (e) { }

  return false;
};

export const orderService = {
  getAllOrders: async (includeDetails = false) => {
    return orderService.getOrders('ALL', includeDetails);
  },

  getOrders: async (userId, includeDetails = false, bypassCache = true, targetDate = null) => {
    const isExplicitAll = userId === 'ALL' || userId === 'all' || userId === '__ALL__';
    const isCurrentPathAdminOrEmployee = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') ||
      window.location.pathname.startsWith('/employee') ||
      window.location.hash.includes('/admin') ||
      window.location.hash.includes('/employee')
    );
    // Strict Admin context: ONLY when explicitly requesting all orders OR when physically on an admin/employee page without a customer userId
    const isAdminContext = isExplicitAll || (isCurrentPathAdminOrEmployee && (!userId || isExplicitAll));

    // 1. Determine customer identity first to filter backend request
    const currentCustomer = getCustomerUser();
    let rawInput = userId && !isExplicitAll ? (typeof userId === 'object' ? (userId.phone || userId.id || '') : String(userId).trim()) : '';
    
    // Extract phone from all potential places
    let targetPhone = getCustomerPhone();
    if (!targetPhone && rawInput) {
      const digits = String(rawInput).replace(/\D/g, '');
      if (digits.length >= 10) {
        targetPhone = normalizePhone(digits);
      }
    }

    const isEmailInput = typeof rawInput === 'string' && rawInput.includes('@');
    const targetEmail = currentCustomer?.email ? String(currentCustomer.email).toLowerCase().trim() : (isEmailInput ? rawInput.toLowerCase().trim() : null);
    const targetUserId = currentCustomer?.id ? String(currentCustomer.id) : (typeof userId === 'object' && userId.id ? String(userId.id) : (!isEmailInput && targetPhone !== rawInput && rawInput ? rawInput : null));

    // Build set of matching backend user IDs for targetPhone/targetEmail/targetUserId
    const matchingUserIds = new Set();

    if (!isAdminContext && (targetPhone || targetEmail || targetUserId)) {
      try {
        const usersRes = await api.get('/users/?page_size=100', bypassCache ? { bypassCache: true } : {}).catch(() => ({ data: [] }));
        const rawUsers = usersRes.data?.data || (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results || []));
        const allUsers = Array.isArray(rawUsers) ? rawUsers : [];

        allUsers.forEach(u => {
          if (!u) return;
          const uPhone = (u.phone || u.phone_number || u.mobile) ? normalizePhone(u.phone || u.phone_number || u.mobile) : '';
          const uEmail = u.email ? String(u.email).toLowerCase().trim() : '';
          const uId = String(u.id);

          if (targetPhone && uPhone && uPhone === targetPhone) {
            matchingUserIds.add(uId);
          }
          if (targetEmail && uEmail && uEmail === targetEmail) {
            matchingUserIds.add(uId);
          }
        });
      } catch (e) { }
    }

    // 2. Fetch backend orders and details in parallel
    let backendOrders = [];
    const clearedBefore = parseInt(localStorage.getItem('foodie_orders_cleared_before') || '0', 10);
    const deletedOrderIds = new Set(JSON.parse(localStorage.getItem('foodie_deleted_order_ids') || '[]').map(String));

    let ordersUrl = '/orders/';
    if (targetDate) {
      ordersUrl += `?date=${targetDate}`;
    }
    const ordersPromise = api.get(ordersUrl, bypassCache ? { bypassCache: true } : {});
    const secondaryPromise = includeDetails ? Promise.all([
      api.get('/order-items/?page_size=100').catch(() => ({ data: [] })),
      api.get('/food/?page_size=100').catch(() => ({ data: [] })),
      api.get('/tables/?page_size=100').catch(() => ({ data: [] })),
      api.get('/payments/?page_size=100').catch(() => ({ data: [] }))
    ]) : Promise.resolve(null);

    let ordersRes = null;
    let secondaryRes = null;
    try {
      [ordersRes, secondaryRes] = await Promise.all([
        ordersPromise.catch(() => ({ data: [] })),
        secondaryPromise
      ]);
      const rawOrders = ordersRes?.data?.data || (Array.isArray(ordersRes?.data) ? ordersRes.data : (ordersRes?.data?.results || []));
      const fetched = Array.isArray(rawOrders) ? rawOrders : [];
      backendOrders = fetched.filter(ord => {
        const id = String(ord.id || ord.order_id || '');
        if (id && deletedOrderIds.has(id)) return false;
        if (clearedBefore > 0) {
          const time = Number(ord.placedAt || ord.rawCreatedAt) || (ord.created_at ? new Date(ord.created_at).getTime() : 0) || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
          if (time > 0 && time <= clearedBefore) return false;
        }
        return true;
      });
    } catch (e) {
      backendOrders = [];
    }

    // Combine orders: Backend is single source of truth
    const allOrdersMap = new Map();

    backendOrders.forEach(ord => {
      const id = String(ord.id || ord.order_id || '');
      if (id) {
        allOrdersMap.set(id, ord);
      }
    });

    let allOrders = Array.from(allOrdersMap.values());
    let filteredOrders = allOrders;

    if (!isAdminContext) {
      let guestOrderIds = new Set();
      try {
        const guestArr = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
        guestArr.forEach(gid => guestOrderIds.add(String(gid)));
      } catch (e) { }

      let localOrdersMap = new Map();
      try {
        const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
        allPlaced.forEach(p => {
          if (p && (p.id || p.order_id)) {
            const pId = String(p.id || p.order_id);
            localOrdersMap.set(pId, p);
          }
        });
      } catch (e) { }

      filteredOrders = allOrders.filter(ord => {
        const ordId = String(ord.id || ord.order_id || '');
        const ordUser = ord.user !== null && ord.user !== undefined ? String(ord.user) : null;
        const ordPhone = ord.customer_phone || ord.customerPhone || ord.phone || ord.customer_mobile || ord.mobile;
        const normOrdPhone = ordPhone ? normalizePhone(ordPhone) : '';

        // 1. STRICT PHONE MATCHING MODE: If a target phone number is set, ONLY return orders matching that phone
        if (targetPhone) {
          if (normOrdPhone && normOrdPhone === targetPhone) return true;
          if (ordUser && matchingUserIds.has(ordUser)) return true;

          const savedLoc = localOrdersMap.get(ordId) || (() => {
            try {
              const raw = localStorage.getItem(`foodie_saved_order_${ordId}`);
              return raw ? JSON.parse(raw) : null;
            } catch (e) { return null; }
          })();

          if (savedLoc) {
            const locPhone = savedLoc.phone || savedLoc.customerPhone || savedLoc.customer_phone;
            if (locPhone && normalizePhone(locPhone) === targetPhone) return true;
          }

          try {
            const phoneKey = `foodie_customer_order_ids_${targetPhone}`;
            const phoneOrderIds = JSON.parse(localStorage.getItem(phoneKey) || '[]');
            if (ordId && phoneOrderIds.includes(ordId)) return true;
          } catch (e) {}

          return false; // MUST EXCLUDE ALL OTHER ORDERS FOR OTHER PHONE NUMBERS
        }

        // 2. NO TARGET PHONE SET: Match strictly by resolved matchingUserIds or guest session order IDs
        if (targetUserId !== 'GUEST' && ordUser && matchingUserIds.has(ordUser)) return true;
        const ordEmail = ord.customer_email || ord.customerEmail || ord.email;
        if (targetEmail && ordEmail && String(ordEmail).toLowerCase().trim() === targetEmail) return true;
        
        // Prevent Employee-created POS orders from leaking into customer views via guestOrderIds
        const ordEmp = ord.employee || ord.employee_id || ord.employeeId || ord.taken_by || ord.takenBy?.id || ord.takenBy || ord.operator || ord.server;
        if (ordEmp && String(ordEmp) !== 'null' && String(ordEmp) !== 'undefined') {
          return false;
        }

        if (ordId && guestOrderIds.has(ordId)) return true;

        return false;
      });

      // Also append any local-only placed orders that match targetPhone/matchingUserIds
      try {
        const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
        allPlaced.forEach(p => {
          if (!p) return;
          const pId = String(p.id || p.order_id || '');
          const alreadyInList = filteredOrders.some(existing => String(existing.id || existing.order_id || '') === pId);
          if (!alreadyInList) {
            const pUser = p.user ? String(p.user) : null;
            const pPhone = p.phone || p.customerPhone || p.customer_phone;
            const matchUser = pUser && matchingUserIds.has(pUser);
            const matchPhone = targetPhone && pPhone && normalizePhone(pPhone) === targetPhone;
            const pEmp = p.employee || p.employee_id || p.employeeId || p.taken_by || p.takenBy?.id || p.takenBy || p.operator || p.server;
            const isEmpOrder = pEmp && String(pEmp) !== 'null' && String(pEmp) !== 'undefined';
            
            const matchGuest = !targetPhone && !targetUserId && !targetEmail && pId && guestOrderIds.has(pId) && !isEmpOrder;
            if (matchUser || matchPhone || matchGuest) {
              filteredOrders.push(p);
            }
          }
        });
      } catch (e) { }
    }

    const [itemsRes, foodsRes, tablesRes, paymentsRes] = secondaryRes || (includeDetails ? await Promise.all([
      api.get('/order-items/?page_size=100').catch(() => ({ data: [] })),
      api.get('/food/?page_size=100').catch(() => ({ data: [] })),
      api.get('/tables/?page_size=100').catch(() => ({ data: [] })),
      api.get('/payments/?page_size=100').catch(() => ({ data: [] }))
    ]) : [null, null, null, null]);

    const extractArr = (res) => res?.data?.data || (Array.isArray(res?.data) ? res.data : (res?.data?.results || []));

    const allItems = extractArr(itemsRes);
    const allFoods = extractArr(foodsRes);
    const allTables = extractArr(tablesRes);
    const allPayments = extractArr(paymentsRes);
    const allAuditLogs = [];

    const auditTableMap = {};
    const createLogs = allAuditLogs.filter(l => l.action === 'CREATE' && l.details);
    const unmappedLogs = [];

    createLogs.forEach((log) => {
      try {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        if (details && details.tableNumber) {
          const oid = details.order_id || log.object_id;
          if (oid) {
            auditTableMap[String(oid)] = details;
          } else {
            unmappedLogs.push(details);
          }
        }
      } catch (e) { }
    });

    if (unmappedLogs.length > 0) {
      const sortedOrders = [...allOrders].sort((a, b) => (b.id || b.order_id) - (a.id || a.order_id));
      sortedOrders.forEach((ord, idx) => {
        const ordId = String(ord.id || ord.order_id);
        if (!auditTableMap[ordId] && unmappedLogs[idx]) {
          auditTableMap[ordId] = unmappedLogs[idx];
        }
      });
    }

    const formattedList = filteredOrders.map(order =>
      formatOrderObject(order, allItems, allFoods, allTables, allPayments, auditTableMap)
    );

    // Sort descending by timestamp so latest previous orders appear first
    formattedList.sort((a, b) => {
      const timeA = Number(a.placedAt || a.rawCreatedAt) || (a.created_at ? new Date(a.created_at).getTime() : 0) || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = Number(b.placedAt || b.rawCreatedAt) || (b.created_at ? new Date(b.created_at).getTime() : 0) || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      const idA = parseInt(String(a.backendNumericId || a.id || a.order_id).replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(String(b.backendNumericId || b.id || b.order_id).replace(/\D/g, ''), 10) || 0;
      return idB - idA;
    });

    return formattedList;
  },

  getOrderById: async (id, includeDetails = true, bypassCache = true) => {
    if (!id || id === 'undefined' || id === 'null' || String(id).trim() === '' || String(id) === 'NaN') {
      return null;
    }

    const idStr = String(id).trim();
    const backendNumId = await _extractBackendOrderId(id);
    const numericIdForApi = backendNumId;

    let savedLocal = null;
    // Removing local storage fallback for logged-in users to enforce backend ownership
    const isAdminRoute = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/employee'));
    const currentCustomer = !isAdminRoute ? (JSON.parse(localStorage.getItem('foodie_auth_customer') || '{}').user || JSON.parse(sessionStorage.getItem('foodie_auth_customer') || '{}').user) : null;
    
    if (!currentCustomer) {
      // Only guests might need local storage fallback if the backend doesn't support guest sessions well
      try {
        const raw = localStorage.getItem(`foodie_saved_order_${idStr}`);
        if (raw) savedLocal = JSON.parse(raw);
      } catch (e) { }

      if (!savedLocal && backendNumId) {
        try {
          const raw = localStorage.getItem(`foodie_saved_order_${backendNumId}`);
          if (raw) savedLocal = JSON.parse(raw);
        } catch (e) { }
      }

      if (!savedLocal && backendNumId) {
        try {
          const raw = localStorage.getItem(`foodie_saved_order_${backendNumId}`);
          if (raw) savedLocal = JSON.parse(raw);
        } catch (e) { }
      }
    }

    let orderRaw = null;
    // Only call the detail endpoint if numericIdForApi looks like a real DB PK.
    // Large numbers (>= 10_000_000) are likely order_numbers, not PKs, and will 404.
    if (numericIdForApi !== null && numericIdForApi > 0 && numericIdForApi < 10000000) {
      try {
        const res = await api.get(`/orders/${numericIdForApi}/`, bypassCache ? { bypassCache: true } : {});
        orderRaw = res.data?.data || res.data;
        // Ensure customer can only see their own order (except when explicitly on order tracking page)
        if (orderRaw) {
          const isAdminRoute = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/employee'));
          const isTrackingRoute = typeof window !== 'undefined' && (window.location.pathname.includes('/order-tracking/') || window.location.pathname.includes('/customer/order-tracking/'));
          if (!isAdminRoute && !isTrackingRoute) {
            const currentCustomer = getCustomerUser();
            const targetUserId = currentCustomer?.id ? String(currentCustomer.id) : null;
            const targetPhone = currentCustomer?.phone ? String(currentCustomer.phone).replace(/\D/g, '').slice(-10) : null;
            
            // Check User ID mismatch
            if (targetUserId && orderRaw.user && String(orderRaw.user) !== targetUserId) {
              return null; // Deny access to other customer's order
            }
            // Check Phone mismatch
            const orderPhone = orderRaw.customerPhone || orderRaw.customer_phone || orderRaw.phone;
            if (targetPhone && orderPhone && String(orderPhone).replace(/\D/g, '').slice(-10) !== targetPhone) {
              return null; // Deny access
            }
            
            // Guest check: If they are a guest, order ID must be in their guest IDs
            if (!targetUserId && !targetPhone) {
              try {
                const guestIds = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
                const oId = String(orderRaw.id || orderRaw.order_id);
                if (!guestIds.includes(String(numericIdForApi)) && !guestIds.includes(Number(numericIdForApi)) && !guestIds.includes(oId)) {
                  // Only deny if it's not a saved local order they made
                  const saved = localStorage.getItem(`foodie_saved_order_${oId}`);
                  if (!saved) {
                    return null; // Deny access to guest trying to view random order
                  }
                }
              } catch (e) {
                return null;
              }
            }
          }
        }
      } catch (e) {
        orderRaw = null;
      }
    }

    if (!orderRaw) {
      if (savedLocal) {
        const overrides = getOrderStatusOverrides();
        const effectiveStatusOverride = overrides[String(id)] || overrides[String(backendNumId)];
        if (effectiveStatusOverride) {
          savedLocal.status = mapStatusToFrontend(effectiveStatusOverride);
        }
        return savedLocal;
      }

      return null;
    }

    if (!includeDetails) {
      const formatted = formatOrderObject(orderRaw, [], [], [], [], {}, id);
      formatted.id = formatted.id || String(id);
      if (savedLocal) {
        if (!formatted.total || Number(formatted.total) === 0) {
          formatted.total = savedLocal.total || savedLocal.total_amount || 0;
        }
        if (!formatted.items || formatted.items.length === 0) {
          formatted.items = savedLocal.items || [];
        }
      }
      try {
        localStorage.setItem(`foodie_saved_order_${id}`, JSON.stringify(formatted));
      } catch (e) { }
      return formatted;
    }

    const [itemsRes, foodsRes, tablesRes, paymentsRes] = await Promise.all([
      api.get('/order-items/?page_size=100').catch(() => ({ data: [] })),
      api.get('/food/?page_size=100').catch(() => ({ data: [] })),
      api.get('/tables/?page_size=100').catch(() => ({ data: [] })),
      api.get('/payments/?page_size=100').catch(() => ({ data: [] }))
    ]);

    const extractArr = (res) => res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));

    const allItems = extractArr(itemsRes);
    const allFoods = extractArr(foodsRes);
    const allTables = extractArr(tablesRes);
    const allPayments = extractArr(paymentsRes);

    const formatted = formatOrderObject(orderRaw, allItems, allFoods, allTables, allPayments, {}, id);
    formatted.id = formatted.id || String(id);
    if (savedLocal) {
      if (!formatted.total || Number(formatted.total) === 0) {
        formatted.total = savedLocal.total || savedLocal.total_amount || 0;
      }
      if (!formatted.items || formatted.items.length === 0) {
        formatted.items = savedLocal.items || [];
      }
      if (!formatted.table || formatted.table === 'Takeaway') {
        formatted.table = savedLocal.table || formatted.table;
      }
    }
    try {
      localStorage.setItem(`foodie_saved_order_${id}`, JSON.stringify(formatted));
    } catch (e) { }
    return formatted;
  },

  placeOrder: async (data) => {
    const customerUser = getCustomerUser();
    const rawUserId = customerUser?.id || getLoggedInUserId() || (data.phone ? normalizePhone(data.phone) : `cust_${Date.now()}`);
    const customerPhone = customerUser?.phone ? normalizePhone(customerUser.phone) : (data.phone ? normalizePhone(data.phone) : null);
    const customerEmail = customerUser?.email || data.email || null;

    let validBackendUserId = null;
    let candidateUserId = null;
    if (typeof rawUserId === 'number' && rawUserId > 0 && rawUserId < 100000) {
      candidateUserId = rawUserId;
    } else if (typeof rawUserId === 'string' && /^\d+$/.test(rawUserId) && Number(rawUserId) < 100000) {
      candidateUserId = Number(rawUserId);
    }

    try {
      const usersRes = await api.get('/users/?page_size=100').catch(() => ({ data: [] }));
      const rawUsers = usersRes.data?.data || (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results || []));
      const allUsers = Array.isArray(rawUsers) ? rawUsers : [];

      if (candidateUserId) {
        const found = allUsers.find(u => Number(u.id) === Number(candidateUserId));
        if (found) validBackendUserId = found.id;
      }
      if (!validBackendUserId && customerPhone) {
        const match = allUsers.find(u => u.phone && normalizePhone(u.phone) === customerPhone);
        if (match && match.id) {
          validBackendUserId = match.id;
        }
      }
    } catch (e) { }

    const itemsTotal = (data.items || []).reduce((sum, i) => sum + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
    const subtotal = parseFloat(data.subtotal || itemsTotal || data.total || 0);

    // Resolve coupon & validate eligibility against subtotal before GST
    let discount = parseFloat(data.discount || 0);
    let validBackendCouponId = null;

    const rawCoupon = data.coupon || data.voucher || data.voucherCode;
    if (rawCoupon) {
      if (typeof rawCoupon === 'object') {
        const minReq = Number(rawCoupon.minOrderValue || rawCoupon.minimum_order_amount || 0);
        if (subtotal >= minReq) {
          if (typeof rawCoupon.id === 'number' && rawCoupon.id < 100000) {
            validBackendCouponId = rawCoupon.id;
          }
        } else {
          discount = 0;
          validBackendCouponId = null;
        }
      } else if (typeof rawCoupon === 'string' && rawCoupon.trim()) {
        const codeUpper = rawCoupon.trim().toUpperCase();
        try {
          let couponsRes = await api.get('/coupons/').catch(() => null);
          if (!couponsRes || !couponsRes.data) {
            couponsRes = await api.get('/admin/coupons/').catch(() => null);
          }
          const rawList = couponsRes?.data?.data || (Array.isArray(couponsRes?.data) ? couponsRes.data : (couponsRes?.data?.results || []));
          const match = (rawList || []).find(c => String(c.code).toUpperCase() === codeUpper);
          if (match) {
            const minReq = parseFloat(match.minimum_order_amount || match.min_order_amount || 0);
            if (subtotal >= minReq) {
              validBackendCouponId = match.id;
            } else {
              discount = 0;
              validBackendCouponId = null;
            }
          }
        } catch (e) {}
      }
    }

    const isTakeaway = !data.tableNumber || String(data.tableNumber).toLowerCase() === 'takeaway' || data.orderType === 'Takeaway';
    const totalItemQty = (data.items || []).reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
    const packingCharge = parseFloat(data.packingCharge || data.packing_charge || (isTakeaway ? totalItemQty * 15 : 0));

    // Ensure discount never exceeds subtotal
    discount = Math.min(Math.max(0, discount), subtotal);
    const taxableAmount = Math.max(0, subtotal - discount) + (isTakeaway ? packingCharge : 0);
    const tax = parseFloat(data.tax || 0) || Math.round(taxableAmount * 0.05);
    const deliveryFee = parseFloat(data.deliveryFee || data.delivery_fee || 0);
    const computedTotal = parseFloat(data.total || data.total_amount || 0) || (taxableAmount + tax + deliveryFee) || itemsTotal;

    const orderType = isTakeaway ? 'TAKEAWAY' : 'DINE_IN';
    const nowIso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ORD-${nowIso}-${randSuffix}`;

    let validBackendTableId = null;
    if (!isTakeaway) {
      if (typeof data.tableId === 'number' && data.tableId > 0) {
        validBackendTableId = data.tableId;
      } else if (typeof data.table === 'number' && data.table > 0) {
        validBackendTableId = data.table;
      } else {
        try {
          const rawTableStr = String(data.tableNumber || data.table || '').toUpperCase().trim();
          const cleanDigits = rawTableStr.replace(/[^0-9]/g, '');
          const tablesRes = await api.get('/tables/').catch(() => ({ data: [] }));
          const rawTables = tablesRes.data?.data || (Array.isArray(tablesRes.data) ? tablesRes.data : (tablesRes.data?.results || []));
          const allTables = Array.isArray(rawTables) ? rawTables : [];

          const foundTable = allTables.find(t => {
            const tNum = String(t.table_number || t.number || '').toUpperCase().trim();
            const tDigits = tNum.replace(/[^0-9]/g, '');
            return tNum === rawTableStr || (cleanDigits && tDigits && parseInt(tDigits, 10) === parseInt(cleanDigits, 10));
          });

          if (foundTable && foundTable.id) {
            validBackendTableId = foundTable.id;
          }
        } catch (e) {
          console.warn("[ORDER SERVICE] Could not resolve table PK from backend tables:", e);
        }
      }
    }

    let targetRestaurantId = 1;
    if (data.restaurant_id || data.restaurant) {
      targetRestaurantId = Number(data.restaurant_id || data.restaurant);
    } else if (typeof window !== 'undefined') {
      const storedBranch = localStorage.getItem('foodie_selected_restaurant_id') || sessionStorage.getItem('foodie_selected_restaurant_id');
      if (storedBranch && !isNaN(Number(storedBranch))) {
        targetRestaurantId = Number(storedBranch);
      }
    }

    const payload = {
      order_number: orderNumber,
      order_type: orderType,
      status: 'CONFIRMED',
      total_amount: String(computedTotal.toFixed(2)),
      subtotal: String(subtotal.toFixed(2)),
      discount_amount: String(discount.toFixed(2)),
      tax_amount: String(tax.toFixed(2)),
      number_of_diners: data.diners || 2,
      restaurant: targetRestaurantId || 1,
      table: validBackendTableId,
      coupon: validBackendCouponId || null,
      customer_phone: customerPhone,
      customerPhone: customerPhone,
      phone: customerPhone,
      customer_email: customerEmail,
      customerEmail: customerEmail
    };

    if (typeof validBackendUserId === 'number' && validBackendUserId > 0) {
      payload.user = validBackendUserId;
    }

    let newOrderId = null;
    let newOrder = null;

    try {
      const res = await api.post('/orders/', payload);
      newOrder = res.data?.data || res.data;
      newOrderId = newOrder?.id || res.data?.id;
      if (!newOrderId || typeof newOrderId !== 'number') {
        throw new Error("Backend did not return a valid numeric order ID.");
      }
    } catch (err) {
      console.warn("[ORDER SERVICE] Primary order creation failed, attempting clean fallback payload:", err.response?.data || err.message);
      try {
        const fallbackPayload = {
          ...payload,
          user: null,
          table: null,
          coupon: null
        };
        const res = await api.post('/orders/', fallbackPayload);
        newOrder = res.data?.data || res.data;
        newOrderId = newOrder?.id || res.data?.id;
        if (!newOrderId || typeof newOrderId !== 'number') {
          throw new Error("Backend fallback did not return a valid numeric order ID.");
        }
      } catch (fallbackErr) {
        console.error("Backend order creation failed after fallback:", fallbackErr.response?.data || fallbackErr.message);
        throw fallbackErr;
      }
    }

    // Save table association locally and post audit log
    const rawTable = data.tableNumber || data.table || 'T01';
    const canonTable = String(rawTable).startsWith('T') ? rawTable : (rawTable === '1' ? 'T01' : (rawTable === '2' ? 'T02' : (rawTable === '3' ? 'T03' : (rawTable === '4' ? 'T04' : `T0${rawTable}`))));
    const orderTableInfo = {
      tableNumber: canonTable,
      orderType: data.orderType || (data.tableNumber && data.tableNumber !== 'Takeaway' ? 'Dining' : 'Takeaway'),
      diners: data.diners || 2,
      voucher: data.voucher || data.voucherCode || data.coupon || null,
      voucherCode: data.voucher || data.voucherCode || data.coupon || null,
      takenBy: data.takenBy || null
    };

    try {
      localStorage.setItem(`foodie_order_table_${newOrderId}`, JSON.stringify(orderTableInfo));
    } catch (e) { }



    // Place all order items resolving exact backend food PKs (food, subtotal, special_instructions)
    let allBackendFoods = [];
    try {
      const foodsRes = await api.get('/food/').catch(() => ({ data: [] }));
      const rawFoods = foodsRes.data?.data || (Array.isArray(foodsRes.data) ? foodsRes.data : (foodsRes.data?.results || []));
      allBackendFoods = Array.isArray(rawFoods) ? rawFoods : [];
    } catch (e) { }

    try {
      await Promise.all(
        (data.items || []).map(async item => {
          let validFoodPk = null;
          const itemNameNorm = String(item.name || item.title || '').trim().toLowerCase();
          const foundFood = allBackendFoods.find(f =>
            (f.name && String(f.name).trim().toLowerCase() === itemNameNorm) ||
            (f.title && String(f.title).trim().toLowerCase() === itemNameNorm) ||
            (f.id && (Number(f.id) === Number(item.id) || Number(f.id) === Number(item.food_id) || Number(f.id) === Number(item._backendId)))
          );

          if (foundFood && (foundFood.id || foundFood.food_id)) {
            validFoodPk = foundFood.id || foundFood.food_id;
          } else if (typeof item.id === 'number' && item.id > 0 && item.id < 100000) {
            validFoodPk = item.id;
          } else if (typeof item.food_id === 'number' && item.food_id > 0 && item.food_id < 100000) {
            validFoodPk = item.food_id;
          } else if (typeof item._backendId === 'number' && item._backendId > 0 && item._backendId < 100000) {
            validFoodPk = item._backendId;
          }

          if (!validFoodPk && allBackendFoods.length > 0) {
            validFoodPk = allBackendFoods[0].id || allBackendFoods[0].food_id;
          }

          if (validFoodPk) {
            await api.post('/order-items/', {
              order: newOrderId,
              food: validFoodPk,
              quantity: parseInt(item.quantity) || 1,
              unit_price: String(parseFloat(item.price || 0).toFixed(2)),
              subtotal: String((parseFloat(item.price || 0) * (parseInt(item.quantity) || 1)).toFixed(2)),
              special_instructions: item.instructions || item.special_instructions || ""
            }).catch(e => {
              console.warn("Order item creation warning:", e.response?.data || e.message);
            });
          }
        })
      );
    } catch (e) { }

    // Create corresponding payment with correct schema (payment_method: CASH/UPI/CARD, status: PENDING/SUCCESS)
    const pmChoice =
      data.paymentMethod === 'CARD'
        ? 'CARD'
        : data.paymentMethod === 'UPI'
          ? 'UPI'
          : 'CASH';

    const paymentPayload = {
      order: newOrderId,
      amount: String(computedTotal.toFixed(2)),
      payment_method: pmChoice,
      status: data.paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS',
      transaction_id: `TXN_${pmChoice}_${Math.floor(100000 + Math.random() * 900000)}`
    };

    try {
      await api.post('/payments/', paymentPayload).catch((e) => {
        console.warn("Payment creation warning:", e.response?.data || e.message);
      });
    } catch (e) {
      console.error("Failed to save payment record:", e);
    }

    try {
      const orderPayments = JSON.parse(localStorage.getItem('foodie_order_payments') || '{}');
      orderPayments[newOrderId] = data.paymentMethod || 'COD';
      localStorage.setItem('foodie_order_payments', JSON.stringify(orderPayments));
    } catch (e) { }

    // Deduct stock quantity in inventory
    try {
      await inventoryService.deductInventoryForOrderItems(data.items);
    } catch (e) { }

    // Automatically mark table as Occupied in backend database
    if (orderTableInfo.tableNumber) {
      try {
        await tableService.occupyTableByNumber(orderTableInfo.tableNumber, newOrderId);
      } catch (e) { }
    }

    try {
      const notifMsg = `New Order #${newOrderId} received! Table: ${orderTableInfo.tableNumber || 'N/A'}, Total: ₹${data.total}`;
      const localNotif = { id: `local_${Date.now()}`, text: notifMsg, read: false, date: new Date().toISOString() };
      const existingRaw = localStorage.getItem('foodie_live_order_notifications');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem('foodie_live_order_notifications', JSON.stringify([localNotif, ...existing].slice(0, 50)));
      clearNotificationCache();
    } catch (e) { }

    try {
      const currentCounts = JSON.parse(localStorage.getItem('foodie_top_selling_dish_counts') || '{}');
      (data.items || []).forEach(it => {
        const fid = Number(it.id || it.item_id);
        const qty = parseInt(it.quantity) || 1;
        if (fid) {
          currentCounts[fid] = (currentCounts[fid] || 0) + qty;
        }
      });
      const topIds = Object.keys(currentCounts)
        .filter(id => (currentCounts[id] || 0) > 0)
        .sort((a, b) => currentCounts[b] - currentCounts[a])
        .slice(0, 5)
        .map(id => parseInt(id));

      localStorage.setItem('foodie_top_selling_dish_counts', JSON.stringify(currentCounts));
      localStorage.setItem('foodie_top_selling_ids', JSON.stringify(topIds));
      window.dispatchEvent(new CustomEvent('foodie_top_selling_updated', { detail: { counts: currentCounts, topFoodIds: topIds } }));
    } catch (e) { }

    const now = Date.now();
    saveOrderStatusOverride(newOrderId, 'Pending');
    saveOrderPlacedTimestamp(newOrderId, now);
    saveOrderStatusTimestamp(newOrderId, 'Pending', now);

    const fallbackResult = {
      id: newOrderId,
      order_number: String(newOrderId),
      orderNumber: String(newOrderId),
      backendNumericId: newOrderId,
      _backendId: newOrderId,
      table: orderTableInfo.tableNumber || 'Takeaway',
      orderType: orderTableInfo.orderType || (isTakeaway ? 'Takeaway' : 'Dining'),
      items: data.items || [],
      subtotal: subtotal,
      packingCharge: packingCharge,
      packing_charge: packingCharge,
      tax: tax,
      deliveryFee: deliveryFee,
      discount: discount,
      voucher: orderTableInfo.voucher,
      total: computedTotal,
      paymentMethod: data.paymentMethod || 'COD',
      diners: orderTableInfo.diners || 2,
      status: 'Pending',
      user: rawUserId,
      customerPhone: customerPhone,
      customer_phone: customerPhone,
      customerEmail: customerEmail,
      customer_email: customerEmail,
      date: new Date(now).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      placedAt: now,
      rawCreatedAt: now,
      statusTimes: { Pending: now }
    };

    try {
      localStorage.setItem(`foodie_saved_order_${newOrderId}`, JSON.stringify(fallbackResult));
      localStorage.setItem('foodie_last_placed_order', JSON.stringify(fallbackResult));
      sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(fallbackResult));

      const existingAll = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      const filteredExisting = existingAll.filter(o => String(o.id || o.order_id) !== String(newOrderId));
      localStorage.setItem('foodie_all_placed_orders', JSON.stringify([fallbackResult, ...filteredExisting]));

      if (customerUser || rawUserId) {
        const userKey = `foodie_customer_order_ids_${rawUserId}`;
        const savedUserIds = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (!savedUserIds.includes(String(newOrderId))) {
          localStorage.setItem(userKey, JSON.stringify([String(newOrderId), ...savedUserIds]));
        }

        if (customerPhone) {
          const normP = normalizePhone(customerPhone);
          if (normP) {
            localStorage.setItem('foodie_customer_phone', normP);
            sessionStorage.setItem('foodie_customer_phone', normP);
            const phoneKey = `foodie_customer_order_ids_${normP}`;
            const savedPhoneIds = JSON.parse(localStorage.getItem(phoneKey) || '[]');
            if (!savedPhoneIds.includes(String(newOrderId))) {
              localStorage.setItem(phoneKey, JSON.stringify([String(newOrderId), ...savedPhoneIds]));
            }
          }
          const phoneKey = `foodie_customer_order_ids_${customerPhone}`;
          const savedPhoneIds = JSON.parse(localStorage.getItem(phoneKey) || '[]');
          if (!savedPhoneIds.includes(String(newOrderId))) {
            localStorage.setItem(phoneKey, JSON.stringify([String(newOrderId), ...savedPhoneIds]));
          }
        }
      } else {
        const guestIds = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
        if (!guestIds.includes(String(newOrderId))) {
          localStorage.setItem('foodie_guest_order_ids', JSON.stringify([String(newOrderId), ...guestIds]));
        }
      }
    } catch (e) { }

    try {
      localStorage.setItem('foodie_last_order_items', JSON.stringify(data.items || []));
      sessionStorage.setItem('foodie_last_order_items', JSON.stringify(data.items || []));
      clearApiCache();
      window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId: newOrderId } }));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) { }

    // Return the formatted order details
    try {
      const orderObj = await orderService.getOrderById(newOrderId);
      if (orderObj) {
        if (!orderObj.total || Number(orderObj.total) === 0) {
          orderObj.total = computedTotal;
        }
        if (!orderObj.items || orderObj.items.length === 0) {
          orderObj.items = (data.items && data.items.length > 0) ? data.items : (fallbackResult.items || []);
        }
        orderObj.status = 'Pending';
        orderObj.order_number = orderObj.order_number || newOrder?.order_number || orderNumber;
        orderObj.orderNumber = orderObj.order_number;
        orderObj.backendNumericId = newOrderId;
        orderObj._backendId = newOrderId;
        try {
          localStorage.setItem(`foodie_saved_order_${newOrderId}`, JSON.stringify(orderObj));
          localStorage.setItem('foodie_last_placed_order', JSON.stringify(orderObj));
          sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(orderObj));
          const existingAll = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
          const filteredExisting = existingAll.filter(o => String(o.id || o.order_id) !== String(newOrderId));
          localStorage.setItem('foodie_all_placed_orders', JSON.stringify([orderObj, ...filteredExisting]));
        } catch (e) { }
        return orderObj;
      }
    } catch (e) {
      console.warn("Could not refetch placed order by ID, returning formatted fallback:", e);
    }

    return fallbackResult;
  },

  updateOrderStatus: async (id, status) => {
    if (!id || id === 'undefined' || id === 'null' || String(id).trim() === '' || String(id) === 'NaN') {
      return { id, status: mapStatusToFrontend(status) };
    }

    const backendStatus = mapStatusToBackend(status);
    const frontendStatus = mapStatusToFrontend(status);
    const now = Date.now();
    const idStr = String(id).trim();
    const backendNumId = await _extractBackendOrderId(id);
    
    // Persist status override
    saveOrderStatusOverride(idStr, frontendStatus);
    if (backendNumId) {
      saveOrderStatusOverride(String(backendNumId), frontendStatus);
    }

    // Persist transition timestamp for FIFO queue ordering
    saveOrderStatusTimestamp(idStr, frontendStatus, now);
    if (backendNumId) {
      saveOrderStatusTimestamp(String(backendNumId), frontendStatus, now);
    }

    // Update in local saved orders immediately
    const saveKeysToTry = [idStr];
    if (backendNumId) saveKeysToTry.push(String(backendNumId));
    for (const key of saveKeysToTry) {
      try {
        const raw = localStorage.getItem(`foodie_saved_order_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.status = frontendStatus;
          parsed.statusUpdatedAt = now;
          if (frontendStatus === 'Preparing') parsed.preparingAt = now;
          if (frontendStatus === 'Ready') parsed.readyAt = now;
          if (frontendStatus === 'Serving' || frontendStatus === 'Completed') parsed.completedAt = now;
          localStorage.setItem(`foodie_saved_order_${key}`, JSON.stringify(parsed));
        }
      } catch (e) { }
    }

    try {
      const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      const updatedAll = allPlaced.map(ord => {
        const match = String(ord.id || ord.order_id || '') === idStr ||
          String(ord.order_number || ord.orderNumber || '') === idStr ||
          (backendNumId && (String(ord.id || ord.order_id || '') === String(backendNumId) || String(ord.backendNumericId || ord._backendId || '') === String(backendNumId)));
        if (match) {
          return {
            ...ord,
            status: frontendStatus,
            statusUpdatedAt: now,
            ...(frontendStatus === 'Preparing' ? { preparingAt: now } : {}),
            ...(frontendStatus === 'Ready' ? { readyAt: now } : {}),
            ...(frontendStatus === 'Serving' || frontendStatus === 'Completed' ? { completedAt: now } : {})
          };
        }
        return ord;
      });
      localStorage.setItem('foodie_all_placed_orders', JSON.stringify(updatedAll));
    } catch (e) { }

    try {
      const lastPlaced = JSON.parse(localStorage.getItem('foodie_last_placed_order') || 'null');
      if (lastPlaced) {
        const match = String(lastPlaced.id || lastPlaced.order_id || '') === idStr ||
          String(lastPlaced.order_number || lastPlaced.orderNumber || '') === idStr ||
          (backendNumId && String(lastPlaced.id || lastPlaced.order_id || '') === String(backendNumId));
        if (match) {
          lastPlaced.status = frontendStatus;
          localStorage.setItem('foodie_last_placed_order', JSON.stringify(lastPlaced));
          sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(lastPlaced));
        }
      }
    } catch (e) { }

    // Only if order was explicitly cancelled or deleted, clear active orderId from associated table
    if (frontendStatus === 'Cancelled') {
      try {
        const meta = JSON.parse(localStorage.getItem('foodie_table_metadata') || '{}');
        let metaChanged = false;
        Object.keys(meta).forEach(k => {
          if (meta[k] && (String(meta[k].orderId) === idStr || (backendNumId && String(meta[k].orderId) === String(backendNumId)))) {
            meta[k].orderId = null;
            meta[k].vacatedAt = now;
            metaChanged = true;
          }
        });
        if (metaChanged) {
          localStorage.setItem('foodie_table_metadata', JSON.stringify(meta));
        }

        const customTables = JSON.parse(localStorage.getItem('foodie_custom_tables') || '[]');
        let customChanged = false;
        const updatedCustom = customTables.map(t => {
          if (t && (String(t.orderId) === idStr || (backendNumId && String(t.orderId) === String(backendNumId)))) {
            customChanged = true;
            return { ...t, orderId: null };
          }
          return t;
        });
        if (customChanged) {
          localStorage.setItem('foodie_custom_tables', JSON.stringify(updatedCustom));
        }

        window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      } catch (e) { }
    }

    try {
      clearApiCache();
    } catch (e) { }

    if (backendNumId !== null && backendNumId > 0) {
      try {
        await api.patch(`/orders/${backendNumId}/`, { status: backendStatus });
      } catch (e) {
        console.warn("Backend order status patch warning:", e.response?.data || e.message);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId: id, status: frontendStatus } }));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) { }

    try {
      const res = await orderService.getOrderById(id);
      if (res) {
        res.status = frontendStatus;
        return res;
      }
      return { id, status: frontendStatus };
    } catch (e) {
      return { id, status: frontendStatus };
    }
  },


  deleteOrder: async (id) => {
    try {
      const stringId = String(id);
      const backendNumId = await _extractBackendOrderId(id);
      const deletedIds = JSON.parse(localStorage.getItem('foodie_deleted_order_ids') || '[]');
      if (!deletedIds.includes(stringId)) {
        deletedIds.push(stringId);
      }
      if (backendNumId && !deletedIds.includes(String(backendNumId))) {
        deletedIds.push(String(backendNumId));
      }
      localStorage.setItem('foodie_deleted_order_ids', JSON.stringify(deletedIds));

      localStorage.removeItem(`foodie_saved_order_${stringId}`);
      localStorage.removeItem(`foodie_order_table_${stringId}`);
      if (backendNumId) {
        localStorage.removeItem(`foodie_saved_order_${backendNumId}`);
        localStorage.removeItem(`foodie_order_table_${backendNumId}`);
      }

      const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      const filtered = allPlaced.filter(o => String(o.id || o.order_id) !== stringId && (!backendNumId || String(o.id || o.order_id) !== String(backendNumId)));
      localStorage.setItem('foodie_all_placed_orders', JSON.stringify(filtered));

      const lastPlaced = JSON.parse(sessionStorage.getItem('foodie_last_placed_order') || localStorage.getItem('foodie_last_placed_order') || 'null');
      if (lastPlaced && (String(lastPlaced.id || lastPlaced.order_id) === stringId || (backendNumId && String(lastPlaced.id || lastPlaced.order_id) === String(backendNumId)))) {
        localStorage.removeItem('foodie_last_placed_order');
        sessionStorage.removeItem('foodie_last_placed_order');
      }

      const overrides = getOrderStatusOverrides();
      overrides[stringId] = 'Cancelled';
      if (backendNumId) overrides[String(backendNumId)] = 'Cancelled';
      localStorage.setItem('foodie_order_status_overrides', JSON.stringify(overrides));

      const targetDeleteId = backendNumId || stringId;
      try {
        await api.delete(`/orders/${targetDeleteId}/`).catch(() => { });
      } catch (e) { }

      window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId: stringId, deleted: true } }));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) {
      console.error("Error deleting order:", e);
    }
  },

  resetAllOrders: () => {
    try {
      const now = Date.now();
      localStorage.setItem('foodie_orders_cleared_before', now.toString());
      localStorage.removeItem('foodie_all_placed_orders');
      localStorage.removeItem('foodie_last_placed_order');
      sessionStorage.removeItem('foodie_last_placed_order');
      localStorage.removeItem('foodie_last_order_items');
      sessionStorage.removeItem('foodie_last_order_items');
      localStorage.removeItem('foodie_guest_order_ids');
      localStorage.removeItem('foodie_customer_order_ids');
      localStorage.removeItem('foodie_order_status_overrides');
      localStorage.removeItem('foodie_order_status_timestamps');
      localStorage.removeItem('foodie_order_payments');
      localStorage.removeItem('foodie_top_selling_dish_counts');
      localStorage.removeItem('foodie_top_selling_ids');
      sessionStorage.removeItem('foodie_cart');
      sessionStorage.removeItem('foodie_guest_cart_unmerged');

      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('foodie_saved_order_') ||
          key.startsWith('foodie_customer_order_ids_') ||
          key.startsWith('foodie_order_table_') ||
          key.startsWith('foodie_order_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      window.dispatchEvent(new CustomEvent('foodie_orders_updated'));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) {
      console.error("Error resetting orders:", e);
    }
  },

  getLatestActiveOrder: (orders) => getLatestActiveOrder(orders)
};

export default orderService;
