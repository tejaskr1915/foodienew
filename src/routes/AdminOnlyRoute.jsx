import React from 'react';
import AdminRoute from './AdminRoute';

export const AdminOnlyRoute = ({ children }) => {
  return <AdminRoute allowEmployee={false}>{children}</AdminRoute>;
};

export default AdminOnlyRoute;
