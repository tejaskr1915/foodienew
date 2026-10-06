const http = require('http');

const makeReq = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: '192.168.150.171',
      port: 8000,
      path: '/api' + path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.end();
  });
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
  return new Date();
};

const getOrderAmount = (o) => {
  return parseFloat(o.total_amount || o.total || o.amount || 0);
};

(async () => {
  const res = await makeReq('/orders/orders/?page_size=100');
  const allOrders = res.data || res.results || [];
  
  const now = new Date('2026-09-25T13:25:00+05:30');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      label: dayNames[d.getDay()],
      dateStr: d.toDateString(),
      sales: 0,
      count: 0
    });
  }

  const validOrders = allOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'REJECTED');

  validOrders.forEach(o => {
    const oDateStr = getOrderDate(o).toDateString();
    const curMatch = days.find(d => d.dateStr === oDateStr);
    if (curMatch) {
      const val = getOrderAmount(o);
      curMatch.sales += val;
      curMatch.count += 1;
    }
  });

  console.log("Weekly Revenue Breakdown (Last 7 Days):");
  console.table(days);
})();
