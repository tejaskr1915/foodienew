import api from './api';
import { qrService } from './qrService';
import { productService } from './productService';
import { menuService } from './menuService';

const _isValidId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'NaN';
};

const DEFAULT_SEED_TABLES = [
  { id: 1, table_number: 'T01', number: 'T01', name: 'Table T01', capacity: 4, area: 'Indoor Main', status: 'Available', is_available: true, linkedMenus: 'Main Menu' },
  { id: 2, table_number: 'T02', number: 'T02', name: 'Table T02', capacity: 4, area: 'Indoor Main', status: 'Available', is_available: true, linkedMenus: 'Main Menu' },
  { id: 3, table_number: 'T03', number: 'T03', name: 'Table T03', capacity: 4, area: 'Garden View', status: 'Available', is_available: true, linkedMenus: 'Main Menu' },
  { id: 4, table_number: 'T04', number: 'T04', name: 'Table T04', capacity: 4, area: 'Garden View', status: 'Available', is_available: true, linkedMenus: 'Main Menu' }
];

const getDeletedTableIds = () => {
  try {
    const raw = JSON.parse(localStorage.getItem('foodie_deleted_table_ids') || '[]');
    return (raw || []).map(String);
  } catch (e) {
    return [];
  }
};

const saveDeletedTableId = (id, targetNum = null) => {
  try {
    const list = getDeletedTableIds();
    const set = new Set(list.map(String).map(s => s.toUpperCase().trim()));
    if (id !== undefined && id !== null) {
      const sId = String(id).toUpperCase().trim();
      set.add(sId);
      set.add(getCanonicalTableNumber(sId).toUpperCase().trim());
      const idDigits = sId.replace(/\D/g, '');
      if (idDigits) set.add(idDigits);
    }
    if (targetNum) {
      const sNum = String(targetNum).toUpperCase().trim();
      set.add(sNum);
      set.add(getCanonicalTableNumber(sNum).toUpperCase().trim());
      const digits = sNum.replace(/\D/g, '');
      if (digits) {
        set.add(digits);
        const intD = parseInt(digits, 10);
        if (!isNaN(intD)) {
          set.add(intD < 10 ? `0${intD}` : `${intD}`);
        }
      }
    }
    localStorage.setItem('foodie_deleted_table_ids', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Error saving deleted table id:", e);
  }
};

const removeDeletedTableId = (id, targetNum = null) => {
  try {
    const list = getDeletedTableIds();
    const cleanId = String(id || '').toUpperCase().trim();
    const cleanNum = String(targetNum || '').toUpperCase().trim();
    const canonNum = targetNum ? getCanonicalTableNumber(targetNum).toUpperCase().trim() : '';
    const idCanon = id ? getCanonicalTableNumber(id).toUpperCase().trim() : '';

    const targetDigits = targetNum ? parseInt(String(targetNum).replace(/\D/g, '') || '-1', 10) : -1;
    const idDigits = (id && !String(id).startsWith('table_')) ? parseInt(String(id).replace(/\D/g, '') || '-1', 10) : -1;

    const filtered = list.filter(item => {
      const s = String(item).toUpperCase().trim();
      const sCanon = getCanonicalTableNumber(s).toUpperCase().trim();
      const sDigits = parseInt(s.replace(/\D/g, '') || '-2', 10);

      const matchId = cleanId && s === cleanId;
      const matchIdCanon = idCanon && (s === idCanon || sCanon === idCanon);
      const matchNum = cleanNum && s === cleanNum;
      const matchCanon = canonNum && (s === canonNum || sCanon === canonNum);
      const matchTargetDigits = targetDigits !== -1 && sDigits !== -2 && sDigits === targetDigits;
      const matchIdDigits = idDigits !== -1 && sDigits !== -2 && sDigits === idDigits;

      return !(matchId || matchIdCanon || matchNum || matchCanon || matchTargetDigits || matchIdDigits);
    });
    localStorage.setItem('foodie_deleted_table_ids', JSON.stringify(filtered));
  } catch (e) { }
};

const getStoredTableMeta = () => {
  try {
    return JSON.parse(localStorage.getItem('foodie_table_metadata') || '{}');
  } catch (e) {
    return {};
  }
};

const saveStoredTableMeta = (id, number, meta) => {
  try {
    const all = getStoredTableMeta();
    const keyId = String(id);
    const keyNum = number ? String(number).toUpperCase().trim() : null;
    const canonNum = number ? getCanonicalTableNumber(number).toUpperCase().trim() : null;

    all[keyId] = { ...(all[keyId] || {}), ...meta };
    if (keyNum) {
      all[keyNum] = { ...(all[keyNum] || {}), ...meta };
    }
    if (canonNum) {
      all[canonNum] = { ...(all[canonNum] || {}), ...meta };
    }
    localStorage.setItem('foodie_table_metadata', JSON.stringify(all));
  } catch (e) {
    console.error("Error saving table metadata:", e);
  }
};

const deleteStoredTableMeta = (id) => {
  try {
    const all = getStoredTableMeta();
    delete all[String(id)];
    localStorage.setItem('foodie_table_metadata', JSON.stringify(all));
  } catch (e) {
    console.error("Error deleting table metadata:", e);
  }
};

const getCustomTables = () => {
  try {
    return JSON.parse(localStorage.getItem('foodie_custom_tables') || '[]');
  } catch (e) {
    return [];
  }
};

const saveCustomTable = (tableObj, allowCreate = false) => {
  try {
    const list = getCustomTables();
    const objIdStr = String(tableObj.id || '').toUpperCase().trim();
    const objCanon = getCanonicalTableNumber(tableObj.number || tableObj.table_number || '').toUpperCase().trim();

    const existingIndex = list.findIndex(t => {
      const tIdStr = String(t.id || '').toUpperCase().trim();
      const tCanon = getCanonicalTableNumber(t.number || t.table_number || '').toUpperCase().trim();
      return (objIdStr && tIdStr === objIdStr) || (objCanon && tCanon === objCanon);
    });

    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...tableObj };
      localStorage.setItem('foodie_custom_tables', JSON.stringify(list));
    } else if (allowCreate) {
      list.push(tableObj);
      localStorage.setItem('foodie_custom_tables', JSON.stringify(list));
    }
  } catch (e) {
    console.error("Error saving custom table:", e);
  }
};

const deleteCustomTable = (id, tableNum = null) => {
  try {
    const list = getCustomTables();
    const cleanId = String(id || '').toUpperCase().trim();
    const cleanNum = String(tableNum || '').toUpperCase().trim();
    const canonNum = tableNum ? getCanonicalTableNumber(tableNum).toUpperCase().trim() : '';
    const idCanon = id ? getCanonicalTableNumber(id).toUpperCase().trim() : '';
    const targetDigits = (tableNum || id) ? parseInt(String(tableNum || id).replace(/\D/g, '') || '-1', 10) : -1;

    const filtered = list.filter(t => {
      const tId = String(t.id || '').toUpperCase().trim();
      const tNum = String(t.number || t.table_number || '').toUpperCase().trim();
      const tCanon = getCanonicalTableNumber(tNum).toUpperCase().trim();
      const tDigits = parseInt(tNum.replace(/\D/g, '') || '-2', 10);

      const matchId = cleanId && (tId === cleanId || tNum === cleanId);
      const matchNum = cleanNum && (tNum === cleanNum || tId === cleanNum);
      const matchCanon = (canonNum && tCanon === canonNum) || (idCanon && tCanon === idCanon);
      const matchDigits = targetDigits !== -1 && tDigits !== -2 && tDigits === targetDigits;

      return !(matchId || matchNum || matchCanon || matchDigits);
    });
    localStorage.setItem('foodie_custom_tables', JSON.stringify(filtered));
  } catch (e) {
    console.error("Error deleting custom table:", e);
  }
};

const normalizeArea = (rawArea, tableNum) => {
  if (!rawArea) {
    const numStr = String(tableNum || '').toUpperCase();
    if (numStr.includes('5') || numStr.includes('6')) return 'Garden View';
    if (numStr.includes('7') || numStr.includes('8')) return 'Rooftop Terrace';
    return 'Indoor Main';
  }
  const clean = rawArea.trim().toLowerCase();
  if (clean.includes('garden')) return 'Garden View';
  if (clean.includes('rooftop') || clean.includes('terrace')) return 'Rooftop Terrace';
  if (clean.includes('indoor') || clean.includes('main')) return 'Indoor Main';
  return rawArea;
};

const getCanonicalTableNumber = (raw) => {
  if (!raw && raw !== 0) return 'T01';
  let str = String(raw).trim().toUpperCase();
  str = str.replace(/^TABLE[\s-_]*/i, '').trim();

  // If already T followed by digits e.g. T01, T1, T005, T12
  const tDigitsMatch = str.match(/^T0*(\d+)$/i);
  if (tDigitsMatch) {
    const n = parseInt(tDigitsMatch[1], 10);
    return n < 10 ? `T0${n}` : `T${n}`;
  }

  // Pure digits e.g. 1, 01, 2, 02, 10
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    return n < 10 ? `T0${n}` : `T${n}`;
  }

  // If contains digits anywhere e.g. PW-1991, T-5
  const anyDigits = str.match(/\d+/);
  if (anyDigits) {
    const n = parseInt(anyDigits[0], 10);
    return n < 10 ? `T0${n}` : `T${n}`;
  }

  // Fallback to T + string
  return str.startsWith('T') ? str : `T${str}`;
};

const mapTableToFrontend = (t) => {
  const tableId = t.id || t.table_id || t.tableId;
  const meta = getStoredTableMeta();
  const customList = getCustomTables();
  const canonNum = getCanonicalTableNumber(t.number || t.table_number || t.table_no || tableId);
  const custom = customList.find(c => String(c.id) === String(tableId) || getCanonicalTableNumber(c.number || c.table_number) === canonNum) || {};
  const savedMeta = meta[String(tableId)] || (t.number ? meta[String(t.number).toUpperCase().trim()] : {}) || meta[canonNum] || {};

  const rawTableNum = custom.number || savedMeta.number || t.number || (t.table_number !== undefined ? String(t.table_number) : (t.table_no !== undefined ? String(t.table_no) : String(tableId)));
  const tableNum = getCanonicalTableNumber(rawTableNum);

  // Derive status from backend DB as the primary source of truth
  let status = 'Available';
  if (t.status) {
    const s = String(t.status).trim().toUpperCase();
    status = (s === 'OCCUPIED' || s === 'BUSY') ? 'Occupied' : (s === 'RESERVED' ? 'Reserved' : 'Available');
  } else if (t.is_available !== undefined) {
    status = Boolean(t.is_available) ? 'Available' : 'Occupied';
  } else if (custom.status) {
    status = custom.status;
  } else if (savedMeta.status) {
    status = savedMeta.status;
  }

  const isAvail = status === 'Available';
  const rawArea = custom.area || savedMeta.area || t.area;
  const area = normalizeArea(rawArea, tableNum);
  const cap = custom.capacity || savedMeta.capacity || t.capacity || 4;

  return {
    id: tableId,
    table_number: tableNum,
    number: tableNum,
    name: custom.name || savedMeta.name || t.name || `Table ${tableNum}`,
    status: status,
    isAvailable: isAvail,
    is_available: isAvail,
    is_active: t.is_active !== undefined ? Boolean(t.is_active) : (custom.is_active !== undefined ? Boolean(custom.is_active) : true),
    capacity: parseInt(cap, 10),
    area: area,
    linkedMenus: custom.linkedMenus || savedMeta.linkedMenus || t.linkedMenus || 'Main Menu',
    restaurant: t.restaurant || custom.restaurant || 1,
    orderId: status === 'Occupied' ? (custom.orderId || savedMeta.orderId || t.orderId) : undefined,
    reservationName: status === 'Reserved' ? (custom.reservationName || savedMeta.reservationName || t.reservationName) : undefined,
    qr_token: t.qr_token || custom.qr_token || `FOODIE-TABLE-${tableId}`,
    qr_data: t.qr_data || custom.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/customer/welcome?table=${tableId}`)}`,
    qr_is_active: t.qr_is_active !== undefined ? Boolean(t.qr_is_active) : (custom.qr_is_active !== undefined ? Boolean(custom.qr_is_active) : true)
  };
};

export const tableService = {
  getCanonicalTableNumber,
  getTables: async () => {
    try {
      let rawList = [];
      let isBackendSuccess = false;
      try {
        const res = await api.get('/tables/', { bypassCache: true });
        rawList = Array.isArray(res.data?.data)
          ? res.data.data
          : (Array.isArray(res.data) ? res.data : (res.data?.results || []));
        isBackendSuccess = true;
      } catch (e) {
        console.error("Error fetching tables from backend:", e);
      }

      let merged = [];
      const seenNumbers = new Set();

      if (isBackendSuccess && Array.isArray(rawList)) {
        // Backend DB is source of truth for all clients
        const mappedBackend = rawList
          .map(t => ({ ...mapTableToFrontend(t), is_from_backend: true }))
          .filter(Boolean);

        for (const t of mappedBackend) {
          const canon = getCanonicalTableNumber(t.number);
          if (!seenNumbers.has(canon)) {
            seenNumbers.add(canon);
            merged.push(t);
          }
        }
      } else {
        // Offline / network failure fallback mode
        const deletedTableIds = new Set(
          getDeletedTableIds().map(s => String(s).toUpperCase().trim())
        );

        const isDeleted = (t) => {
          if (!t) return true;
          const idStr = String(t.id || '').toUpperCase().trim();
          const numStr = String(t.number || t.table_number || '').toUpperCase().trim();
          const canonNum = getCanonicalTableNumber(numStr || idStr).toUpperCase().trim();
          const idCanon = getCanonicalTableNumber(idStr).toUpperCase().trim();
          const digits = numStr.replace(/\D/g, '');
          const idDigits = !idStr.startsWith('TABLE_') ? idStr.replace(/\D/g, '') : '';

          if (idStr && deletedTableIds.has(idStr)) return true;
          if (numStr && deletedTableIds.has(numStr)) return true;
          if (canonNum && deletedTableIds.has(canonNum)) return true;
          if (idCanon && deletedTableIds.has(idCanon)) return true;
          if (digits && (deletedTableIds.has(digits) || deletedTableIds.has(parseInt(digits, 10) < 10 ? `0${parseInt(digits, 10)}` : `${parseInt(digits, 10)}`))) return true;
          if (idDigits && deletedTableIds.has(idDigits)) return true;

          return false;
        };

        const customList = getCustomTables()
          .map(t => ({ ...mapTableToFrontend(t), is_from_backend: false }))
          .filter(t => t && !isDeleted(t));

        for (const ct of customList) {
          const canon = getCanonicalTableNumber(ct.number);
          if (!seenNumbers.has(canon)) {
            seenNumbers.add(canon);
            merged.push(ct);
          }
        }

        const seedMapped = DEFAULT_SEED_TABLES
          .map(t => ({ ...mapTableToFrontend(t), is_from_backend: false }))
          .filter(t => t && !isDeleted(t));

        for (const st of seedMapped) {
          const canon = getCanonicalTableNumber(st.number);
          if (!seenNumbers.has(canon)) {
            seenNumbers.add(canon);
            merged.push(st);
          }
        }
      }

      // Sort tables consistently (T01, T02, T03...)
      merged.sort((a, b) => {
        const aNum = parseInt(String(a?.number || '').replace(/[^0-9]/g, '') || '0', 10);
        const bNum = parseInt(String(b?.number || '').replace(/[^0-9]/g, '') || '0', 10);
        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) {
          return aNum - bNum;
        }
        return String(a?.number || '').localeCompare(String(b?.number || ''));
      });

      // 3. Dynamic sync with active customer orders (from both backend and local storage)
      try {
        const meta = getStoredTableMeta();
        const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
        const lastPlaced = JSON.parse(sessionStorage.getItem('foodie_last_placed_order') || localStorage.getItem('foodie_last_placed_order') || 'null');
        const orderStatusOverrides = JSON.parse(localStorage.getItem('foodie_order_status_overrides') || '{}');
        const deletedOrderIds = new Set(JSON.parse(localStorage.getItem('foodie_deleted_order_ids') || '[]').map(String));

        const activeOrdersMap = new Map();

        // Fetch live backend orders for cross-device/cross-port occupancy sync
        try {
          const ordersRes = await api.get('/orders/');
          const rawBackendOrders = ordersRes.data?.data || (Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.results || []));
          if (Array.isArray(rawBackendOrders)) {
            rawBackendOrders.forEach(o => {
              const oid = String(o.id || o.order_id || '');
              if (oid && !deletedOrderIds.has(oid)) {
                activeOrdersMap.set(oid, o);
              }
            });
          }
        } catch (e) { }

        if (Array.isArray(allPlaced)) {
          allPlaced.forEach(o => {
            if (o && (o.id || o.order_id)) {
              activeOrdersMap.set(String(o.id || o.order_id), o);
            }
          });
        }
        if (lastPlaced && (lastPlaced.id || lastPlaced.order_id)) {
          activeOrdersMap.set(String(lastPlaced.id || lastPlaced.order_id), lastPlaced);
        }

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('foodie_saved_order_')) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.id || parsed.order_id)) {
                  activeOrdersMap.set(String(parsed.id || parsed.order_id), parsed);
                }
              }
            } catch (e) { }
          }
        }

        const activeOrdersList = Array.from(activeOrdersMap.values());

        activeOrdersList.forEach(ord => {
          const ordId = String(ord.id || ord.order_id || '').trim();
          if (deletedOrderIds.has(ordId)) return;

          const effectiveStatus = orderStatusOverrides[ordId] || ord.order_status || ord.status || '';
          const s = String(effectiveStatus).toLowerCase().trim();
          const isCompletedOrCancelled = s === 'completed' || s === 'cancelled' || s === 'done' || s === 'rejected' || s === 'settled';

          if (!isCompletedOrCancelled) {
            const rawT = String(ord.table_number || ord.table || ord.tableNumber || ord.table_no || '').toUpperCase().trim();
            const rawDigits = rawT.replace(/[^0-9]/g, '');

            if (rawT && rawT !== 'TAKEAWAY') {
              merged.forEach(table => {
                const tDigits = String(table.number || table.table_number || '').replace(/[^0-9]/g, '');
                const tFull = String(table.number || table.table_number || '').toUpperCase().trim();
                const isMatch = (rawDigits && tDigits === rawDigits) || (rawT && tFull === rawT);

                if (isMatch) {
                  const orderPlacedAt = Number(ord.placedAt || ord.rawCreatedAt || 0);
                  const tableMeta = meta[String(table.id)] || meta[String(table.number)] || {};
                  const vacatedAt = Number(tableMeta.vacatedAt || 0);

                  if (orderPlacedAt >= vacatedAt || !vacatedAt) {
                    table.status = 'Occupied';
                    table.isAvailable = false;
                    table.is_available = false;
                    table.orderId = ordId;
                    saveStoredTableMeta(table.id, table.number, { status: 'Occupied', is_available: false, orderId: ordId });
                    saveCustomTable({ ...table, status: 'Occupied', is_available: false, orderId: ordId });
                  }
                }
              });
            }
          }
        });

        // Only clear cancelled or deleted orders from tables; completed orders stay occupied until vacated
        merged.forEach(table => {
          if (table.orderId) {
            const oid = String(table.orderId).trim();
            const effectiveStatus = orderStatusOverrides[oid];
            const s = String(effectiveStatus || '').toLowerCase().trim();
            if (deletedOrderIds.has(oid) || s === 'cancelled') {
              table.orderId = undefined;
              saveStoredTableMeta(table.id, table.number, { orderId: null });
              saveCustomTable({ ...table, orderId: null });
            }
          }
        });
        // If there are no categories or dishes in the menu, all tables should be Available
        try {
          const [categories, dishes] = await Promise.all([
            menuService.getMenus().catch(() => []),
            productService.getProducts(true).catch(() => [])
          ]);

          const hasCategories = (categories || []).length > 0;
          const hasDishes = (dishes || []).length > 0;

          if (!hasCategories || !hasDishes) {
            merged.forEach(table => {
              table.status = 'Available';
              table.isAvailable = true;
              table.is_available = true;
              table.orderId = undefined;
              table.reservationName = undefined;
            });
          }
        } catch (err) {
          console.warn("Error checking menu/categories for table availability:", err);
        }
      } catch (e) {
        console.error("Error syncing active orders to tables:", e);
      }

      return merged.sort((a, b) => {
        const numA = parseInt(String(a?.number || '').replace(/[^0-9]/g, '') || '0', 10);
        const numB = parseInt(String(b?.number || '').replace(/[^0-9]/g, '') || '0', 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a?.number || '').localeCompare(String(b?.number || ''));
      });
    } catch (criticalErr) {
      console.error("Critical error in getTables fallback:", criticalErr);
      return DEFAULT_SEED_TABLES.map(t => ({ ...mapTableToFrontend(t), is_from_backend: false })).filter(Boolean);
    }
  },

  createTable: async (data) => {
    const isAvail = data.status ? String(data.status).toUpperCase() === 'AVAILABLE' : true;
    const rawNum = String(data.number || data.table_number || '').trim();
    const area = normalizeArea(data.area, rawNum);
    const capNum = Math.min(15, Math.max(1, parseInt(data.capacity || 4, 10)));
    const statusVal = isAvail ? 'AVAILABLE' : (data.status ? String(data.status).toUpperCase() : 'AVAILABLE');

    let resData = null;

    // Issue ONE single POST request with exact DRF serializer payload
    try {
      const res = await api.post('/tables/', {
        table_number: rawNum,
        restaurant: 1,
        capacity: capNum,
        status: statusVal,
        is_active: true
      });
      resData = res?.data?.data || res?.data;
    } catch (err) {
      console.error("[TABLE SERVICE] Create table backend error:", err.response?.data || err.message);
      throw err;
    }

    const tableId = resData ? (resData.id || resData.table_id) : `table_${Date.now()}`;
    const finalNumber = rawNum || (resData ? (resData.table_number || resData.number) : '');

    // 1. Save metadata
    saveStoredTableMeta(tableId, finalNumber, {
      number: finalNumber,
      area: area,
      name: data.name || `Table ${finalNumber}`,
      capacity: capNum,
      linkedMenus: data.linkedMenus || 'Main Menu',
      status: data.status || (isAvail ? 'Available' : 'Occupied')
    });

    // 2. Persist to custom tables storage
    saveCustomTable({
      id: tableId,
      table_number: finalNumber,
      number: finalNumber,
      name: data.name || `Table ${finalNumber}`,
      capacity: capNum,
      is_available: isAvail,
      area: area,
      linkedMenus: data.linkedMenus || 'Main Menu',
      status: data.status || (isAvail ? 'Available' : 'Occupied')
    }, true);

    removeDeletedTableId(tableId, finalNumber);

    try {
      window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      localStorage.setItem('foodie_tables_sync_trigger', Date.now().toString());
    } catch (e) { }

    return mapTableToFrontend(resData || {
      id: tableId,
      number: finalNumber,
      table_number: finalNumber,
      is_available: isAvail,
      capacity: capNum,
      area: area,
      name: data.name || `Table ${finalNumber}`,
      linkedMenus: data.linkedMenus || 'Main Menu',
      status: data.status || (isAvail ? 'Available' : 'Occupied')
    });
  },

  updateTable: async (id, data) => {
    const isAvail = data.status ? String(data.status).toUpperCase() === 'AVAILABLE' : true;
    const isReserved = data.status ? String(data.status).toUpperCase() === 'RESERVED' : false;
    const backendStatus = isAvail ? 'AVAILABLE' : (isReserved ? 'RESERVED' : 'OCCUPIED');
    const feStatus = isAvail ? 'Available' : (isReserved ? 'Reserved' : 'Occupied');
    const rawNum = String(data.number || data.table_number || '').trim();
    const numericDigits = rawNum.replace(/[^0-9]/g, '');
    const tableNumInt = numericDigits ? parseInt(numericDigits, 10) : undefined;
    const area = normalizeArea(data.area, rawNum);
    const capNum = Math.min(15, Math.max(1, parseInt(data.capacity || 4, 10)));
    const canonNum = getCanonicalTableNumber(rawNum || (tableNumInt !== undefined ? tableNumInt : id));
    const formattedDigits = tableNumInt !== undefined ? (tableNumInt < 10 ? `0${tableNumInt}` : `${tableNumInt}`) : rawNum;

    let resData = null;

    if (_isValidId(id) && !String(id).startsWith('table_')) {
      const updateStrategies = [
        () => api.patch(`/tables/${id}/`, {
          table_number: formattedDigits,
          capacity: capNum,
          restaurant: 1,
          status: backendStatus,
          is_active: true
        }),
        () => api.patch(`/tables/${id}/`, {
          table_number: canonNum,
          capacity: capNum,
          restaurant: 1,
          status: backendStatus,
          is_active: true
        }),
        () => api.patch(`/tables/${id}/`, {
          table_number: tableNumInt !== undefined ? tableNumInt : rawNum,
          capacity: capNum,
          status: backendStatus
        }),
        () => api.patch(`/tables/${id}/`, {
          capacity: capNum,
          status: backendStatus
        })
      ];

      for (const attempt of updateStrategies) {
        try {
          const res = await attempt();
          const extracted = res?.data?.data || res?.data;
          if (extracted) {
            resData = extracted;
            break;
          }
        } catch (e) { }
      }
    }

    removeDeletedTableId(id, canonNum);

    saveStoredTableMeta(id, canonNum, {
      number: canonNum,
      area: area,
      name: data.name || `Table ${canonNum}`,
      capacity: capNum,
      linkedMenus: data.linkedMenus,
      status: feStatus
    });

    saveCustomTable({
      id: id,
      table_number: canonNum,
      number: canonNum,
      name: data.name || `Table ${canonNum}`,
      capacity: capNum,
      is_available: isAvail,
      area: area,
      linkedMenus: data.linkedMenus,
      status: feStatus
    });

    try {
      window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      localStorage.setItem('foodie_tables_sync_trigger', Date.now().toString());
    } catch (e) { }

    return mapTableToFrontend(resData || { id, ...data, area, number: canonNum, status: backendStatus, is_available: isAvail });
  },

  updateTableStatus: async (id, status) => {
    const isAvail = String(status).toUpperCase() === 'AVAILABLE';
    const isReserved = String(status).toUpperCase() === 'RESERVED';
    const backendStatus = isAvail ? 'AVAILABLE' : (isReserved ? 'RESERVED' : 'OCCUPIED');
    const feStatus = isAvail ? 'Available' : (isReserved ? 'Reserved' : 'Occupied');
    let resData = null;

    if (_isValidId(id) && !String(id).startsWith('table_')) {
      try {
        const res = await api.patch(`/tables/${id}/`, {
          is_available: isAvail,
          status: backendStatus
        });
        resData = res?.data?.data || res?.data;
      } catch (e) {
        console.warn("Backend updateTableStatus fallback:", e);
      }
    }

    const now = Date.now();
    const clearActive = isAvail ? { orderId: null, reservationName: null, vacatedAt: now } : {};
    saveStoredTableMeta(id, null, { status: feStatus, is_available: isAvail, ...clearActive });
    saveCustomTable({
      id: id,
      is_available: isAvail,
      status: feStatus,
      ...clearActive
    });

    try {
      window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      localStorage.setItem('foodie_tables_sync_trigger', Date.now().toString());
    } catch (e) { }

    return mapTableToFrontend(resData || { id, is_available: isAvail, status: backendStatus, ...clearActive });
  },

  vacateTable: async (id) => {
    return tableService.updateTableStatus(id, 'Available');
  },

  deleteTable: async (id, tableNum = null) => {
    let targetNum = tableNum;
    if (!targetNum) {
      const meta = getStoredTableMeta();
      targetNum = meta[String(id)]?.number;
    }

    try {
      if (_isValidId(id) && !String(id).startsWith('table_')) {
        await api.delete(`/tables/${id}/`).catch(() => { });
      }
      const res = await api.get('/tables/');
      const rawList = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : (res.data?.results || []));
      const canonTarget = getCanonicalTableNumber(targetNum || id);
      const targetDigits = (targetNum || id) ? String(targetNum || id).replace(/\D/g, '') : '';
      const toDelete = rawList.filter(t => {
        const tCanon = getCanonicalTableNumber(t.table_number || t.number);
        const tDigits = String(t.table_number || t.number || '').replace(/\D/g, '');
        return (
          String(t.id) === String(id) ||
          tCanon === canonTarget ||
          String(t.table_number || t.number) === String(id) ||
          String(t.table_number || t.number) === String(targetNum) ||
          (targetDigits && tDigits && targetDigits === tDigits)
        );
      });
      for (const t of toDelete) {
        if (_isValidId(t.id)) {
          await api.delete(`/tables/${t.id}/`).catch(() => { });
        }
      }
    } catch (e) {
      if (_isValidId(id) && !String(id).startsWith('table_')) {
        try {
          await api.delete(`/tables/${id}/`).catch(() => { });
        } catch (err) { }
      }
    }

    saveDeletedTableId(id, targetNum);
    deleteStoredTableMeta(id);
    if (targetNum) {
      deleteStoredTableMeta(targetNum);
    }
    deleteCustomTable(id, targetNum);

    try {
      window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      localStorage.setItem('foodie_tables_sync_trigger', Date.now().toString());
    } catch (e) { }

    return true;
  },

  occupyTable: async (tableNum, orderId = null) => {
    return tableService.occupyTableByNumber(tableNum, orderId);
  },

  occupyTableByNumber: async (tableNum, orderId = null) => {
    if (!tableNum || String(tableNum).toUpperCase() === 'TAKEAWAY') return;
    try {
      const targetFullStr = String(tableNum).toUpperCase().trim();
      const targetClean = targetFullStr.replace(/^TABLE\s*/i, '');
      const targetDigits = targetFullStr.replace(/[^0-9]/g, '');

      const allTables = await tableService.getTables();
      const found = allTables.find(t => {
        const fullStr = String(t.number || t.table_number || '').toUpperCase().trim();
        const cleanStr = fullStr.replace(/^TABLE\s*/i, '');
        const numDigits = fullStr.replace(/[^0-9]/g, '');
        return fullStr === targetFullStr || cleanStr === targetClean || (targetDigits && numDigits === targetDigits);
      });

      if (found) {
        saveStoredTableMeta(found.id, found.number, { status: 'Occupied', is_available: false, ...(orderId ? { orderId: String(orderId) } : {}) });
        saveCustomTable({ ...found, status: 'Occupied', is_available: false, ...(orderId ? { orderId: String(orderId) } : {}) });
        if (_isValidId(found.id) && !String(found.id).startsWith('table_') && found.is_from_backend) {
          try {
            await api.patch(`/tables/${found.id}/`, {
              is_available: false,
              status: 'OCCUPIED'
            });
          } catch (e) {
            // Silently handle backend table patch 404 or network warning
          }
        }
      }

      window.dispatchEvent(new CustomEvent('foodie_tables_updated'));
      localStorage.setItem('foodie_tables_sync_trigger', Date.now().toString());
    } catch (e) {
      // Fail safely in background without throwing
    }
  },

  // QR Code operations
  getQRCodes: async () => {
    return qrService.getQRCodes();
  },

  getQRCodeById: async (id) => {
    return qrService.getQRCodeById(id);
  },

  getQRCodeByTableId: async (tableId) => {
    return qrService.getQRCodeByTableId(tableId);
  },

  createQRCode: async (data) => {
    return qrService.createQRCode(data);
  },

  updateQRCode: async (id, data) => {
    return qrService.updateQRCode(id, data);
  },

  toggleQRCodeStatus: async (id, currentStatus) => {
    return qrService.toggleQRCodeStatus(id, currentStatus);
  },

  getCanonicalTableNumber: (raw) => {
    return getCanonicalTableNumber(raw);
  }
};

export default tableService;
