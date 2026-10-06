import React from 'react';
import Badge from '../common/Badge';
import { FiLayers, FiShoppingCart, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { tableService } from '../../services/tableService';

export const TableCard = ({
  table,
  onSelect,
  onStatusChange,
  onEdit,
  onDelete,
  onViewQR,
  isAdmin = false,
  showActions = false,
  hasDishes = true,
  hasActiveOrder = false
}) => {
  const isOccupied = table.status === 'Occupied';
  const isReserved = table.status === 'Reserved';

  const rawNum = table.number || table.table_number || table.id || '';
  const displayTableNum = tableService.getCanonicalTableNumber(rawNum);

  return (
    <div className={`card rounded-3 border-0 shadow-sm p-4 bg-white table-grid-cell ${
      table.status === 'Available' ? 'table-available' : 
      table.status === 'Occupied' ? 'table-occupied' : 'table-reserved'
    }`}>
      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
        <div className="d-flex align-items-center text-nowrap" style={{ gap: '10px' }}>
          <FiLayers size={17} className="text-secondary flex-shrink-0" style={{ marginRight: '2px' }} />
          <span className="fw-bold text-dark text-nowrap" style={{ fontSize: '14px', letterSpacing: '-0.2px' }}>
            Table {displayTableNum}
          </span>
        </div>
        <div className="d-flex align-items-center flex-shrink-0" style={{ gap: '8px' }}>
          <Badge status={table.status} className="px-2.5 py-1" style={{ fontSize: '10.5px' }} />
          {isAdmin && (
            <div className="d-flex align-items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(table); }}
                className="btn btn-sm btn-outline-secondary p-0 border-0"
                style={{ borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Edit Table"
              >
                <FiEdit2 size={12} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(table); }}
                className="btn btn-sm btn-outline-danger p-0 border-0"
                style={{ borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Delete Table"
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-start mb-3 text-secondary" style={{ fontSize: '12.5px' }}>
        <div className="mb-1 text-truncate">Capacity: <strong className="text-dark">{table.capacity} Diners</strong></div>
        <div className="mb-1 text-truncate">Location: <strong className="text-dark">{table.area}</strong></div>
        {table.linkedMenus && (
          <div className="mb-1 text-truncate">Menu: <strong className="text-dark">{table.linkedMenus}</strong></div>
        )}
        {isReserved && table.reservationName && (
          <div className="text-warning-emphasis fw-semibold text-truncate">Reserved for: {table.reservationName}</div>
        )}
      </div>

      {showActions && (
        <div className="d-flex gap-2 justify-content-end pt-2.5 border-top flex-wrap align-items-center">
          {hasDishes && onViewQR && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onViewQR(table);
              }} 
              className="btn btn-sm btn-outline-dark rounded-pill px-2.5 py-1 fw-bold d-inline-flex align-items-center gap-1"
              style={{ fontSize: '11px' }}
              title="View Table QR Code"
            >
              <i className="bi bi-qr-code"></i>
              QR Code
            </button>
          )}
          {table.status === 'Available' && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!hasDishes) return;
                onStatusChange(table.id, 'Reserved');
              }} 
              disabled={!hasDishes}
              className={`btn btn-sm ${!hasDishes ? 'btn-outline-secondary opacity-50' : 'btn-outline-warning'} rounded-pill px-2.5 py-1 fw-bold`}
              style={{ fontSize: '11px', cursor: !hasDishes ? 'not-allowed' : 'pointer' }}
              title={!hasDishes ? "Cannot reserve: menu categories and dishes required" : "Reserve Table"}
            >
              Reserve
            </button>
          )}
          {(isOccupied || isReserved) && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onStatusChange(table.id, 'Available');
              }} 
              className="btn btn-sm btn-outline-success rounded-pill px-2.5 py-1 fw-bold"
              style={{ fontSize: '11px', cursor: 'pointer' }}
              title={isReserved ? "Release Reservation / Vacate" : "Vacate Table"}
            >
              Vacate
            </button>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (hasDishes === false) return;
              onSelect(table);
            }} 
            disabled={hasDishes === false}
            className={`btn btn-sm ${hasDishes === false ? 'btn-secondary opacity-50' : 'btn-danger'} rounded-pill px-2.5 py-1 fw-bold d-inline-flex align-items-center gap-1`}
            style={{ fontSize: '11px', cursor: hasDishes === false ? 'not-allowed' : 'pointer' }}
            title={hasDishes === false ? "Cannot take order: menu categories and dishes required" : "Take Order"}
          >
            <FiShoppingCart size={11} />
            Take Order
          </button>
        </div>
      )}
    </div>
  );
};
export default TableCard;
