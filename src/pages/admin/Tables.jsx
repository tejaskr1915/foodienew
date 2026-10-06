import React, { useEffect, useState, useContext } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import TableCard from '../../components/tables/TableCard';
import AddTableModal from '../../components/tables/AddTableModal';
import EditTableModal from '../../components/tables/EditTableModal';
import QRDisplayModal from '../../components/tables/QRDisplayModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { tableService } from '../../services/tableService';
import { productService } from '../../services/productService';
import { menuService } from '../../services/menuService';
import { useAuth } from '../../hooks/useAuth';
import { FiPlus, FiShoppingCart } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { OrderContext } from '../../context/OrderContext';

export const Tables = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTable, clearCart } = useCart();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { orders } = useContext(OrderContext);

  const statusFilterParam = (searchParams.get('status') || searchParams.get('filter') || '').toLowerCase();
  const isAvailableOnly = statusFilterParam === 'available';

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasDishes, setHasDishes] = useState(true);
  const [activeArea, setActiveArea] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [qrModalTable, setQrModalTable] = useState(null);

  const areas = ['All', 'Indoor Main', 'Garden View', 'Rooftop Terrace'];

  const fetchTables = async () => {
    setLoading(true);
    try {
      const [data, dishesData, catData] = await Promise.all([
        tableService.getTables().catch(() => []),
        productService.getProducts(true).catch(() => []),
        menuService.getMenus().catch(() => [])
      ]);
      if (Array.isArray(data) && data.length > 0) {
        setTables(data);
      } else if (Array.isArray(data)) {
        setTables(data);
      }
      const hasCats = (catData || []).length > 0;
      const hasProds = (dishesData || []).length > 0;
      setHasDishes(hasCats && hasProds);
    } catch (e) {
      console.error("fetchTables error:", e);
    }
    setLoading(false);
  };

  const fetchTablesSilently = async () => {
    try {
      const [data, dishesData, catData] = await Promise.all([
        tableService.getTables().catch(() => []),
        productService.getProducts(true).catch(() => []),
        menuService.getMenus().catch(() => [])
      ]);
      if (Array.isArray(data) && data.length > 0) {
        setTables(data);
      }
      const hasCats = (catData || []).length > 0;
      const hasProds = (dishesData || []).length > 0;
      setHasDishes(hasCats && hasProds);
    } catch (e) {
      console.error("fetchTablesSilently error:", e);
    }
  };

  useEffect(() => {
    fetchTables();
    const handleUpdated = () => fetchTablesSilently();
    window.addEventListener('foodie_tables_updated', handleUpdated);
    window.addEventListener('foodie_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    
    // Poll to keep tables synced across different devices (which don't share storage events)
    const intervalId = setInterval(() => {
      fetchTablesSilently();
    }, 10000);
    
    return () => {
      window.removeEventListener('foodie_tables_updated', handleUpdated);
      window.removeEventListener('foodie_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
      clearInterval(intervalId);
    };
  }, []);

  const handleAddTable = async (tableData) => {
    if (!isAdmin) return;
    try {
      const created = await tableService.createTable(tableData);
      if (created) {
        setTables(prev => {
          const canon = tableService.getCanonicalTableNumber(created.number);
          const filtered = prev.filter(t => tableService.getCanonicalTableNumber(t.number) !== canon);
          return [...filtered, created].sort((a, b) => {
            const aNum = parseInt(String(a.number || '').replace(/[^0-9]/g, '') || '0', 10);
            const bNum = parseInt(String(b.number || '').replace(/[^0-9]/g, '') || '0', 10);
            if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) {
              return aNum - bNum;
            }
            return String(a.number).localeCompare(String(b.number));
          });
        });
      }
      setActiveArea('All');
      await fetchTablesSilently();
    } catch (e) {
      console.error("Failed to add table:", e);
      throw e;
    }
  };

  const handleEditSave = async (id, tableData) => {
    if (!isAdmin) return;
    const cleanNum = tableService.getCanonicalTableNumber(tableData.number);
    setTables(prev => prev.map(t => {
      if (String(t.id) === String(id)) {
        return {
          ...t,
          ...tableData,
          number: cleanNum,
          table_number: cleanNum,
          name: `Table ${cleanNum}`
        };
      }
      return t;
    }));
    try {
      await tableService.updateTable(id, tableData);
      await fetchTablesSilently();
    } catch (e) {
      console.error("Failed to update table:", e);
      await fetchTables();
      throw e;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isAdmin) return;
    if (deletingTable) {
      const targetId = deletingTable.id;
      const targetNum = deletingTable.number || deletingTable.table_number;
      const canonNum = tableService.getCanonicalTableNumber(targetNum || targetId);
      setDeletingTable(null);
      // Optimistically remove table from UI immediately
      setTables(prev => prev.filter(t => 
        String(t.id) !== String(targetId) && 
        tableService.getCanonicalTableNumber(t.number) !== canonNum
      ));
      try {
        await tableService.deleteTable(targetId, targetNum);
        await fetchTablesSilently();
      } catch (e) {
        console.error("Failed to delete table:", e);
        await fetchTables();
      }
    }
  };

  const handleStatusChange = async (id, status) => {
    setTables(prev => prev.map(t => {
      if (String(t.id) === String(id)) {
        return {
          ...t,
          status,
          isAvailable: status === 'Available',
          is_available: status === 'Available',
          orderId: status === 'Occupied' ? t.orderId : undefined,
          reservationName: status === 'Reserved' ? t.reservationName : undefined
        };
      }
      return t;
    }));

    try {
      await tableService.updateTableStatus(id, status);
      await fetchTablesSilently();
    } catch (e) {
      console.error("Failed to update table status", e);
      alert("Unable to update table status. Please try again.");
      await fetchTablesSilently();
    }
  };

  const handleTakeOrder = async (table) => {
    let currentDishes = [];
    let currentCats = [];
    try {
      const [dishes, cats] = await Promise.all([
        productService.getProducts(true).catch(() => []),
        menuService.getMenus().catch(() => [])
      ]);
      currentDishes = dishes || [];
      currentCats = cats || [];
    } catch (e) {}
    
    if (!currentCats || currentCats.length === 0 || !currentDishes || currentDishes.length === 0) {
      alert("Cannot take order: no categories or items available in the menu.");
      return;
    }

    const rawNum = table.number || table.table_number || table.id;
    const cleanNum = tableService.getCanonicalTableNumber(rawNum);
    const tableInfo = { tableNumber: cleanNum, tableId: table.id, diners: table.capacity || 2, orderType: 'DINE_IN' };
    
    // Clear any existing cart before starting a new order
    if (typeof clearCart === 'function') {
      await clearCart();
    }
    
    setTable(tableInfo);
    try {
      sessionStorage.setItem('foodie_table', JSON.stringify(tableInfo));
      localStorage.setItem('foodie_table', JSON.stringify(tableInfo));
      sessionStorage.setItem('foodie_order_type', 'DINE_IN');
      localStorage.setItem('foodie_order_type', 'DINE_IN');
      
      if (user) {
        const id = user.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : (user.id || user.email || 'user');
        const tId = tableInfo.tableId || tableInfo.tableNumber || 'default';
        sessionStorage.removeItem(`foodie_cart_${id}_table_${tId}`);
        sessionStorage.removeItem(`foodie_cart_${id}`);
      }
      sessionStorage.removeItem('foodie_cart');
      sessionStorage.removeItem('foodie_guest_cart_unmerged');
      localStorage.removeItem('foodie_guest_cart_unmerged');
      sessionStorage.removeItem('foodie_guest_cart');
      localStorage.removeItem('foodie_guest_cart');
      sessionStorage.removeItem('foodie_guest_cart_temp');
      localStorage.removeItem('foodie_guest_cart_temp');
    } catch (e) {}
    
    // Mark table occupied in background without blocking immediate navigation
    if (table.status !== 'Occupied') {
      tableService.updateTableStatus(table.id, 'Occupied').catch((e) => {
        console.error("Failed to mark table as occupied:", e);
      });
    }

    navigate('/customer/home');
  };

  const filteredTables = tables.filter((t) => {
    if (isAvailableOnly) {
      const st = String(t.status || '').toLowerCase().trim();
      const isAvail = st === 'available' || t.isAvailable === true || t.is_available === true;
      if (!isAvail) return false;
    }
    if (activeArea === 'All') return true;
    const tableArea = (t.area || '').toLowerCase();
    const selectedArea = activeArea.toLowerCase();
    return tableArea === selectedArea || tableArea.includes(selectedArea.split(' ')[0]);
  });

  if (loading && (!tables || tables.length === 0)) {
    return (
      <AdminLayout>
        <Loader />
      </AdminLayout>
    );
  }

  const handleTakeawayOrder = () => {
    const takeawayInfo = { tableNumber: 'Takeaway', tableId: 'Takeaway', orderType: 'TAKEAWAY' };
    setTable(takeawayInfo);
    try {
      sessionStorage.setItem('foodie_table', JSON.stringify(takeawayInfo));
      localStorage.setItem('foodie_table', JSON.stringify(takeawayInfo));
      sessionStorage.setItem('foodie_order_type', 'TAKEAWAY');
      localStorage.setItem('foodie_order_type', 'TAKEAWAY');
    } catch (e) {}
    navigate('/customer/home');
  };

  if (!loading && (!tables || tables.length === 0)) {
    return (
      <AdminLayout>
        <PageHeader 
          title="Manage Tables" 
          showBackButton
          actions={
            <div className="d-flex align-items-center gap-2">
              <Button 
                onClick={handleTakeawayOrder} 
                variant="outline" 
                className="d-flex align-items-center gap-2 py-2 px-3 fw-bold bg-white text-danger border-danger shadow-xs"
              >
                <FiShoppingCart /> Takeaway Order
              </Button>
              {isAdmin && (
                <Button 
                  onClick={() => setIsAddOpen(true)} 
                  variant="primary" 
                  className="d-flex align-items-center gap-2 py-2 px-3"
                >
                  <FiPlus /> Add Table
                </Button>
              )}
            </div>
          }
        />
        <EmptyState
          title="No Tables Found"
          description="There are currently no tables added yet."
          icon="bi-border-all"
        />

        {/* Add Table Modal */}
        {isAdmin && isAddOpen && (
          <AddTableModal
            isOpen={isAddOpen}
            existingTables={tables}
            onClose={() => setIsAddOpen(false)}
            onAdd={handleAddTable}
          />
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader 
        title="Manage Tables" 
        showBackButton
        actions={
          <div className="d-flex align-items-center gap-2">
            <Button 
              onClick={handleTakeawayOrder} 
              variant="outline" 
              className="d-flex align-items-center gap-2 py-2 px-3 fw-bold bg-white text-danger border-danger shadow-xs"
            >
              <FiShoppingCart /> Takeaway Order
            </Button>
            {isAdmin && (
              <Button 
                onClick={() => setIsAddOpen(true)} 
                variant="primary" 
                className="d-flex align-items-center gap-2 py-2 px-3"
              >
                <FiPlus /> Add Table
              </Button>
            )}
          </div>
        }
      />

      {isAvailableOnly && (
        <div className="alert alert-info rounded-3 py-2 px-3 d-flex align-items-center justify-content-between mb-3 small shadow-xs">
          <span>Showing <strong>Available Tables Only</strong> ({filteredTables.length} available table{filteredTables.length === 1 ? '' : 's'})</span>
          <button
            onClick={() => {
              searchParams.delete('status');
              searchParams.delete('filter');
              setSearchParams(searchParams);
            }}
            className="btn btn-sm btn-outline-info rounded-pill px-3 py-1 fw-bold"
            style={{ fontSize: '11px' }}
          >
            Show All Tables
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
        {areas.map((area) => {
          const count = area === 'All' 
            ? tables.length 
            : tables.filter(t => {
                const a = (t.area || '').toLowerCase();
                const sel = area.toLowerCase();
                return a === sel || a.includes(sel.split(' ')[0]);
              }).length;

          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 border-0 fw-bold transition-all ${
                activeArea === area ? 'bg-danger text-white' : 'bg-white text-secondary border'
              }`}
              style={{ fontSize: '12px' }}
            >
              {area} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <Loader />
      ) : filteredTables.length === 0 ? (
        <EmptyState
          title="No Tables Found"
          description="There are no tables assigned to this dining area."
          icon="bi-border-all"
        />
      ) : (
        <div className="row g-3">
          {filteredTables.map((table) => {
            const canonNum = tableService.getCanonicalTableNumber(table.number || table.table_number || table.id);
            const tableIdStr = String(table.id || '').trim();
            const activeOrderForTable = (orders || []).find(o => {
              if (!o) return false;
              const INACTIVE_STATUSES = ['completed', 'cancelled', 'canceled', 'cancel', 'done', 'settled', 'delivered', 'rejected', 'void', 'voided'];
              const isActive = !INACTIVE_STATUSES.includes(String(o.status || '').toLowerCase().trim());
              if (!isActive) return false;

              const rawVal = o.tableNumber || o.table_number || o.table_no || (typeof o.table === 'object' ? (o.table?.number || o.table?.table_number || o.table?.id) : o.table);
              const oCanon = tableService.getCanonicalTableNumber(rawVal || '');
              const oTableId = String(o.table_id || o.tableId || (typeof o.table === 'object' ? o.table?.id : (typeof o.table === 'number' ? o.table : ''))).trim();

              return (oCanon && oCanon === canonNum) || (tableIdStr && oTableId && tableIdStr === oTableId);
            });
            const isTableOccupiedWithOrder = table.status === 'Occupied' || !!activeOrderForTable;
            return (
              <div key={table.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <TableCard
                  table={table}
                  onSelect={handleTakeOrder}
                  onStatusChange={handleStatusChange}
                  onEdit={(t) => setEditingTable(t)}
                  onDelete={(t) => setDeletingTable(t)}
                  onViewQR={(t) => setQrModalTable(t)}
                  isAdmin={isAdmin}
                  showActions
                  hasDishes={hasDishes}
                  hasActiveOrder={isTableOccupiedWithOrder}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isAdmin && isAddOpen && (
        <AddTableModal
          isOpen={isAddOpen}
          existingTables={tables}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddTable}
        />
      )}

      {isAdmin && editingTable && (
        <EditTableModal
          isOpen={!!editingTable}
          table={editingTable}
          existingTables={tables}
          onClose={() => setEditingTable(null)}
          onSave={handleEditSave}
        />
      )}

      {qrModalTable && (
        <QRDisplayModal
          isOpen={!!qrModalTable}
          table={qrModalTable}
          onClose={() => setQrModalTable(null)}
          onRefresh={fetchTables}
        />
      )}

      {isAdmin && deletingTable && (
        <ConfirmModal
          isOpen={!!deletingTable}
          title="Delete Table"
          message={`Are you sure you want to delete Table ${deletingTable.number || deletingTable.id}? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingTable(null)}
        />
      )}
    </AdminLayout>
  );
};
export default Tables;
