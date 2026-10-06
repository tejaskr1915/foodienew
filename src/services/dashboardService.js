import api from './api';
import { orderService } from './orderService';

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

export const dashboardService = {
  getRevenueDetails: async (period = 'Weekly', ordersArray = null) => {
    let allOrders = [];
    if (Array.isArray(ordersArray) && ordersArray.length > 0) {
      allOrders = ordersArray;
    } else {
      try {
        allOrders = await orderService.getAllOrders(true);
      } catch (e) {
        try {
          const res = await api.get('/orders/');
          const raw = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
          allOrders = Array.isArray(raw) ? raw : [];
        } catch (err) {
          allOrders = [];
        }
      }
    }

    const now = new Date();
    
    let revenuePeriod = "Weekly Revenue";
    let revenueAmount = 0;
    let comparison = "vs last week";
    let previousPeriodAmount = 0;
    let percentageChange = "+0.0%";
    let revenueData = [];

    // Helper for grouping and filtering successful/non-cancelled orders
    const successfulOrders = allOrders.filter(o => {
      const payStatus = (o.payment_status || o.paymentStatus || '').toUpperCase();
      const orderStatus = (o.status || o.order_status || '').toUpperCase();
      return payStatus !== 'FAILED' && orderStatus !== 'CANCELLED' && orderStatus !== 'REJECTED';
    });

    const normalizedPeriod = (period || '').toLowerCase();

    if (normalizedPeriod.includes('today') || normalizedPeriod.includes('daily')) {
      revenuePeriod = "Today's Revenue";
      const todayStr = now.toDateString();
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterdayStr = yesterdayDate.toDateString();

      const todayOrders = successfulOrders.filter(o => getOrderDate(o).toDateString() === todayStr);
      const yesterdayOrders = successfulOrders.filter(o => getOrderDate(o).toDateString() === yesterdayStr);

      revenueAmount = todayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      previousPeriodAmount = yesterdayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      comparison = "vs yesterday";

      // 8 time slots from 8 AM to 10 PM
      const slots = [
        { label: '8 AM', minHour: 8, maxHour: 9 },
        { label: '10 AM', minHour: 10, maxHour: 11 },
        { label: '12 PM', minHour: 12, maxHour: 13 },
        { label: '2 PM', minHour: 14, maxHour: 15 },
        { label: '4 PM', minHour: 16, maxHour: 17 },
        { label: '6 PM', minHour: 18, maxHour: 19 },
        { label: '8 PM', minHour: 20, maxHour: 21 },
        { label: '10 PM', minHour: 22, maxHour: 23 }
      ];

      revenueData = slots.map(s => ({ label: s.label, value: 0, sales: 0, count: 0 }));

      todayOrders.forEach(o => {
        const orderDate = getOrderDate(o);
        const hr = orderDate.getHours();
        let slotIdx = Math.floor((hr - 8) / 2);
        if (slotIdx < 0) slotIdx = 0;
        if (slotIdx >= slots.length) slotIdx = slots.length - 1;
        const val = getOrderAmount(o);
        revenueData[slotIdx].value += val;
        revenueData[slotIdx].sales += val;
        revenueData[slotIdx].count += 1;
      });
    } else if (normalizedPeriod.includes('week')) {
      revenuePeriod = "Weekly Revenue";
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Last 7 days ending today
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push({
          label: dayNames[d.getDay()],
          dateStr: d.toDateString(),
          value: 0,
          sales: 0,
          count: 0
        });
      }

      // Previous 7 days
      const prev7Days = [];
      for (let i = 13; i >= 7; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        prev7Days.push({ dateStr: d.toDateString(), sales: 0 });
      }

      successfulOrders.forEach(o => {
        const oDateStr = getOrderDate(o).toDateString();
        const curMatch = days.find(d => d.dateStr === oDateStr);
        const val = getOrderAmount(o);
        if (curMatch) {
          curMatch.value += val;
          curMatch.sales += val;
          curMatch.count += 1;
          revenueAmount += val;
        }
        const prevMatch = prev7Days.find(d => d.dateStr === oDateStr);
        if (prevMatch) {
          previousPeriodAmount += val;
        }
      });

      comparison = "vs last week";
      revenueData = days;
    } else if (normalizedPeriod.includes('quarter')) {
      revenuePeriod = "Quarterly Revenue";
      const curQuarter = Math.floor(now.getMonth() / 3);
      const curYear = now.getFullYear();

      const prevQuarter = curQuarter === 0 ? 3 : curQuarter - 1;
      const prevQuarterYear = curQuarter === 0 ? curYear - 1 : curYear;

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const qStartMonth = curQuarter * 3;
      
      revenueData = [
        { label: monthNames[qStartMonth] || 'Month 1', value: 0, sales: 0, count: 0 },
        { label: monthNames[qStartMonth + 1] || 'Month 2', value: 0, sales: 0, count: 0 },
        { label: monthNames[qStartMonth + 2] || 'Month 3', value: 0, sales: 0, count: 0 }
      ];

      const curQuarterOrders = successfulOrders.filter(o => {
        const d = getOrderDate(o);
        return Math.floor(d.getMonth() / 3) === curQuarter && d.getFullYear() === curYear;
      });

      const prevQuarterOrders = successfulOrders.filter(o => {
        const d = getOrderDate(o);
        return Math.floor(d.getMonth() / 3) === prevQuarter && d.getFullYear() === prevQuarterYear;
      });

      revenueAmount = curQuarterOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      previousPeriodAmount = prevQuarterOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      curQuarterOrders.forEach(o => {
        const m = getOrderDate(o).getMonth();
        const monthIdx = m % 3;
        const val = getOrderAmount(o);
        if (revenueData[monthIdx]) {
          revenueData[monthIdx].value += val;
          revenueData[monthIdx].sales += val;
          revenueData[monthIdx].count += 1;
        }
      });

      comparison = "vs last quarter";
    } else if (normalizedPeriod.includes('year')) {
      revenuePeriod = "Yearly Revenue";
      const curYear = now.getFullYear();
      const prevYear = curYear - 1;

      revenueData = [
        { label: 'Q1', value: 0, sales: 0, count: 0 },
        { label: 'Q2', value: 0, sales: 0, count: 0 },
        { label: 'Q3', value: 0, sales: 0, count: 0 },
        { label: 'Q4', value: 0, sales: 0, count: 0 }
      ];

      const curYearOrders = successfulOrders.filter(o => getOrderDate(o).getFullYear() === curYear);
      const prevYearOrders = successfulOrders.filter(o => getOrderDate(o).getFullYear() === prevYear);

      revenueAmount = curYearOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      previousPeriodAmount = prevYearOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      curYearOrders.forEach(o => {
        const m = getOrderDate(o).getMonth();
        const qIdx = Math.floor(m / 3);
        const val = getOrderAmount(o);
        if (revenueData[qIdx]) {
          revenueData[qIdx].value += val;
          revenueData[qIdx].sales += val;
          revenueData[qIdx].count += 1;
        }
      });

      comparison = "vs last year";
    } else {
      // Default: Monthly
      revenuePeriod = "Monthly Revenue";
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();

      const prevMonthDate = new Date(now);
      prevMonthDate.setMonth(now.getMonth() - 1);
      const prevMonth = prevMonthDate.getMonth();
      const prevMonthYear = prevMonthDate.getFullYear();

      const curMonthOrders = successfulOrders.filter(o => {
        const d = getOrderDate(o);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });

      const prevMonthOrders = successfulOrders.filter(o => {
        const d = getOrderDate(o);
        return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
      });

      revenueAmount = curMonthOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      previousPeriodAmount = prevMonthOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      comparison = "vs last month";

      revenueData = [
        { label: 'Week 1', value: 0, sales: 0, count: 0 },
        { label: 'Week 2', value: 0, sales: 0, count: 0 },
        { label: 'Week 3', value: 0, sales: 0, count: 0 },
        { label: 'Week 4', value: 0, sales: 0, count: 0 }
      ];

      curMonthOrders.forEach(o => {
        const date = getOrderDate(o).getDate();
        const weekIdx = Math.min(3, Math.floor((date - 1) / 7));
        const val = getOrderAmount(o);
        revenueData[weekIdx].value += val;
        revenueData[weekIdx].sales += val;
        revenueData[weekIdx].count += 1;
      });
    }

    // Exact Rounding
    revenueAmount = Math.round(revenueAmount);
    previousPeriodAmount = Math.round(previousPeriodAmount);
    revenueData = revenueData.map(d => ({
      ...d,
      value: Math.round(d.value || d.sales || 0),
      sales: Math.round(d.sales || d.value || 0)
    }));

    // Real percentage change calculation
    if (previousPeriodAmount > 0) {
      const pct = ((revenueAmount - previousPeriodAmount) / previousPeriodAmount) * 100;
      percentageChange = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
    } else if (revenueAmount > 0) {
      percentageChange = "+100%";
    } else {
      percentageChange = "+0.0%";
    }

    return {
      revenuePeriod,
      revenueAmount,
      comparison,
      previousPeriod: previousPeriodAmount,
      percentageChange,
      revenueData
    };
  }
};

export default dashboardService;
