import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { FiCheckCircle, FiClock, FiShoppingBag } from 'react-icons/fi';

export const DisplayBoard = () => {
  const [preparingOrders, setPreparingOrders] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDisplayOrders = async () => {
    try {
      const allOrders = await orderService.getOrders('ALL', false);
      const list = Array.isArray(allOrders) ? allOrders : [];

      const prep = list.filter(o => {
        const st = String(o.status || '').toLowerCase();
        return st === 'preparing' || st === 'in_kitchen' || st === 'pending';
      });

      const ready = list.filter(o => {
        const st = String(o.status || '').toLowerCase();
        return st === 'ready' || st === 'ready_for_pickup' || st === 'prepared';
      });

      setPreparingOrders(prep);
      setReadyOrders(ready);
    } catch (e) {
      console.error("DisplayBoard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayOrders();

    const handleSync = () => fetchDisplayOrders();
    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return (
    <div className="min-vh-100 bg-dark text-white p-4 p-md-5">
      <header className="d-flex align-items-center justify-content-between mb-5 border-bottom border-secondary pb-3">
        <div className="d-flex align-items-center gap-3">
          <FiShoppingBag size={38} className="text-danger" />
          <h2 className="fw-bold mb-0 text-white">ORDER STATUS DISPLAY BOARD</h2>
        </div>
        <div className="badge bg-danger fs-6 px-3 py-2 rounded-pill">
          LIVE ORDERS
        </div>
      </header>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
          <p className="mt-3 text-secondary">Loading live order status...</p>
        </div>
      ) : (
        <div className="row g-4">
          {/* Preparing Column */}
          <div className="col-12 col-md-6">
            <div className="card bg-secondary bg-opacity-10 border border-secondary border-opacity-25 rounded-4 p-4 text-center">
              <h3 className="fw-bold text-warning mb-4 d-flex align-items-center justify-content-center gap-2">
                <FiClock size={28} />
                <span>PREPARING</span>
              </h3>

              <div className="d-flex flex-wrap gap-3 justify-content-center">
                {preparingOrders.length === 0 ? (
                  <p className="text-muted my-4 fs-5">No orders currently preparing</p>
                ) : (
                  preparingOrders.map(o => (
                    <div
                      key={o.id}
                      className="bg-dark text-warning border border-warning border-opacity-50 rounded-3 px-4 py-3 shadow-sm font-monospace fs-3 fw-bold"
                      style={{ minWidth: '130px' }}
                    >
                      #{o.backendNumericId || o.id}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ready Column */}
          <div className="col-12 col-md-6">
            <div className="card bg-success bg-opacity-10 border border-success border-opacity-25 rounded-4 p-4 text-center">
              <h3 className="fw-bold text-success mb-4 d-flex align-items-center justify-content-center gap-2">
                <FiCheckCircle size={28} />
                <span>READY FOR PICKUP</span>
              </h3>

              <div className="d-flex flex-wrap gap-3 justify-content-center">
                {readyOrders.length === 0 ? (
                  <p className="text-muted my-4 fs-5">No orders ready for pickup</p>
                ) : (
                  readyOrders.map(o => (
                    <div
                      key={o.id}
                      className="bg-success text-white border border-success rounded-3 px-4 py-3 shadow-lg font-monospace fs-2 fw-bold animate-pulse"
                      style={{ minWidth: '140px' }}
                    >
                      #{o.backendNumericId || o.id}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayBoard;
