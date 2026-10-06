const getLatestActiveOrder = (orders) => {
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

console.log('--- Running getLatestActiveOrder Unit Tests ---');

// Test 1: No orders
const t1 = getLatestActiveOrder([]);
console.log('Test 1 (Empty list):', t1 === null ? 'PASS' : 'FAIL', t1);

// Test 2: One active order
const t2Orders = [
  { id: 43, status: 'PENDING', created_at: '2026-09-11T10:00:00Z' }
];
const t2 = getLatestActiveOrder(t2Orders);
console.log('Test 2 (One active order #43):', t2?.id === 43 ? 'PASS' : 'FAIL', t2?.id);

// Test 3: Multiple active orders (#41 PENDING, #42 PREPARING, #43 READY)
const t3Orders = [
  { id: 41, status: 'PENDING', created_at: '2026-09-11T10:00:00Z' },
  { id: 42, status: 'PREPARING', created_at: '2026-09-11T10:30:00Z' },
  { id: 43, status: 'READY', created_at: '2026-09-11T11:00:00Z' }
];
const t3 = getLatestActiveOrder(t3Orders);
console.log('Test 3 (Latest active #43 chosen among #41, #42, #43):', t3?.id === 43 ? 'PASS' : 'FAIL', t3?.id);

// Test 4: Active + Completed (#40 COMPLETED, #41 PREPARING, #42 COMPLETED)
const t4Orders = [
  { id: 40, status: 'COMPLETED', created_at: '2026-09-11T09:00:00Z' },
  { id: 41, status: 'PREPARING', created_at: '2026-09-11T10:00:00Z' },
  { id: 42, status: 'COMPLETED', created_at: '2026-09-11T11:00:00Z' }
];
const t4 = getLatestActiveOrder(t4Orders);
console.log('Test 4 (Active #41 chosen, ignoring completed #40 and #42):', t4?.id === 41 ? 'PASS' : 'FAIL', t4?.id);

// Test 5: All Completed (#40 COMPLETED, #41 COMPLETED)
const t5Orders = [
  { id: 40, status: 'COMPLETED', created_at: '2026-09-11T09:00:00Z' },
  { id: 41, status: 'COMPLETED', created_at: '2026-09-11T10:00:00Z' }
];
const t5 = getLatestActiveOrder(t5Orders);
console.log('Test 5 (All completed returns null):', t5 === null ? 'PASS' : 'FAIL', t5);

// Test 6: Latest completes (#41 PREPARING, #42 becomes COMPLETED)
const t6Orders = [
  { id: 41, status: 'PREPARING', created_at: '2026-09-11T10:00:00Z' },
  { id: 42, status: 'COMPLETED', created_at: '2026-09-11T11:00:00Z' }
];
const t6 = getLatestActiveOrder(t6Orders);
console.log('Test 6 (After #42 completes, #41 is chosen):', t6?.id === 41 ? 'PASS' : 'FAIL', t6?.id);
