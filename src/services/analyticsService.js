import api from './api';
import { orderService } from './orderService';
import { tableService } from './tableService';
import { isPopularProduct } from '../utils/filters';

const _extractArr = (res) => {
  if (!res) return [];
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(res?.data)) return res.data;
  if (res?.data?.results && Array.isArray(res.data.results)) return res.data.results;
  return [];
};

const _isValidNumericId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (s === '' || s === 'undefined' || s === 'null' || s === 'NaN') return false;
  const n = Number(s);
  return !Number.isNaN(n) && Number.isFinite(n);
};

const parseSafeAmount = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const getOrderAmount = (o) => {
  if (!o) return 0;
  const directTotal = parseSafeAmount(o.total ?? o.total_amount ?? o.totalAmount ?? o.amount);
  if (directTotal > 0) return directTotal;

  if (Array.isArray(o.items) && o.items.length > 0) {
    const itemsSum = o.items.reduce((sum, i) => {
      const p = parseSafeAmount(i.price || i.unit_price || 0);
      const q = parseInt(i.quantity, 10) || 1;
      return sum + (p * q);
    }, 0);
    if (itemsSum > 0) {
      const discount = parseSafeAmount(o.discount);
      const taxable = Math.max(0, itemsSum - discount);
      const tax = parseSafeAmount(o.tax) || Math.round(taxable * 0.05);
      const delivery = parseSafeAmount(o.deliveryFee || o.delivery_fee);
      return Math.max(0, taxable + tax + delivery);
    }
  }

  const sub = parseSafeAmount(o.subtotal);
  if (sub > 0) {
    const discount = parseSafeAmount(o.discount);
    const taxable = Math.max(0, sub - discount);
    const tax = parseSafeAmount(o.tax) || Math.round(taxable * 0.05);
    return Math.max(0, taxable + tax);
  }

  return 0;
};

const getOrderDate = (o) => {
  if (!o) return new Date();
  if (o.created_at || o.createdAt) {
    const d = new Date(o.created_at || o.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (o.rawCreatedAt) {
    const d = new Date(Number(o.rawCreatedAt));
    if (!isNaN(d.getTime())) return d;
  }
  if (o.placedAt) {
    const d = new Date(Number(o.placedAt));
    if (!isNaN(d.getTime())) return d;
  }
  if (o.date) {
    const timeStr = o.time || '12:00';
    const d = new Date(`${o.date} ${timeStr}`);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

export const analyticsService = {
  getDashboardBundle: async () => {
    const [allOrdersRaw, allTablesRaw, foodRes, usersRes] = await Promise.all([
      orderService.getAllOrders(true).catch(() => []),
      tableService.getTables().catch(() => []),
      api.get('/food/').catch(() => ({ data: [] })),
      api.get('/users/').catch(() => ({ data: [] }))
    ]);

    const allOrders = Array.isArray(allOrdersRaw) ? allOrdersRaw : [];
    const allTables = Array.isArray(allTablesRaw) ? allTablesRaw : [];
    const allFood = _extractArr(foodRes);

    const now = new Date();
    const todayStr = now.toDateString();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // Helper: Valid, non-failed, non-cancelled orders
    const validOrders = allOrders.filter(o => {
      const payStatus = (o.payment_status || o.paymentStatus || '').toUpperCase();
      const orderStatus = (o.status || o.order_status || '').toUpperCase();
      return payStatus !== 'FAILED' && orderStatus !== 'CANCELLED' && orderStatus !== 'REJECTED';
    });

    // Summary calculations
    const todayOrders = validOrders.filter(o => getOrderDate(o).toDateString() === todayStr);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

    const monthlyOrders = validOrders.filter(o => {
      const d = getOrderDate(o);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

    const curQuarter = Math.floor(now.getMonth() / 3);
    const quarterlyOrders = validOrders.filter(o => {
      const d = getOrderDate(o);
      return Math.floor(d.getMonth() / 3) === curQuarter && d.getFullYear() === curYear;
    });
    const quarterlyRevenue = quarterlyOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

    const yearlyOrders = validOrders.filter(o => getOrderDate(o).getFullYear() === curYear);
    const yearlyRevenue = yearlyOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

    // Pending orders: exactly matching Pending tab in /admin/orders and New Tickets in Kitchen
    const isPendingStatus = (st) => {
      const s = String(st || '').toLowerCase().trim();
      return s === 'pending' || s === 'confirmed' || s === 'placed' || s === 'new' || s === 'ordered' || s === 'created' || !s;
    };
    const pendingOrders = allOrders.filter(o => isPendingStatus(o.status)).length;

    // Active / In Progress orders: Preparing, Ready, Serving, etc.
    const isInProgressStatus = (st) => {
      const s = String(st || '').toLowerCase().trim();
      return s === 'preparing' || s === 'ready' || s === 'serving' || s === 'served' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen' || s === 'out_for_delivery';
    };
    const activeOrders = allOrders.filter(o => isInProgressStatus(o.status)).length;

    // Available tables: synchronized directly with tableService.getTables() from Tables page
    const availableTables = (allTables || []).filter(t => {
      const s = String(t.status || '').trim().toLowerCase();
      return s === 'available' || t.isAvailable === true || t.is_available === true;
    }).length;

    const totalRevenue = validOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

    const summary = {
      totalRevenue: Math.round(totalRevenue),
      todayRevenue: Math.round(todayRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      quarterlyRevenue: Math.round(quarterlyRevenue),
      yearlyRevenue: Math.round(yearlyRevenue),
      pendingOrders,
      activeOrders,
      availableTables
    };

    // Helper to extract numeric millisecond timestamp from order
    const getOrderTimestamp = (o) => {
      if (o.statusUpdatedAt && Number(o.statusUpdatedAt) > 0) return Number(o.statusUpdatedAt);
      if (o.rawCreatedAt && Number(o.rawCreatedAt) > 0) return Number(o.rawCreatedAt);
      if (o.placedAt && Number(o.placedAt) > 0) return Number(o.placedAt);
      if (o.created_at || o.createdAt) {
        const p = new Date(o.created_at || o.createdAt).getTime();
        if (!isNaN(p) && p > 0) return p;
      }
      if (o.date && o.time) {
        const p = new Date(`${o.date} ${o.time}`).getTime();
        if (!isNaN(p) && p > 0) return p;
      }
      return 0;
    };

    // Format human-friendly time based on actual customer order timestamp
    const formatOrderActivityTime = (order, actTime) => {
      const nowMs = now.getTime();
      const diffMs = Math.max(0, nowMs - actTime);
      const minsDiff = Math.round(diffMs / 60000);

      if (minsDiff <= 1) {
        return 'Just now';
      }
      if (minsDiff < 60) {
        return `${minsDiff} mins ago`;
      }

      const orderDate = new Date(actTime);
      const isToday = orderDate.toDateString() === now.toDateString();

      const timeStr = order.time || orderDate.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      if (isToday) {
        const hoursDiff = Math.floor(minsDiff / 60);
        return hoursDiff <= 3 ? `${hoursDiff}h ago` : `Today, ${timeStr}`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (orderDate.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${timeStr}`;
      }

      const dateStr = order.date || orderDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      });
      return `${dateStr}, ${timeStr}`;
    };

    // Recent Activities calculations (sorted by latest activity / creation timestamp)
    const sortedOrders = [...(allOrders || [])]
      .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
      .slice(0, 6);

    const activities = sortedOrders.map(order => {
      const orderId = order.id || order.order_id;
      
      const rawTable = order.table || order.table_number || order.tableNumber;
      let tableName = 'Takeaway';
      if (rawTable) {
        let s = typeof rawTable === 'object' ? (rawTable.number || rawTable.table_number || rawTable.name || '') : String(rawTable);
        s = String(s).trim();
        if (s.toLowerCase().includes('takeaway')) {
          tableName = 'Takeaway';
        } else {
          const digits = s.replace(/\D/g, '');
          tableName = digits ? `T${digits.padStart(2, '0')}` : (s || 'Takeaway');
        }
      }
      
      const actTime = getOrderTimestamp(order) || Date.now();
      const timeAgo = formatOrderActivityTime(order, actTime);

      const status = order.status || 'Pending';
      let message = `Order #${orderId} (${tableName}) was placed`;
      if (status === 'Preparing') {
        message = `Order #${orderId} (${tableName}) is being prepared`;
      } else if (status === 'Ready') {
        message = `Order #${orderId} (${tableName}) is ready for pickup`;
      } else if (status === 'Completed') {
        message = `Order #${orderId} (${tableName}) was served & completed`;
      } else if (status === 'Cancelled') {
        message = `Order #${orderId} (${tableName}) was cancelled`;
      }

      return {
        id: `${orderId}-${status}-${actTime}`,
        orderId: orderId,
        type: 'Order',
        message: message,
        time: timeAgo,
        amount: Math.round(getOrderAmount(order)),
        status: status,
        table: tableName
      };
    });

    // Top Selling Dishes using the exact same rule as Customer Interface
    const dishCounts = {};
    const dishImages = {};

    (allOrders || []).forEach(o => {
      if ((o.status || '').toUpperCase() === 'CANCELLED') return;
      (o.items || []).forEach(item => {
        const foodId = item.id || item.food_item || item.foodId || item.food;
        const qty = parseInt(item.quantity || 1, 10);
        if (foodId) {
          dishCounts[foodId] = (dishCounts[foodId] || 0) + qty;
        }
      });
    });

    const popularFoods = (allFood || []).filter(f => isPopularProduct(f));
    const topDishes = popularFoods.map(foodObj => {
      let foodImg = null;
      if (Array.isArray(foodObj.images) && foodObj.images.length > 0) {
        const p = foodObj.images.find(i => typeof i === 'object' && i.is_primary) || foodObj.images[0];
        foodImg = typeof p === 'string' ? p : (p?.image_url || p?.image || p?.image_path);
      } else {
        foodImg = foodObj.image_url || foodObj.image || foodObj.img || null;
      }

      let image = foodImg;
      if (!image || (typeof image === 'string' && !image.startsWith('http') && !image.startsWith('/'))) {
        image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
      }

      return {
        id: foodObj.id || foodObj.food_id,
        name: foodObj.name,
        count: dishCounts[foodObj.id || foodObj.food_id] || 0,
        image
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

    // Business Performance metrics synchronized with live orders today
    const customersCount = todayOrders.length > 0
      ? new Set(todayOrders.map(o => o.user).filter(Boolean)).size || todayOrders.length
      : 0;
    const ordersCount = todayOrders.length;
    const avgOrderValue = ordersCount > 0 ? Math.round(todayRevenue / ordersCount) : 0;

    const businessStats = {
      customersCount,
      ordersCount,
      avgOrderValue
    };

    return { summary, activities, topDishes, businessStats, allOrders };
  },

  getDashboardSummary: async () => {
    const bundle = await analyticsService.getDashboardBundle();
    return bundle.summary;
  }
};

export default analyticsService;
