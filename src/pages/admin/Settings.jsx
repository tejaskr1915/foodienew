import React, { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import Toggle from '../../components/common/Toggle';
import Button from '../../components/common/Button';

export const Settings = () => {
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const handleSave = () => {
    alert('Settings configuration saved successfully!');
  };

  return (
    <AdminLayout>
      <PageHeader title="Store Settings" showBackButton />

      <div className="card border-0 shadow-sm rounded-3 p-4 bg-white" style={{ maxWidth: '500px' }}>
        <h5 className="fw-bold text-dark mb-4 border-bottom pb-2">Configuration Panel</h5>

        <div className="mb-4">
          <h6 className="fw-bold text-dark mb-3">Notification Options</h6>
          <Toggle 
            label="Enable Desktop Notifications" 
            checked={allowNotifications} 
            onChange={() => setAllowNotifications(!allowNotifications)} 
          />
          <Toggle 
            label="Enable Kitchen Alert Audio Sound" 
            checked={soundEnabled} 
            onChange={() => setSoundEnabled(!soundEnabled)} 
          />
        </div>

        <div className="mb-4">
          <h6 className="fw-bold text-dark mb-3">Order Automation</h6>
          <Toggle 
            label="Auto-Accept Incoming QR Orders" 
            checked={autoAccept} 
            onChange={() => setAutoAccept(!autoAccept)} 
          />
          <p className="text-muted small ms-4 mt-1" style={{ fontSize: '11px' }}>
            If enabled, orders from customer tables bypass the "Pending" status and move directly to "Preparing".
          </p>
        </div>

        <div className="d-grid mt-4 pt-3 border-top">
          <Button onClick={handleSave} variant="primary">
            Save Settings Configuration
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};
export default Settings;
