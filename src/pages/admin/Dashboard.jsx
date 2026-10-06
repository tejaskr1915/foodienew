import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import BusinessData from '../../components/dashboard/BusinessData';
import RecentActivity from '../../components/dashboard/RecentActivity';
import TopDishes from '../../components/dashboard/TopDishes';
import Loader from '../../components/common/Loader';
import { analyticsService } from '../../services/analyticsService';
import { dashboardService } from '../../services/dashboardService';
import { FiTrendingUp, FiShoppingBag, FiLayers, FiAlertCircle, FiActivity } from 'react-icons/fi';
import formatCurrency from '../../utils/formatCurrency';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [activities, setActivities] = useState([]);
  const [topDishes, setTopDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [revenueDetails, setRevenueDetails] = useState({
    revenuePeriod: "Weekly Revenue",
    revenueAmount: 0,
    comparison: "vs last week",
    percentageChange: "+0.0%",
    revenueData: []
  });

  const [businessStats, setBusinessStats] = useState(null);

  const cachedOrdersRef = React.useRef(null);
  const selectedPeriodRef = React.useRef(selectedPeriod);
  const syncDebounceTimerRef = React.useRef(null);
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    selectedPeriodRef.current = selectedPeriod;
  }, [selectedPeriod]);

  const fetchAnalytics = useCallback(async (isInitial = true) => {
    if (isFetchingRef.current && !isInitial) return;
    isFetchingRef.current = true;
    if (isInitial) setLoading(true);
    try {
      const bundle = await analyticsService.getDashboardBundle();
      cachedOrdersRef.current = bundle.allOrders || null;
      let details = {
        revenuePeriod: "Weekly Revenue",
        revenueAmount: 0,
        comparison: "vs last week",
        percentageChange: "+0.0%",
        revenueData: []
      };
      try {
        details = await dashboardService.getRevenueDetails(selectedPeriodRef.current, bundle.allOrders);
      } catch (revErr) {
        console.warn("Revenue details calculation error:", revErr);
      }
      setSummary(bundle.summary || {
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        quarterlyRevenue: 0,
        yearlyRevenue: 0,
        pendingOrders: 0,
        activeOrders: 0,
        availableTables: 0
      });
      setActivities(bundle.activities || []);
      setTopDishes(bundle.topDishes || []);
      setBusinessStats(bundle.businessStats || { customersCount: 0, ordersCount: 0, avgOrderValue: 0 });
      setRevenueDetails(details);
      setRevenue(details.revenueData || []);
    } catch (e) {
      console.error("Error loading dashboard analytics:", e);
      setSummary(prev => prev || {
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        quarterlyRevenue: 0,
        yearlyRevenue: 0,
        pendingOrders: 0,
        activeOrders: 0,
        availableTables: 0
      });
    } finally {
      if (isInitial) setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(true);

    const scheduleSync = () => {
      if (syncDebounceTimerRef.current) clearTimeout(syncDebounceTimerRef.current);
      syncDebounceTimerRef.current = setTimeout(() => {
        fetchAnalytics(false);
      }, 300);
    };

    window.addEventListener('foodie_orders_updated', scheduleSync);
    window.addEventListener('foodie_tables_updated', scheduleSync);
    window.addEventListener('foodie_inventory_updated', scheduleSync);
    window.addEventListener('foodie_products_updated', scheduleSync);
    window.addEventListener('storage', scheduleSync);

    return () => {
      if (syncDebounceTimerRef.current) clearTimeout(syncDebounceTimerRef.current);
      window.removeEventListener('foodie_orders_updated', scheduleSync);
      window.removeEventListener('foodie_tables_updated', scheduleSync);
      window.removeEventListener('foodie_inventory_updated', scheduleSync);
      window.removeEventListener('foodie_products_updated', scheduleSync);
      window.removeEventListener('storage', scheduleSync);
    };
  }, [fetchAnalytics]);

  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const updatePeriodRevenue = async () => {
      try {
        const details = await dashboardService.getRevenueDetails(selectedPeriod, cachedOrdersRef.current);
        setRevenueDetails(details);
        setRevenue(details.revenueData);
      } catch (err) {
        console.error("Error updating period revenue:", err);
      }
    };
    updatePeriodRevenue();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <AdminLayout>
        <Loader />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard Summary"
      />

      {/* Summary StatCards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(summary?.totalRevenue ?? revenueDetails?.revenueAmount ?? 0)}
            icon={FiTrendingUp}
            color="success"
            subtext={`${revenueDetails?.percentageChange || '+0.0%'} ${revenueDetails?.comparison || 'vs last period'}`}
            onClick={() => navigate('/admin/orders')}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Pending Orders"
            value={summary?.pendingOrders || 0}
            icon={FiAlertCircle}
            color="danger"
            onClick={() => navigate('/admin/orders?status=Pending')}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Orders In Progress"
            value={summary?.activeOrders || 0}
            icon={FiShoppingBag}
            color="warning"
            onClick={() => navigate('/admin/orders?status=Preparing')}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Available Tables"
            value={summary?.availableTables || 0}
            icon={FiLayers}
            color="info"
            onClick={() => navigate('/admin/tables')}
          />
        </div>
      </div>

      {/* Row 2: Recent Activity & Popular Items (ABOVE) */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <RecentActivity activities={activities} />
        </div>
        <div className="col-12 col-md-6">
          <TopDishes dishes={topDishes} />
        </div>
      </div>

      {/* Row 3: Revenue Chart & Business Data (BELOW) */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <RevenueChart
            data={revenue}
            period={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            totalRevenue={revenueDetails?.revenueAmount}
            percentageChange={revenueDetails?.percentageChange}
            comparison={revenueDetails?.comparison}
          />
        </div>
        <div className="col-12 col-lg-4">
          <BusinessData data={businessStats} />
        </div>
      </div>

      {/* Row 4: Consolidated System Analytics Metrics */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center h-100">
            <FiActivity size={32} className="text-danger mb-2 mx-auto" />
            <h6 className="fw-bold text-dark">System Health</h6>
            <p className="text-secondary small mb-0">API Connection: <strong className="text-success">Online</strong></p>
            <p className="text-secondary small mb-0">Database Latency: <strong className="text-success">14ms</strong></p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center h-100">
            <FiShoppingBag size={32} className="text-danger mb-2 mx-auto" />
            <h6 className="fw-bold text-dark">Order Stats</h6>
            <p className="text-secondary small mb-0">Conversion Rate: <strong className="text-dark">88.4%</strong></p>
            <p className="text-secondary small mb-0">Cancel Rate: <strong className="text-danger">1.2%</strong></p>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card rounded-3 border-0 shadow-sm p-4 bg-white text-center h-100">
            <FiTrendingUp size={32} className="text-danger mb-2 mx-auto" />
            <h6 className="fw-bold text-dark">Growth Metrics</h6>
            <p className="text-secondary small mb-0">New Diners: <strong className="text-success">+24%</strong></p>
            <p className="text-secondary small mb-0">Month-over-Month: <strong className="text-success">+15.8%</strong></p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Dashboard;
