import React, { useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import OrderCard from '../../components/orders/OrderCard';
import OrderDetailsModal from '../../components/orders/OrderDetailsModal';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import { OrderContext } from '../../context/OrderContext';
import { restaurantService } from '../../services/restaurantService';
import { useAuth } from '../../hooks/useAuth';
import EBillModal from '../../components/orders/EBillModal';

export const Orders = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders, loading, updateStatus, fetchOrders } = useContext(OrderContext);
  const [search, setSearch] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [employees, setEmployees] = useState([]);
  const [eBillOrder, setEBillOrder] = useState(null);

  const getInitialTab = () => {
    const p = (searchParams.get('status') || searchParams.get('tab') || '').toLowerCase();
    if (p.includes('pend')) return 'Pending';
    if (p.includes('prep')) return 'Preparing';
    if (p.includes('ready')) return 'Ready';
    if (p.includes('serv')) return 'Serving';
    if (p.includes('comp')) return 'Completed';
    if (p.includes('canc')) return 'Cancelled';
    return 'All';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders(false, dateFilter);
  }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    restaurantService.getRestaurants()
      .then(res => {
        const raw = res?.data || (Array.isArray(res) ? res : (res?.results || []));
        setRestaurants(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setRestaurants([]));

    // Fetch employees for the filter
    import('../../services/api').then(({ default: api }) => {
      api.get('/employees/?page_size=100').then((res) => {
        const empRecords = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (res?.data?.results || []));
        const validUsers = empRecords.filter(emp => emp.user).map(emp => emp.user);
        
        const uniqueUsers = [];
        const seen = new Set();
        validUsers.forEach(u => {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            uniqueUsers.push(u);
          }
        });
        
        setEmployees(uniqueUsers);
      }).catch((err) => {
        api.get('/users/?page_size=500').then((res) => {
          const allUsers = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (res?.data?.results || []));
          const possibleEmps = allUsers.filter(u => !String(u.name || '').toLowerCase().startsWith('customer '));
          setEmployees(possibleEmps);
        }).catch(console.error);
      });
    });
  }, []);

  const initializedFilterRef = React.useRef(false);

  useEffect(() => {
    if (user?.role === 'employee' && user?.id && !initializedFilterRef.current) {
      setEmployeeFilter(String(user.id));
      initializedFilterRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    const tabFromUrl = getInitialTab();
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const tabs = ['All', 'Pending', 'Preparing', 'Ready', 'Serving', 'Completed', 'Cancelled'];

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'All') {
      searchParams.delete('status');
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: tab });
    }
  };

  const filteredOrders = (orders || []).filter((o) => {
    if (!o || (!o.id && !o.order_id)) return false;

    // Branch filter
    if (branchFilter !== 'ALL') {
      const orderBranch = o.restaurant || o.restaurant_id || o.restaurantId;
      if (orderBranch && String(orderBranch) !== String(branchFilter)) {
        return false;
      }
    }

    // Employee filter
    if (employeeFilter !== 'ALL') {
      let ordEmpId = '';
      if (o.takenBy && typeof o.takenBy === 'object') {
        ordEmpId = String(o.takenBy.id || o.takenBy.user || '');
      } else if (o.employee && typeof o.employee === 'object') {
        ordEmpId = String(o.employee.id || o.employee.user || '');
      } else {
        ordEmpId = String(o.employee || o.employee_id || o.employeeId || o.taken_by || o.takenBy || o.created_by || o.createdBy || o.operator || o.server || o.user || '');
      }
      
      const ordEmp = ordEmpId;
      if (ordEmp !== String(employeeFilter) && !ordEmp.includes(employeeFilter)) {
        // Also try to match by username if the filter is an ID
        const selectedEmpObj = employees.find(e => String(e.id) === String(employeeFilter));
        const selectedEmpName = selectedEmpObj ? String(selectedEmpObj.username || selectedEmpObj.name).toLowerCase().trim() : '';
        const ordEmpLower = ordEmp.toLowerCase().trim();
        
        if (!selectedEmpName || (ordEmpLower !== selectedEmpName && !ordEmpLower.includes(selectedEmpName))) {
          return false;
        }
      }
    }

    const rawSearch = search.trim().toLowerCase();
    let matchesSearch = true;
    if (rawSearch) {
      const orderIdStr = String(o.id || '').toLowerCase();
      const orderTableStr = String(o.table || '').toLowerCase();

      const cleanOrderTableDigits = orderTableStr.replace(/^(table\s*|t-?)/i, '').replace(/^0+/, '') || orderTableStr;
      const cleanSearchDigits = rawSearch.replace(/^(table\s*|t-?)/i, '').replace(/^0+/, '') || rawSearch;
      const isSimpleNumber = /^\d{1,2}$/.test(rawSearch);

      // Table matching
      const directTableMatch =
        orderTableStr === rawSearch ||
        orderTableStr.includes(rawSearch) ||
        `table ${orderTableStr}`.includes(rawSearch) ||
        `table ${cleanOrderTableDigits}`.includes(rawSearch);

      const numericTableMatch = Boolean(
        cleanSearchDigits &&
        cleanOrderTableDigits &&
        cleanSearchDigits === cleanOrderTableDigits
      );

      const tableMatch = directTableMatch || numericTableMatch;

      // Order ID matching
      const idMatch = isSimpleNumber
        ? (orderIdStr === rawSearch || orderIdStr === `#${rawSearch}` || orderIdStr.startsWith(rawSearch))
        : (orderIdStr.includes(rawSearch) || `#${orderIdStr}`.includes(rawSearch));

      matchesSearch = tableMatch || idMatch;
    }

    let matchesTab = activeTab === 'All';
    if (activeTab !== 'All') {
      const statusLower = String(o.status || '').toLowerCase().trim();
      const tabLower = activeTab.toLowerCase().trim();
      if (tabLower === 'pending') {
        matchesTab = statusLower === 'pending' || statusLower === 'confirmed' || statusLower === 'placed' || statusLower === 'new' || !statusLower;
      } else if (tabLower === 'preparing') {
        matchesTab = statusLower === 'preparing' || statusLower === 'cooking' || statusLower === 'accepted' || statusLower === 'in_kitchen';
      } else if (tabLower === 'ready') {
        matchesTab = statusLower === 'ready' || statusLower === 'prepared' || statusLower === 'out_for_delivery';
      } else if (tabLower === 'serving') {
        matchesTab = statusLower === 'serving' || statusLower === 'served';
      } else if (tabLower === 'completed') {
        matchesTab = statusLower === 'completed' || statusLower === 'delivered' || statusLower === 'done' || statusLower === 'settled';
      } else if (tabLower === 'cancelled') {
        matchesTab = statusLower === 'cancelled' || statusLower === 'rejected';
      } else {
        matchesTab = statusLower === tabLower;
      }
    }

    const pm = (o.paymentMethod || o.payment_method || o.payment || 'COD').toUpperCase();
    const isUpi = pm === 'UPI' || pm.includes('UPI');
    const isCard = pm === 'CARD' || pm === 'CREDIT_CARD' || pm === 'DEBIT_CARD' || pm.includes('CARD');
    const isCod = pm === 'COD' || pm === 'CASH' || pm.includes('COD') || pm.includes('CASH');

    const matchesPayment = paymentFilter === 'ALL' ||
      (paymentFilter === 'COD' && isCod) ||
      (paymentFilter === 'CARD' && isCard) ||
      (paymentFilter === 'UPI' && isUpi);

    return matchesSearch && matchesTab && matchesPayment;
  });

  if (loading && (!orders || orders.length === 0)) {
    return (
      <AdminLayout>
        <Loader />
      </AdminLayout>
    );
  }

  if (!loading && (!orders || orders.length === 0)) {
    return (
      <AdminLayout>
        <PageHeader
          title="Manage Orders & Bills"
          showBackButton
        />
        <EmptyState
          title="No Orders Found"
          description="There are currently no placed orders."
          icon="bi-basket2-fill"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Manage Orders & Bills"
        showBackButton
        actions={
          orders && orders.length > 0 ? (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-control form-control-sm rounded-pill border-secondary-subtle fw-semibold px-3 py-1.5"
                style={{ width: '150px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ffffff' }}
                aria-label="Filter by Date"
              />
              {restaurants.length > 0 && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="form-select form-select-sm rounded-pill border-secondary-subtle fw-semibold px-3 py-1.5"
                  style={{ width: '160px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ffffff' }}
                  aria-label="Filter by Branch"
                >
                  <option value="ALL">All Branches</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name || `Branch #${r.id}`}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="form-select form-select-sm rounded-pill border-secondary-subtle fw-semibold px-3 py-1.5"
                style={{ width: '140px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ffffff' }}
                aria-label="Filter by Payment Method"
              >
                <option value="ALL">All Payments</option>
                <option value="COD">Cash / COD</option>
                <option value="CARD">Card Payment</option>
                <option value="UPI">UPI Payment</option>
              </select>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="form-select form-select-sm rounded-pill border-secondary-subtle fw-semibold px-3 py-1.5"
                style={{ width: '160px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ffffff' }}
                aria-label="Filter by Employee"
              >
                <option value="ALL">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name || emp.username || `Employee #${emp.id}`}
                  </option>
                ))}
              </select>
              <SearchBar
                placeholder="Search Order ID or Table..."
                value={search}
                onChange={setSearch}
                suggestions={orders.map(o => `Order #${o.id}`).concat(orders.map(o => `Table ${o.table}`))}
              />
            </div>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`btn btn-sm rounded-pill px-3 py-2 border-0 fw-bold transition-all ${activeTab === tab ? 'bg-danger text-white' : 'bg-white text-secondary border'
              }`}
            style={{ fontSize: '12px' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Order List */}
      {loading ? (
        <Loader />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={orders.length === 0 ? "No Orders Yet" : "No Orders Found"}
          description={
            orders.length === 0
              ? "There are currently no placed orders."
              : activeTab !== 'All'
                ? `There are currently no orders with "${activeTab}" status.`
                : "There are no orders matching this search or filter."
          }
          icon="bi-basket2-fill"
        />
      ) : (
        <div className="row">
          {filteredOrders.map((order) => (
            <div key={order.id} className="col-12">
              <OrderCard
                order={order}
                onViewDetails={(ord) => setSelectedOrder(ord)}
                onViewEBill={(ord) => setEBillOrder(ord)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={!!selectedOrder}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
          onViewEBill={() => setEBillOrder(selectedOrder)}
        />
      )}

      {/* E-Bill Modal */}
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

export default Orders;
