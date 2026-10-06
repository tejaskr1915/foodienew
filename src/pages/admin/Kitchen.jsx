import React, { useContext, useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import { OrderContext } from '../../context/OrderContext';
import { AuthContext } from '../../context/AuthContext';
import { branchService } from '../../services/branchService';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import EBillModal from '../../components/orders/EBillModal';
import api from '../../services/api';

export const Kitchen = () => {
  const { orders, loading, updateStatus, fetchOrders } = useContext(OrderContext);
  const { user } = useContext(AuthContext);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingAction, setUpdatingAction] = useState(null);
  const [eBillOrder, setEBillOrder] = useState(null);
  const [branches, setBranches] = useState([]);
  
  // States for live ticket details
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [liveTicketItems, setLiveTicketItems] = useState({});

  const isWaiter = user?.role === 'employee' && (
    String(user?.designation || '').toLowerCase().includes('waiter') ||
    String(user?.department || '').toLowerCase().includes('dining')
  );
  const [showAllOrders, setShowAllOrders] = useState(!isWaiter);

  // Determine initial branch from user's assigned branch or fallback to main branch
  const userAssignedBranch = user?.restaurant || user?.restaurant_id || null;
  const isBranchRestricted = Boolean(userAssignedBranch && user?.role !== 'super_admin' && user?.role !== 'admin');
  const [selectedBranch, setSelectedBranch] = useState(userAssignedBranch ? String(userAssignedBranch) : '');

  const isBranchUnderConstruction = (b) => {
    if (!b) return false;
    const status = String(b.status || b.construction_status || '').toLowerCase().trim();
    if (status.includes('construction') || status.includes('renovation')) return true;
    if (b.is_under_construction === true) return true;
    if (b.is_active === false) return true;
    return false;
  };

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await branchService.getBranches();
        const branchList = Array.isArray(data) ? data : [];
        setBranches(branchList);
        const activeMainBranch = branchList.find(b => b.isMainBranch && !isBranchUnderConstruction(b)) || branchList.find(b => !isBranchUnderConstruction(b)) || branchList[0];
        if (activeMainBranch) {
          setSelectedBranch(prev => {
            const currentObj = branchList.find(b => String(b.id) === String(prev));
            if (currentObj && !isBranchUnderConstruction(currentObj)) {
              return prev;
            }
            return String(activeMainBranch.id);
          });
        }
      } catch (e) {
        console.error("Error loading branches in Kitchen:", e);
      }
    };

    loadBranches();

    const handleBranchesUpdate = () => {
      loadBranches();
    };

    window.addEventListener('foodie_branches_updated', handleBranchesUpdate);
    return () => {
      window.removeEventListener('foodie_branches_updated', handleBranchesUpdate);
    };
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    fetchOrders(false);

    const handleSync = () => {
      fetchOrders(false);
    };

    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('foodie_tables_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('foodie_tables_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleAction = async (id, status) => {
    if (updatingId === id) return;
    setUpdatingId(id);
    setUpdatingAction(status);
    try {
      await updateStatus(id, status);
    } catch (e) {
      console.error("Failed to update kitchen status:", e);
    }
    setUpdatingId(null);
    setUpdatingAction(null);
  };

  const handleReject = async (id) => {
    if (updatingId === id) return;
    if (window.confirm("Are you sure you want to reject this order?")) {
      setUpdatingId(id);
      setUpdatingAction('reject');
      try {
        await updateStatus(id, 'Cancelled');
        if (typeof fetchOrders === 'function') await fetchOrders(false);
      } catch (e) {
        console.error("Failed to reject order:", e);
      } finally {
        setUpdatingId(null);
        setUpdatingAction(null);
      }
    }
  };

  const fetchedDetailsRef = React.useRef(new Set());

  const fetchTicketDetails = async (ordId) => {
    if (fetchedDetailsRef.current.has(ordId)) return;
    fetchedDetailsRef.current.add(ordId);
    setLoadingDetailsId(ordId);
    try {
      const [itemsRes, foodsRes] = await Promise.all([
        api.get(`/order-items/?order=${ordId}`).catch(()=>({data:[]})),
        api.get(`/food/?page_size=100`).catch(()=>({data:[]}))
      ]);
      const items = itemsRes.data?.data || itemsRes.data?.results || itemsRes.data || [];
      const foods = foodsRes.data?.data || foodsRes.data?.results || foodsRes.data || [];
      const mapped = items.map(item => {
        const foodId = item.food || item.food_item;
        const foodObj = foods.find(f => f.id === foodId);
        
        let instructions = item.special_instructions || item.instructions || "";
        let extraIngredients = item.extraIngredients || [];
        
        // Parse "Add-ons:" from instructions if present
        if (instructions.includes('Add-ons:')) {
          const parts = instructions.split(' | ');
          const cleanParts = [];
          for (const p of parts) {
            if (p.startsWith('Add-ons:')) {
              const addonsStr = p.replace('Add-ons:', '').trim();
              if (addonsStr) {
                const addonsList = addonsStr.split(',').map(a => a.trim());
                addonsList.forEach(a => extraIngredients.push({ name: a }));
              }
            } else {
              cleanParts.push(p);
            }
          }
          instructions = cleanParts.join(' | ');
        }

        return {
          id: item.id,
          name: item.name || item.food_name || (foodObj ? foodObj.name || foodObj.title : null) || 'Dish Item',
          quantity: item.quantity || item.qty || 1,
          instructions: instructions,
          extraIngredients: extraIngredients
        };
      });
      setLiveTicketItems(prev => ({...prev, [ordId]: mapped}));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetailsId(null);
    }
  };

  // Kitchen queue order (FIFO line-up per stage):
  // 1. New Tickets: in the line of when the order was taken/placed (first taken = top of line)
  const sortNewTickets = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.placedAt || a.statusTimes?.Pending || a.rawCreatedAt || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.placedAt || b.statusTimes?.Pending || b.rawCreatedAt || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB; // Ascending: order taken earlier appears on top, newer below
      }
      return Number(a.id) - Number(b.id);
    });
  };

  // 2. Preparing: in the line of when accepted into kitchen (first accepted = top of line)
  const sortPreparingQueue = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.statusTimes?.Preparing || a.preparingAt || a.statusUpdatedAt || a.placedAt || a.rawCreatedAt || 0;
      const timeB = b.statusTimes?.Preparing || b.preparingAt || b.statusUpdatedAt || b.placedAt || b.rawCreatedAt || 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB; // Ascending: order accepted earlier appears on top, accepted later below
      }
      return Number(a.id) - Number(b.id);
    });
  };

  // 3. Ready: in the line of when marked ready (first ready = top of line)
  const sortReadyQueue = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.statusTimes?.Ready || a.readyAt || a.statusUpdatedAt || a.statusTimes?.Preparing || a.placedAt || 0;
      const timeB = b.statusTimes?.Ready || b.readyAt || b.statusUpdatedAt || b.statusTimes?.Preparing || b.placedAt || 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB; // Ascending: order marked ready earlier appears on top, marked ready later below
      }
      return Number(a.id) - Number(b.id);
    });
  };

  const getTicketItems = (ord) => {
    if (!ord) return [];
    const candidates = [
      ord.items,
      ord.order_items,
      ord.orderItems,
      ord.food_items,
      ord.dishes
    ];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) return c;
      if (typeof c === 'string') {
        try {
          const parsed = JSON.parse(c);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }

    const ordId = String(ord.id || ord._backendId || ord.order_id || '').trim();
    if (ordId) {
      try {
        const saved = JSON.parse(localStorage.getItem(`foodie_saved_order_${ordId}`) || 'null');
        if (saved && Array.isArray(saved.items) && saved.items.length > 0) return saved.items;
      } catch (e) {}
      try {
        const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
        const found = (allPlaced || []).find(p => {
          const pId = String(p.id || p.order_id || p._backendId || '').trim();
          return pId === ordId || (pId.replace(/\D/g, '') && pId.replace(/\D/g, '') === ordId.replace(/\D/g, ''));
        });
        if (found && Array.isArray(found.items) && found.items.length > 0) return found.items;
      } catch (e) {}
    }
    return [];
  };

  // 4. Completed: in the line of when served/completed (most recently served at top)
  const sortCompletedQueue = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.statusTimes?.Completed || a.statusTimes?.Serving || a.completedAt || a.statusUpdatedAt || a.placedAt || 0;
      const timeB = b.statusTimes?.Completed || b.statusTimes?.Serving || b.completedAt || b.statusUpdatedAt || b.placedAt || 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA; // Descending: latest completed at top
      }
      return Number(b.id) - Number(a.id);
    });
  };

  const isPending = (st) => {
    const s = String(st || '').toLowerCase().trim();
    if (!s) return true;
    if (s === 'cancelled' || s === 'canceled' || s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen' || s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup' || s === 'completed' || s === 'serving' || s === 'served' || s === 'delivered' || s === 'done' || s === 'settled') {
      return false;
    }
    return true;
  };

  const isPreparing = (st) => {
    const s = String(st || '').toLowerCase().trim();
    return s === 'preparing' || s === 'cooking' || s === 'accepted' || s === 'in_kitchen';
  };

  const isReady = (st) => {
    const s = String(st || '').toLowerCase().trim();
    return s === 'ready' || s === 'out_for_delivery' || s === 'prepared' || s === 'ready_for_pickup';
  };

  const isCompleted = (st) => {
    const s = String(st || '').toLowerCase().trim();
    return s === 'completed' || s === 'serving' || s === 'served' || s === 'delivered' || s === 'done' || s === 'settled';
  };

  const formatTableBadge = (table) => {
    if (!table) return 'Table: N/A';
    const str = String(table).trim();
    if (str.toLowerCase() === 'takeaway') return 'Takeaway';
    if (/^table\s+/i.test(str)) return str;
    return `Table: ${str}`;
  };

  const areOrdersDuplicate = (ordA, ordB) => {
    if (!ordA || !ordB) return false;
    const idA = String(ordA.id || ordA.order_id || ordA.orderId || '').trim();
    const idB = String(ordB.id || ordB.order_id || ordB.orderId || '').trim();
    if (idA && idB) {
      if (idA === idB) return true;
      const cleanA = idA.replace(/^(FD|ORD|order_|-)/gi, '').replace(/\D/g, '');
      const cleanB = idB.replace(/^(FD|ORD|order_|-)/gi, '').replace(/\D/g, '');
      if (cleanA && cleanB && cleanA === cleanB) return true;
      return false; // Distinct IDs should NEVER be merged!
    }

    const tableA = String(ordA.table || ordA.tableNumber || ordA.table_number || '').replace(/\D/g, '');
    const tableB = String(ordB.table || ordB.tableNumber || ordB.table_number || '').replace(/\D/g, '');
    if (tableA && tableB && tableA !== tableB) return false;

    const totalA = parseFloat(ordA.total || ordA.total_amount || ordA.totalPrice || ordA.amount || 0);
    const totalB = parseFloat(ordB.total || ordB.total_amount || ordB.totalPrice || ordB.amount || 0);
    const totalMatches = Math.abs(totalA - totalB) < 1.0;

    const itemsA = ordA.items || [];
    const itemsB = ordB.items || [];
    let itemsMatch = false;
    if (itemsA.length > 0 && itemsB.length > 0) {
      const namesA = itemsA.map(i => `${i.name || i.title || ''}x${i.quantity || 1}`.toLowerCase().trim()).sort().join('|');
      const namesB = itemsB.map(i => `${i.name || i.title || ''}x${i.quantity || 1}`.toLowerCase().trim()).sort().join('|');
      if (namesA === namesB) itemsMatch = true;
    }

    return (totalMatches && itemsMatch);
  };

  const allKitchenOrders = (() => {
    const ordersMap = new Map();
    const deletedOrderIds = new Set(JSON.parse(localStorage.getItem('foodie_deleted_order_ids') || '[]').map(String));
    let statusOverrides = {};
    try {
      statusOverrides = JSON.parse(localStorage.getItem('foodie_order_status_overrides') || '{}');
    } catch (e) {}

    try {
      localStorage.removeItem('foodie_saved_order_undefined');
      localStorage.removeItem('foodie_saved_order_null');
      localStorage.removeItem('foodie_saved_order_FD10001');
    } catch (e) { }

    const addOrMergeOrder = (ord, isContextOrder = false) => {
      let rawId = ord?.id || ord?.order_id;
      if (!rawId || String(rawId) === 'undefined' || String(rawId) === 'null') return;
      const id = String(rawId).trim();
      if (deletedOrderIds.has(id)) return;

      // Extract table number if available
      let tableNum = ord.table || ord.tableNumber || ord.table_number || ord.table_no;
      if (!tableNum || tableNum === 'undefined' || tableNum === 'null') {
        try {
          const storedTableInfo = JSON.parse(localStorage.getItem(`foodie_order_table_${id}`) || 'null');
          if (storedTableInfo && storedTableInfo.tableNumber) {
            tableNum = storedTableInfo.tableNumber;
          }
        } catch (e) { }
      }
      if (!tableNum || tableNum === 'undefined' || tableNum === 'null') {
        tableNum = (ord.order_type === 'TAKEAWAY' || ord.is_takeaway) ? 'Takeaway' : 'Takeaway';
      }

      const overrideSt = statusOverrides[id] || (ord._backendId ? statusOverrides[String(ord._backendId)] : null) || (ord.backendNumericId ? statusOverrides[String(ord.backendNumericId)] : null);
      const effectiveStatus = overrideSt || ord.status || 'Pending';

      if (ordersMap.has(id)) {
        const existing = ordersMap.get(id);
        ordersMap.set(id, {
          ...existing,
          ...ord,
          id: id,
          items: (Array.isArray(ord.items) && ord.items.length > 0) ? ord.items : (existing.items || []),
          total: ord.total || existing.total || 0,
          table: tableNum || existing.table || 'Takeaway',
          status: overrideSt || (isContextOrder && ord.status ? ord.status : (existing.status || ord.status || 'Pending'))
        });
      } else {
        ordersMap.set(id, {
          ...ord,
          id: id,
          table: tableNum,
          items: Array.isArray(ord.items) ? ord.items : [],
          status: effectiveStatus
        });
      }
    };

    // 1. First add locally placed orders
    try {
      const allPlaced = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      (allPlaced || []).forEach(o => addOrMergeOrder(o, false));
    } catch (e) { }

    // 2. Then add context orders (which are authoritative and contain live optimistic status updates)
    (orders || []).forEach(o => addOrMergeOrder(o, true));

    const clearedBefore = parseInt(localStorage.getItem('foodie_orders_cleared_before') || '0', 10);
    const all = Array.from(ordersMap.values()).filter(o => !deletedOrderIds.has(String(o.id)));

    return all.filter(ord => {
      if (clearedBefore > 0) {
        const time = Number(ord.placedAt || ord.rawCreatedAt) || (ord.created_at ? new Date(ord.created_at).getTime() : 0) || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
        if (time > 0 && time <= clearedBefore) return false;
      }
      return true;
    });
  })();
  // Branch and backend-driven filtering (NEVER filter by customer user_id)
  const activeBranchFilteredOrders = allKitchenOrders.filter((ord) => {
    if (!ord || (!ord.id && !ord.order_id)) return false;

    // Branch filtering
    if (selectedBranch && selectedBranch !== 'ALL') {
      const orderBranch = ord.restaurant || ord.restaurant_id || ord.restaurantId || ord.branch || ord.branch_id || ord.branchId;
      const selectedBranchObj = branches.find(b => String(b.id) === String(selectedBranch));

      if (orderBranch) {
        const isMatch =
          String(orderBranch) === String(selectedBranch) ||
          (selectedBranchObj && (
            String(orderBranch) === String(selectedBranchObj.code) ||
            String(orderBranch).toLowerCase() === String(selectedBranchObj.name).toLowerCase()
          )) ||
          (selectedBranchObj?.isMainBranch && (orderBranch === 1 || String(orderBranch) === '1'));

        if (!isMatch) return false;
      }
    }

    if (!showAllOrders && user) {
      const empIdStr = String(user.id || '').trim();
      const empUsername = String(user.username || user.name || '').toLowerCase().trim();
      
      let ordEmpId = '';
      if (ord.takenBy && typeof ord.takenBy === 'object') {
        ordEmpId = String(ord.takenBy.id || ord.takenBy.user || '');
      } else if (ord.employee && typeof ord.employee === 'object') {
        ordEmpId = String(ord.employee.id || ord.employee.user || '');
      } else {
        ordEmpId = String(ord.employee || ord.employee_id || ord.employeeId || ord.taken_by || ord.takenBy || ord.created_by || ord.createdBy || ord.operator || ord.server || ord.user || '');
      }

      const ordEmpStr = ordEmpId.toLowerCase().trim();
      
      const matchesUser = empIdStr && (ordEmpId === empIdStr);
      const matchesName = empUsername && (ordEmpStr === empUsername || ordEmpStr.includes(empUsername));

      if (!matchesUser && !matchesName) {
        return false;
      }
    }

    return true;
  });

  const pendingOrders = sortNewTickets(activeBranchFilteredOrders.filter((o) => isPending(o.status)));
  const preparingOrders = sortPreparingQueue(activeBranchFilteredOrders.filter((o) => isPreparing(o.status)));
  const readyOrders = sortReadyQueue(activeBranchFilteredOrders.filter((o) => isReady(o.status)));
  const completedOrders = sortCompletedQueue(activeBranchFilteredOrders.filter((o) => isCompleted(o.status)));

  useEffect(() => {
    activeBranchFilteredOrders.forEach(ord => {
      fetchTicketDetails(ord.id);
    });
  }, [activeBranchFilteredOrders]);

  return (
    <AdminLayout>
      <PageHeader
        title="Kitchen Queue & Live Status Monitor"
        showBackButton
        actions={
          <div className="d-flex align-items-center gap-2">
            {!isBranchRestricted && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-secondary small fw-semibold d-none d-md-inline">Branch:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const targetBranch = branches.find(b => String(b.id) === String(targetId));
                    if (targetBranch && isBranchUnderConstruction(targetBranch)) return;
                    setSelectedBranch(targetId);
                  }}
                  className="form-select form-select-sm rounded-pill border-secondary-subtle fw-semibold ps-3 pe-4 py-1.5"
                  style={{ minWidth: '270px', fontSize: '13px', cursor: 'pointer', backgroundColor: '#ffffff' }}
                  aria-label="Filter Kitchen by Branch"
                >
                  {branches.map(b => {
                    const underConst = isBranchUnderConstruction(b);
                    return (
                      <option key={b.id} value={String(b.id)} disabled={underConst}>
                        {b.name}{underConst ? ' — Under Construction' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            {isWaiter && (
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1 ${showAllOrders ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setShowAllOrders(!showAllOrders)}
              >
                <i className="bi bi-eye"></i>
                <span>{showAllOrders ? 'Show My Orders' : 'View All Orders'}</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1"
              onClick={() => fetchOrders(true)}
              title="Refresh Kitchen Queue from Backend"
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <Loader />
      ) : (
        <div className="row g-4">
          {/* Column 1: New Tickets */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-3 shadow-sm p-3 bg-white h-100" style={{ minHeight: '450px' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="p-1 rounded bg-danger-subtle text-danger">
                    <i className="bi bi-receipt"></i>
                  </span>
                  <h6 className="fw-bold text-dark mb-0">New Tickets</h6>
                </div>
                <span className="badge bg-danger rounded-pill px-2.5 py-1">{pendingOrders.length}</span>
              </div>

              <div className="d-flex flex-column gap-3">
                {pendingOrders.length === 0 ? (
                  <EmptyState title="No New Tickets" description="Pending orders appear here." icon="bi-patch-check" />
                ) : (
                  pendingOrders.map((ord, idx) => (
                    <div key={ord.id} className="p-3 border rounded-3 bg-light-subtle kitchen-ticket shadow-xs border-danger-subtle position-relative">
                      <div className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1, fontSize: '0.75rem' }}>
                        Q{idx + 1}
                      </div>
                      <div className="d-flex align-items-center justify-content-between fw-bold mb-2">
                        <span className="text-dark fs-6">#{ord.id}</span>
                        <span className="badge bg-danger text-white rounded-pill px-2.5 py-1">
                          {formatTableBadge(ord.table)}
                        </span>
                      </div>

                      <div className="small border-bottom pb-2 mb-2 text-secondary">
                        {(() => {
                          const baseItemsList = getTicketItems(ord);
                          const itemsList = liveTicketItems[ord.id] || baseItemsList;
                          const isFallback = itemsList.length === 0 || (itemsList.length === 1 && itemsList[0].name === 'Dish Item');

                          if (itemsList.length > 0 && !isFallback) {
                            return itemsList.map((i, idx) => (
                              <div key={idx} className="mb-2" title={i.name || i.title || i.food_name || i.dish_name}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <span className="text-dark fw-medium">• {i.name || i.title || i.food_name || i.dish_name || 'Dish Item'}</span>
                                  <strong className="text-danger ms-2 flex-shrink-0">× {i.quantity || i.qty || 1}</strong>
                                </div>
                                {(i.instructions || i.special_instructions) && (
                                  <div className="text-muted fst-italic ms-2 text-wrap" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                    Note: {i.instructions || i.special_instructions}
                                  </div>
                                )}
                                {Array.isArray(i.extraIngredients) && i.extraIngredients.length > 0 && (
                                  <div className="text-muted ms-2 text-wrap fw-medium" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2', color: '#64748b' }}>
                                    Extras: {i.extraIngredients.map(ex => ex.name || ex).join(', ')}
                                  </div>
                                )}
                              </div>
                            ));
                          }
                          return (
                            <div className="mb-1 text-truncate" style={{ maxWidth: '240px' }}>
                              <span className="text-dark fw-medium">• Dish Item</span> <strong className="text-danger">× 1</strong>
                            </div>
                          );
                        })()}
                        {ord.special_instructions && (
                          <div className="text-danger fw-semibold mt-1 fst-italic" style={{ fontSize: '11px' }}>
                            Order Note: {ord.special_instructions}
                          </div>
                        )}

                      </div>

                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span className="text-muted small" style={{ fontSize: '11.5px' }}>
                          {ord.time || 'Placed'}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            onClick={() => handleReject(ord.id)}
                            disabled={updatingId === ord.id && updatingAction === 'reject'}
                            size="sm"
                            variant="outline-danger"
                            className="py-1 px-2.5 fw-bold shadow-xs"
                            style={{ fontSize: '11.5px' }}
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleAction(ord.id, 'Preparing')}
                            disabled={updatingId === ord.id && updatingAction === 'Preparing'}
                            size="sm"
                            variant="primary"
                            className="py-1 px-3 fw-bold shadow-xs"
                            style={{ fontSize: '11.5px' }}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-3 shadow-sm p-3 bg-white h-100" style={{ minHeight: '450px' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="p-1 rounded bg-warning-subtle text-warning">
                    <i className="bi bi-fire"></i>
                  </span>
                  <h6 className="fw-bold text-dark mb-0">Preparing</h6>
                </div>
                <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1">{preparingOrders.length}</span>
              </div>

              <div className="d-flex flex-column gap-3">
                {preparingOrders.length === 0 ? (
                  <EmptyState title="Idle Kitchen" description="Cooking orders appear here." icon="bi-fire" />
                ) : (
                  preparingOrders.map((ord, idx) => (
                    <div key={ord.id} className="p-3 border rounded-3 bg-light-subtle kitchen-ticket ticket-preparing shadow-xs position-relative">
                      <div className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1, fontSize: '0.75rem' }}>
                        Q{idx + 1}
                      </div>
                      <div className="d-flex align-items-center justify-content-between fw-bold mb-2">
                        <span className="text-dark fs-6">#{ord.id}</span>
                        <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1">
                          {formatTableBadge(ord.table)}
                        </span>
                      </div>

                      <div className="small border-bottom pb-2 mb-2 text-secondary">
                        {(() => {
                          const baseItemsList = getTicketItems(ord);
                          const itemsList = liveTicketItems[ord.id] || baseItemsList;
                          const isFallback = itemsList.length === 0 || (itemsList.length === 1 && itemsList[0].name === 'Dish Item');

                          if (itemsList.length > 0 && !isFallback) {
                            return itemsList.map((i, idx) => (
                              <div key={idx} className="mb-2" title={i.name || i.title || i.food_name || i.dish_name}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <span className="text-dark fw-medium">• {i.name || i.title || i.food_name || i.dish_name || 'Dish Item'}</span>
                                  <strong className="text-warning-emphasis ms-2 flex-shrink-0">× {i.quantity || i.qty || 1}</strong>
                                </div>
                                {(i.instructions || i.special_instructions) && (
                                  <div className="text-muted fst-italic ms-2 text-wrap" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                    Note: {i.instructions || i.special_instructions}
                                  </div>
                                )}
                                {Array.isArray(i.extraIngredients) && i.extraIngredients.length > 0 && (
                                  <div className="text-muted ms-2 text-wrap fw-medium" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2', color: '#64748b' }}>
                                    Extras: {i.extraIngredients.map(ex => ex.name || ex).join(', ')}
                                  </div>
                                )}
                              </div>
                            ));
                          }
                          return (
                            <div className="mb-1 text-truncate" style={{ maxWidth: '240px' }}>
                              <span className="text-dark fw-medium">• Dish Item</span> <strong className="text-warning-emphasis">× 1</strong>
                            </div>
                          );
                        })()}
                        {ord.special_instructions && (
                          <div className="text-warning-emphasis fw-semibold mt-1 fst-italic" style={{ fontSize: '11px' }}>
                            Order Note: {ord.special_instructions}
                          </div>
                        )}

                      </div>

                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted small" style={{ fontSize: '11.5px' }}>
                          {ord.time || 'Cooking'}
                        </span>
                        <Button
                          onClick={() => handleAction(ord.id, 'Ready')}
                          disabled={updatingId === ord.id}
                          size="sm"
                          variant="primary"
                          className="py-1 px-3 fw-bold shadow-xs"
                          style={{ backgroundColor: '#fd7e14', borderColor: '#fd7e14' }}
                        >
                          Mark Ready
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Ready for Counter */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-3 shadow-sm p-3 bg-white h-100" style={{ minHeight: '450px' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="p-1 rounded bg-info-subtle text-info">
                    <i className="bi bi-box-seam"></i>
                  </span>
                  <h6 className="fw-bold text-dark mb-0">Ready / Serving</h6>
                </div>
                <span className="badge bg-info text-white rounded-pill px-2.5 py-1">{readyOrders.length}</span>
              </div>

              <div className="d-flex flex-column gap-3">
                {readyOrders.length === 0 ? (
                  <EmptyState title="Counter Cleared" description="Prepared food items appear here." icon="bi-collection-play" />
                ) : (
                  readyOrders.map((ord, idx) => (
                    <div key={ord.id} className="p-3 border rounded-3 bg-light-subtle kitchen-ticket ticket-ready shadow-xs position-relative">
                      <div className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1, fontSize: '0.75rem' }}>
                        Q{idx + 1}
                      </div>
                      <div className="d-flex align-items-center justify-content-between fw-bold mb-2">
                        <span className="text-dark fs-6">#{ord.id}</span>
                        <span className="badge bg-info text-white rounded-pill px-2.5 py-1">
                          {formatTableBadge(ord.table)}
                        </span>
                      </div>

                      <div className="small border-bottom pb-2 mb-2 text-secondary">
                        {(() => {
                          const baseItemsList = getTicketItems(ord);
                          const itemsList = liveTicketItems[ord.id] || baseItemsList;
                          const isFallback = itemsList.length === 0 || (itemsList.length === 1 && itemsList[0].name === 'Dish Item');

                          if (itemsList.length > 0 && !isFallback) {
                            return itemsList.map((i, idx) => (
                              <div key={idx} className="mb-2" title={i.name || i.title || i.food_name || i.dish_name}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <span className="text-dark fw-medium">• {i.name || i.title || i.food_name || i.dish_name || 'Dish Item'}</span>
                                  <strong className="text-info ms-2 flex-shrink-0">× {i.quantity || i.qty || 1}</strong>
                                </div>
                                {(i.instructions || i.special_instructions) && (
                                  <div className="text-muted fst-italic ms-2 text-wrap" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                    Note: {i.instructions || i.special_instructions}
                                  </div>
                                )}
                                {Array.isArray(i.extraIngredients) && i.extraIngredients.length > 0 && (
                                  <div className="text-muted ms-2 text-wrap fw-medium" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2', color: '#64748b' }}>
                                    Extras: {i.extraIngredients.map(ex => ex.name || ex).join(', ')}
                                  </div>
                                )}
                              </div>
                            ));
                          }
                          return (
                            <div className="mb-1 text-truncate" style={{ maxWidth: '240px' }}>
                              <span className="text-dark fw-medium">• Dish Item</span> <strong className="text-info">× 1</strong>
                            </div>
                          );
                        })()}

                      </div>

                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted small" style={{ fontSize: '11.5px' }}>
                          {ord.time || 'Ready'}
                        </span>
                        <Button
                          onClick={() => handleAction(ord.id, 'Completed')}
                          disabled={updatingId === ord.id}
                          size="sm"
                          variant="primary"
                          className="py-1 px-3 fw-bold shadow-xs"
                          style={{ backgroundColor: '#198754', borderColor: '#198754' }}
                        >
                          Mark Serving
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 4: Completed */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-3 shadow-sm p-3 bg-white h-100" style={{ minHeight: '450px' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="p-1 rounded bg-success-subtle text-success">
                    <i className="bi bi-check2-circle"></i>
                  </span>
                  <h6 className="fw-bold text-dark mb-0">Completed</h6>
                </div>
                <span className="badge bg-success text-white rounded-pill px-2.5 py-1">{completedOrders.length}</span>
              </div>

              <div className="d-flex flex-column gap-3" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                {completedOrders.length === 0 ? (
                  <EmptyState title="No Completed Orders" description="Served orders appear here." icon="bi-check2-all" />
                ) : (
                  completedOrders.map((ord) => (
                    <div key={ord.id} className="p-3 border rounded-3 bg-light-subtle kitchen-ticket ticket-completed shadow-xs mb-3">
                      <div className="d-flex align-items-center justify-content-between fw-bold mb-3">
                        <span className="text-dark fs-6">#{ord.id}</span>
                        <span className="badge bg-success text-white rounded-pill px-2.5 py-1">
                          {formatTableBadge(ord.table)}
                        </span>
                      </div>

                      <div className="small border-bottom pb-3 mb-3 text-secondary">
                        {(() => {
                          const itemsList = getTicketItems(ord);
                          if (itemsList.length > 0) {
                            return itemsList.map((i, idx) => (
                              <div key={idx} className="mb-2" title={i.name || i.title || i.food_name || i.dish_name}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <span className="text-dark fw-medium">• {i.name || i.title || i.food_name || i.dish_name || 'Dish Item'}</span>
                                  <strong className="text-success ms-2 flex-shrink-0">× {i.quantity || i.qty || 1}</strong>
                                </div>
                                {(i.instructions || i.special_instructions) && (
                                  <div className="text-muted fst-italic ms-2 text-wrap mt-1" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                    Note: {i.instructions || i.special_instructions}
                                  </div>
                                )}
                                {Array.isArray(i.extraIngredients) && i.extraIngredients.length > 0 && (
                                  <div className="text-muted ms-2 text-wrap fw-medium mt-1" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.2', color: '#64748b' }}>
                                    Extras: {i.extraIngredients.map(ex => ex.name || ex).join(', ')}
                                  </div>
                                )}
                              </div>
                            ));
                          }
                          return (
                            <div className="mb-1 text-truncate" style={{ maxWidth: '240px' }}>
                              <span className="text-dark fw-medium">• Dish Item</span> <strong className="text-success ms-2">× 1</strong>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="d-flex align-items-center justify-content-between mt-2">
                        <button
                          type="button"
                          onClick={() => setEBillOrder(ord)}
                          className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1.5 fw-bold btn btn-sm d-inline-flex align-items-center"
                          style={{ fontSize: '11px', cursor: 'pointer' }}
                        >
                          <i className="bi bi-receipt me-1"></i>View E-Bill
                        </button>
                        <span className="text-muted small fw-medium" style={{ fontSize: '11px' }}>
                          {ord.time || 'Completed'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E-Bill Modal for completed orders */}
      {eBillOrder && (
        <EBillModal
          isOpen={!!eBillOrder}
          order={eBillOrder}
          onClose={() => setEBillOrder(null)}
        />
      )}
    </AdminLayout>
  );
};

export default Kitchen;
