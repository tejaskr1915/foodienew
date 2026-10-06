import React, { useState } from 'react';
import formatCurrency from '../../utils/formatCurrency';
import { FiTrendingUp, FiCalendar } from 'react-icons/fi';

export const RevenueChart = ({ 
  data = [], 
  period = 'Weekly',
  onPeriodChange,
  totalRevenue,
  percentageChange,
  comparison
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const formatShortCurrency = (val) => {
    if (val === 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  const chartData = (data || []).map(d => ({
    sales: d.sales !== undefined ? d.sales : (d.value !== undefined ? d.value : 0),
    label: d.label !== undefined ? d.label : (d.day !== undefined ? d.day : ''),
    count: d.count || 0
  }));

  const maxSales = Math.max(...chartData.map(d => d.sales), 1);
  const totalSales = totalRevenue !== undefined 
    ? totalRevenue 
    : chartData.reduce((sum, item) => sum + item.sales, 0);

  // Find highest sales slot
  const peakItem = chartData.reduce((max, item) => (item.sales > (max?.sales || 0) ? item : max), chartData[0]);

  return (
    <div className="card rounded-3 border-0 shadow-sm p-4 bg-white h-100 position-relative">
      {/* Header with Title and Period Dropdown */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold text-dark mb-0">Sales Overview</h5>
            {percentageChange && (
              <span className={`badge rounded-pill px-2.5 py-1 fw-bold ${
                percentageChange.startsWith('+') ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
              }`} style={{ fontSize: '11px' }}>
                <FiTrendingUp className="me-1" />
                {percentageChange}
              </span>
            )}
          </div>
          <p className="text-secondary small mb-0 mt-1" style={{ fontSize: '12px' }}>
            {period === 'Today' ? "Today's Revenue" : period === 'Weekly' ? "Weekly Revenue" : period === 'Monthly' ? "Monthly Revenue" : period === 'Quarterly' ? "Quarterly Revenue" : period === 'Yearly' ? "Yearly Revenue" : "Period Revenue"}: <span className="fw-bold text-dark">{formatCurrency(totalSales)}</span>
            {comparison ? ` (${comparison})` : ''}
          </p>
        </div>

        {/* Dropdown with neat side padding */}
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <select
              value={period}
              onChange={(e) => onPeriodChange && onPeriodChange(e.target.value)}
              className="form-select form-select-sm rounded-pill border-light-subtle shadow-sm fw-semibold text-secondary"
              style={{
                minWidth: '150px',
                height: '38px',
                fontSize: '12px',
                cursor: 'pointer',
                paddingLeft: '16px',
                paddingRight: '36px',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0'
              }}
              aria-label="Sales Overview Period Selector"
            >
              <option value="Weekly">Weekly (7 Days)</option>
              <option value="Today">Today (Hourly)</option>
              <option value="Monthly">Monthly (Weeks)</option>
              <option value="Quarterly">Quarterly (Months)</option>
              <option value="Yearly">Yearly (Quarters)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Highlights Banner */}
      {peakItem && peakItem.sales > 0 && (
        <div className="d-flex align-items-center justify-content-between px-3 py-2 rounded-2 mb-3" style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7' }}>
          <span className="small text-danger fw-semibold" style={{ fontSize: '11.5px' }}>
            🔥 Peak Period: <strong>{peakItem.label}</strong> with <strong>{formatCurrency(peakItem.sales)}</strong>
          </span>
          <span className="badge bg-danger text-white rounded-pill px-2 py-0.5" style={{ fontSize: '10px' }}>
            Highest Sales
          </span>
        </div>
      )}

      {/* Vertical Bar Graph Container */}
      <div 
        className="position-relative pt-4 pb-2 px-2 d-flex flex-column justify-content-end"
        style={{ minHeight: '260px', height: '260px' }}
      >
        {/* Horizontal Background Grid Reference Lines */}
        <div className="position-absolute w-100" style={{ top: '35px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0', zIndex: 1 }}>
          <span className="position-absolute end-0 text-muted small pe-2" style={{ top: '-18px', fontSize: '9px' }}>
            {formatShortCurrency(maxSales)}
          </span>
        </div>
        <div className="position-absolute w-100" style={{ top: '125px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0', zIndex: 1 }}>
          <span className="position-absolute end-0 text-muted small pe-2" style={{ top: '-18px', fontSize: '9px' }}>
            {formatShortCurrency(Math.round(maxSales / 2))}
          </span>
        </div>
        <div className="position-absolute w-100" style={{ bottom: '38px', left: 0, right: 0, borderBottom: '1.5px solid #cbd5e1', zIndex: 1 }}>
          <span className="position-absolute end-0 text-muted small pe-2" style={{ bottom: '3px', fontSize: '9px' }}>
            ₹0
          </span>
        </div>

        {/* Vertical Bars Columns */}
        <div className="d-flex align-items-end justify-content-between gap-1 flex-nowrap w-100 h-100 overflow-x-auto position-relative" style={{ zIndex: 2 }}>
          {chartData.map((item, idx) => {
            const heightPercent = maxSales > 0 ? (item.sales / maxSales) * 100 : 0;
            // Bar height between 8px and 140px
            const barHeightPx = Math.max(8, Math.round((heightPercent / 100) * 140));
            const isHovered = hoveredIndex === idx;
            const isHighest = item.sales > 0 && item.sales === peakItem?.sales;

            return (
              <div 
                key={idx} 
                className="d-flex flex-column align-items-center flex-grow-1 position-relative"
                style={{ minWidth: '36px', maxWidth: '80px', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Interactive Tooltip on Hover */}
                {isHovered && (
                  <div 
                    className="position-absolute shadow-lg rounded-2 py-1 px-2 text-white bg-dark text-center"
                    style={{ 
                      bottom: `${barHeightPx + 48}px`, 
                      zIndex: 10,
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    <div className="fw-bold">{item.label}</div>
                    <div className="text-warning fw-bold">{formatCurrency(item.sales)}</div>
                    {item.count > 0 && (
                      <div className="text-white-50" style={{ fontSize: '9.5px' }}>{item.count} orders</div>
                    )}
                  </div>
                )}

                {/* Price on top of the vertical bar */}
                <span 
                  className={`small fw-bold mb-1 text-nowrap transition-all ${
                    isHovered ? 'text-dark scale-110' : isHighest ? 'text-danger' : 'text-secondary'
                  }`} 
                  style={{ 
                    fontSize: '10px',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  {formatShortCurrency(item.sales)}
                </span>

                {/* Vertical Bar Pill */}
                <div 
                  className="w-75 rounded-top position-relative"
                  style={{ 
                    height: `${barHeightPx}px`, 
                    background: isHovered
                      ? 'linear-gradient(180deg, #b91c1c 0%, #ef4444 100%)'
                      : isHighest
                        ? 'linear-gradient(180deg, #dc2626 0%, #f87171 100%)'
                        : 'linear-gradient(180deg, #ef4444 0%, #fca5a5 100%)',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isHovered ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none',
                    transform: isHovered ? 'translateY(-2px)' : 'none'
                  }}
                >
                  {/* Subtle inner top highlight */}
                  <div 
                    style={{
                      height: '3px',
                      borderRadius: '8px 8px 0 0',
                      background: 'rgba(255, 255, 255, 0.4)'
                    }}
                  />
                </div>

                {/* Time / Category label below bar */}
                <span 
                  className={`small mt-2 text-nowrap fw-semibold ${
                    isHovered ? 'text-dark fw-bold' : 'text-secondary'
                  }`} 
                  style={{ fontSize: '11px' }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
