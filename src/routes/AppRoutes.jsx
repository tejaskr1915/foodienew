import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AdminOnlyRoute from './AdminOnlyRoute';

// Pages
import Splash from '../pages/auth/Splash';
import Welcome from '../pages/customer/Welcome';
import CustomerLogin from '../pages/customer/CustomerLogin';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Home from '../pages/customer/Home';
import FoodDetails from '../pages/customer/FoodDetails';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import Payment from '../pages/customer/Payment';
import OrderConfirmation from '../pages/customer/OrderConfirmation';
import OrderHistory from '../pages/customer/OrderHistory';
import OrderTracking from '../pages/customer/OrderTracking';
import DisplayBoard from '../pages/customer/DisplayBoard';

// Admin Pages
import Dashboard from '../pages/admin/Dashboard';
import Orders from '../pages/admin/Orders';
import Tables from '../pages/admin/Tables';
import Menus from '../pages/admin/Menus';
import MenuEditor from '../pages/admin/MenuEditor';
import Kitchen from '../pages/admin/Kitchen';
import Users from '../pages/admin/Users';
import Inventory from '../pages/admin/Inventory';
import Branches from '../pages/admin/Branches';
import Offers from '../pages/admin/Offers';
import Analytics from '../pages/admin/Analytics';
import Settings from '../pages/admin/Settings';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Onboarding & Auth */}
      <Route path="/" element={<Splash />} />
      <Route path="/customer/welcome" element={<Welcome />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Customer Pages (Open to Guests) */}
      <Route path="/customer/home" element={<Home />} />
      <Route path="/customer/food/:id" element={<FoodDetails />} />
      <Route path="/customer/cart" element={<Cart />} />
      <Route path="/customer/checkout" element={
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      } />
      <Route path="/customer/payment" element={
        <ProtectedRoute>
          <Payment />
        </ProtectedRoute>
      } />
      <Route path="/customer/order-confirmation" element={
        <ProtectedRoute>
          <OrderConfirmation />
        </ProtectedRoute>
      } />
      <Route path="/customer/orders" element={
        <ProtectedRoute>
          <OrderHistory />
        </ProtectedRoute>
      } />
      <Route path="/customer/order-tracking/:orderId" element={
        <ProtectedRoute>
          <OrderTracking />
        </ProtectedRoute>
      } />
      <Route path="/customer/display-board" element={<DisplayBoard />} />
      <Route path="/display-board" element={<DisplayBoard />} />

      {/* Admin/Employee Protected Pages */}
      <Route path="/admin/dashboard" element={
        <AdminOnlyRoute>
          <Dashboard />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/employee-dashboard" element={
        <AdminRoute>
          <EmployeeDashboard />
        </AdminRoute>
      } />
      <Route path="/employee/dashboard" element={
        <AdminRoute>
          <EmployeeDashboard />
        </AdminRoute>
      } />
      <Route path="/employee/tables" element={
        <AdminRoute>
          <Tables />
        </AdminRoute>
      } />
      <Route path="/admin/orders" element={
        <AdminRoute>
          <Orders />
        </AdminRoute>
      } />
      <Route path="/employee/orders" element={
        <AdminRoute>
          <Orders />
        </AdminRoute>
      } />
      <Route path="/admin/tables" element={
        <AdminRoute>
          <Tables />
        </AdminRoute>
      } />
      <Route path="/admin/menus" element={
        <AdminOnlyRoute>
          <MenuEditor />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/menus/:menuId" element={
        <AdminOnlyRoute>
          <MenuEditor />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/kitchen" element={
        <AdminOnlyRoute>
          <Kitchen />
        </AdminOnlyRoute>
      } />
      <Route path="/employee/kitchen" element={
        <AdminRoute>
          <Kitchen />
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminOnlyRoute>
          <Users />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/inventory" element={
        <AdminOnlyRoute>
          <Inventory />
        </AdminOnlyRoute>
      } />
      <Route path="/employee/inventory" element={
        <AdminRoute>
          <Inventory />
        </AdminRoute>
      } />
      <Route path="/admin/branches" element={
        <AdminOnlyRoute>
          <Branches />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/offers" element={
        <AdminOnlyRoute>
          <Offers />
        </AdminOnlyRoute>
      } />
      <Route path="/admin/analytics" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/settings" element={
        <AdminOnlyRoute>
          <Settings />
        </AdminOnlyRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
export default AppRoutes;
