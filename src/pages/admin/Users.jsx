import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import extractApiErrorMessage from '../../utils/errorUtils';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiMail,
  FiPhone,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiShield,
  FiCoffee,
  FiLayers,
  FiCreditCard
} from 'react-icons/fi';

export const Users = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' | 'kitchen' | 'floor' | 'billing' | 'management'

  // Modals state
  const [viewingUser, setViewingUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '123456',
    role: 'STAFF',
    designation: 'Waiter',
    department: 'Dining Floor'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '123456',
      role: 'STAFF',
      designation: 'Waiter',
      department: 'Dining Floor'
    });
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    resetForm();
    setIsAddModalOpen(true);
  };

  const fetchEmployees = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    try {
      const res = await api.get('/employees/?page_size=200');
      const rawEmployees = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));

      // Map backend employees
      const backendMapped = rawEmployees
        .map((emp, idx) => {
          const u = emp.user || {};
          const fullName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `Staff #${u.id || emp.id}`;
          
          const rawRoleName = (emp.employee_type || 'STAFF').toUpperCase();
          const displayRole = (rawRoleName === 'ADMIN' || rawRoleName === 'SUPER_ADMIN' || rawRoleName === 'RESTAURANT_MANAGER') ? 'admin' : 'employee';

          return {
            id: String(u.id || ''),
            employeeId: String(emp.id),
            employeeCode: emp.employee_code || u.phone || u.phone_number || `EMP-${100 + idx}`,
            name: fullName,
            email: u.email || 'N/A',
            phone: u.phone || u.phone_number || 'N/A',
            role: displayRole,
            backendRole: rawRoleName,
            designation: emp.designation || (displayRole === 'admin' ? 'Restaurant Administrator' : 'Staff Associate'),
            department: emp.department || (displayRole === 'admin' ? 'Management' : 'Dining Floor'),
            joinedDate: emp.created_at ? new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '2024'),
            isBackendUser: true
          };
        })
        .filter(Boolean);

      setEmployees(backendMapped);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(true);

    const handleSync = () => {
      fetchEmployees(false);
    };

    const handleStorage = (e) => {
      if (e.key === 'foodie_users_sync_trigger') {
        fetchEmployees(false);
      }
    };

    window.addEventListener('foodie_users_updated', handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('foodie_users_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const stats = useMemo(() => {
    const kitchen = employees.filter(e => {
      const d = (e.department || '').toLowerCase();
      return d.includes('kitchen') || d.includes('chef');
    }).length;
    const floor = employees.filter(e => {
      const d = (e.department || '').toLowerCase();
      return d.includes('floor') || d.includes('dining') || d.includes('waiter');
    }).length;
    const billing = employees.filter(e => {
      const d = (e.department || '').toLowerCase();
      return d.includes('billing') || d.includes('cashier');
    }).length;
    const management = employees.filter(e => {
      const d = (e.department || '').toLowerCase();
      return d.includes('management') || e.role === 'admin';
    }).length;

    return {
      total: employees.length,
      kitchenStaff: kitchen,
      floorStaff: floor,
      billingStaff: billing,
      managementStaff: management
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (selectedTab !== 'all') {
      result = result.filter(emp => {
        const dept = (emp.department || '').toLowerCase();
        if (selectedTab === 'kitchen') return dept.includes('kitchen') || dept.includes('chef');
        if (selectedTab === 'floor') return dept.includes('floor') || dept.includes('dining') || dept.includes('waiter');
        if (selectedTab === 'billing') return dept.includes('billing') || dept.includes('cashier');
        if (selectedTab === 'management') return dept.includes('management') || emp.role === 'admin';
        return true;
      });
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(emp =>
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term) ||
        (emp.phone || '').includes(term) ||
        (emp.designation || '').toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return true;
    });
  }, [employees, selectedTab, search]);

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (
      !formData.name?.trim() ||
      !formData.email?.trim() ||
      !formData.role?.trim() ||
      !formData.designation?.trim() ||
      !formData.department?.trim() ||
      (!editingUser && !formData.password?.trim())
    ) {
      alert('Please fill in all mandatory fields (including Password for new employee).');
      return;
    }

    const cleanPhone = String(formData.phone || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number (cannot exceed or be less than 10 digits).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const targetUserId = editingUser.id;
        const targetEmpId = editingUser.employeeId;

        if (targetUserId && targetUserId !== 'undefined') {
          await api.patch(`/users/users/${targetUserId}/`, {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: cleanPhone,
            phone_number: cleanPhone,
          }).catch(err => {
            return api.patch(`/users/${targetUserId}/`, {
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: cleanPhone,
              phone_number: cleanPhone,
            });
          });
        }

        if (targetEmpId && targetEmpId !== 'undefined') {
          await api.patch(`/employees/${targetEmpId}/`, {
            employee_type: formData.role.toUpperCase(),
            designation: formData.designation.trim(),
            department: formData.department.trim()
          });
        }
      } else {
        const userRes = await api.post('/users/users/', {
          name: formData.name.trim(),
          username: `emp_${cleanPhone}`,
          email: formData.email.trim(),
          phone: cleanPhone,
          phone_number: cleanPhone,
          password: formData.password.trim(),
          is_active: true,
          is_staff: true,
        }).catch(err => {
          return api.post('/users/', {
            name: formData.name.trim(),
            username: `emp_${cleanPhone}`,
            email: formData.email.trim(),
            phone: cleanPhone,
            phone_number: cleanPhone,
            password: formData.password.trim(),
            is_active: true,
            is_staff: true,
          });
        });

        const createdUser = userRes.data?.data || userRes.data;
        const newUserId = createdUser?.id;

        if (!newUserId) throw new Error("Backend did not return a valid User ID.");

        await api.post('/employees/', {
          user_id: newUserId,
          user: newUserId, // sending both just in case
          employee_code: cleanPhone,
          employee_type: formData.role.toUpperCase(),
          designation: formData.designation.trim(),
          department: formData.department.trim(),
          status: 'ACTIVE',
          is_active: true,
          restaurant: 1
        });
      }

      setIsAddModalOpen(false);
      resetForm();
      setEditingUser(null);
      await fetchEmployees(false);
      
      try {
        window.dispatchEvent(new CustomEvent('foodie_users_updated'));
        localStorage.setItem('foodie_users_sync_trigger', Date.now().toString());
      } catch (e) { }

      alert(editingUser ? 'Employee updated successfully!' : 'Employee added successfully!');
    } catch (err) {
      console.error('Failed to save employee:', err);
      const msg = typeof extractApiErrorMessage === 'function' ? extractApiErrorMessage(err, 'Failed to save employee.') : (err.response?.data?.detail || err.response?.data?.email?.[0] || err.message || 'Failed to save employee.');
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || user.phone_number || '',
      password: '',
      role: user.backendRole || 'STAFF',
      designation: user.designation || 'Staff',
      department: user.department || 'Dining Floor'
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm(`Are you sure you want to remove this employee from the staff directory?`)) {
      return;
    }

    const userObj = employees.find(e => e.id === userId || e.employeeId === userId);
    if (!userObj) return;

    try {
      if (userObj.employeeId && userObj.employeeId !== 'undefined') {
        await api.delete(`/employees/${userObj.employeeId}/`);
      }
      if (userObj.id && userObj.id !== 'undefined') {
        await api.delete(`/users/users/${userObj.id}/`).catch(() => api.delete(`/users/${userObj.id}/`)).catch(()=>console.warn("Could not delete user"));
      }

      try {
        window.dispatchEvent(new CustomEvent('foodie_users_updated'));
        localStorage.setItem('foodie_users_sync_trigger', Date.now().toString());
      } catch (err) { }

      await fetchEmployees(false);
    } catch (err) {
      console.error("Delete employee failed:", err);
      const msg = typeof extractApiErrorMessage === 'function' ? extractApiErrorMessage(err, 'Failed to delete employee from backend.') : 'Failed to delete employee.';
      alert(msg);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Employee Directory & Staff"
        showBackButton
        actions={
          employees.length > 0 ? (
            <button
              className="btn btn-danger btn-sm rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
              onClick={handleOpenAddModal}
            >
              <FiPlus size={16} />
              <span>Add New Employee</span>
            </button>
          ) : null
        }
      />

      {loading ? (
        <Loader />
      ) : employees.length === 0 ? (
        /* Empty State when there are NO employees at all: Only shows the Add New Employee button */
        <div className="card border-0 shadow-sm rounded-4 p-5 bg-white text-center d-flex flex-column align-items-center justify-content-center my-4" style={{ minHeight: '420px' }}>
          <div className="bg-danger-subtle text-danger p-4 rounded-circle mb-3 d-inline-flex align-items-center justify-content-center" style={{ width: '84px', height: '84px' }}>
            <FiUsers size={38} />
          </div>
          <h4 className="fw-bold text-dark mb-2">No Employees Registered Yet</h4>
          <p className="text-secondary small mb-4" style={{ maxWidth: '440px' }}>
            Your staff directory is currently empty. Click the button below to add your first employee and manage departments and roles.
          </p>
          <button
            className="btn btn-danger rounded-pill px-4 py-2.5 fw-bold d-flex align-items-center gap-2 shadow-sm"
            onClick={handleOpenAddModal}
          >
            <FiPlus size={18} />
            <span>Add New Employee</span>
          </button>
        </div>
      ) : (
        /* When employees are present: Render Stat Cards, Tabs, Search Bar, and Table */
        <>
          {/* Overview Stat Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="small text-secondary fw-bold text-uppercase">Total Employees</span>
                    <h3 className="fw-bold text-dark mb-0 mt-1">{stats.total}</h3>
                  </div>
                  <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                    <FiUsers size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="small text-secondary fw-bold text-uppercase">Kitchen & Chefs</span>
                    <h3 className="fw-bold text-danger mb-0 mt-1">{stats.kitchenStaff}</h3>
                  </div>
                  <div className="bg-danger-subtle text-danger p-3 rounded-circle">
                    <FiCoffee size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="small text-secondary fw-bold text-uppercase">Waiters & Floor</span>
                    <h3 className="fw-bold text-warning mb-0 mt-1">{stats.floorStaff}</h3>
                  </div>
                  <div className="bg-warning-subtle text-warning p-3 rounded-circle">
                    <FiLayers size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="small text-secondary fw-bold text-uppercase">Cashiers & POS</span>
                    <h3 className="fw-bold text-info mb-0 mt-1">{stats.billingStaff}</h3>
                  </div>
                  <div className="bg-info-subtle text-info p-3 rounded-circle">
                    <FiCreditCard size={22} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
              {/* Tabs */}
              <div className="d-flex flex-wrap gap-2">
                {[
                  { key: 'all', label: `All Staff (${stats.total})` },
                  { key: 'kitchen', label: `Kitchen & Chefs (${stats.kitchenStaff})` },
                  { key: 'floor', label: `Floor Waiters (${stats.floorStaff})` },
                  { key: 'billing', label: `Cashiers & POS (${stats.billingStaff})` },
                  { key: 'management', label: `Management & Admin (${stats.managementStaff})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold transition-all ${selectedTab === tab.key
                      ? 'bg-danger text-white border-0 shadow-xs'
                      : 'bg-light text-secondary border border-light-subtle'
                      }`}
                    style={{ fontSize: '12px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="position-relative" style={{ width: '260px' }}>
                <FiSearch className="position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search staff, ID, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control form-control-sm rounded-pill border-secondary-subtle ps-5 py-1.5"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Staff / Employee Table */}
            {filteredEmployees.length === 0 ? (
              <EmptyState
                title="No Staff Members Found"
                description="Try adjusting your search query or selected department filter."
                icon="bi-people"
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr className="text-secondary small border-bottom" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                      <th className="py-3">STAFF MEMBER</th>
                      <th className="py-3">ROLE & DESIGNATION</th>
                      <th className="py-3">DEPARTMENT</th>
                      <th className="py-3">CONTACT INFO</th>
                      <th className="py-3 text-end">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((u) => {
                      const empId = u.employeeCode || u.phone;
                      const initials = u.name ? u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'E';

                      return (
                        <tr key={u.id} className="small">
                          <td className="py-3">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-xs"
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  backgroundColor: u.role === 'admin' ? '#dc2626' : '#d97706',
                                  fontSize: '13px'
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                                  {u.name}
                                  <span className="badge bg-light text-muted border font-monospace px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                                    {empId}
                                  </span>
                                </div>
                                <span className="text-muted small" style={{ fontSize: '11px' }}>
                                  Joined: {u.joinedDate || '2024'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-dark fw-bold fs-6">
                                {u.designation || 'Staff Member'}
                              </span>
                              {u.role === 'admin' && (
                                <span className="badge bg-danger text-white rounded-pill px-2 py-0.5 fw-bold" style={{ fontSize: '10px' }}>
                                  <FiShield className="me-1" size={10} />Admin
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3">
                            <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill fw-semibold" style={{ fontSize: '11.5px' }}>
                              {u.department || 'General'}
                            </span>
                          </td>

                          <td className="py-3">
                            <div className="d-flex flex-column gap-1">
                              <div className="text-dark d-flex align-items-center gap-1.5" style={{ fontSize: '12px' }}>
                                <FiMail size={12} className="text-secondary" />
                                <span>{u.email}</span>
                              </div>
                              <div className="text-muted small d-flex align-items-center gap-1.5" style={{ fontSize: '11px' }}>
                                <FiPhone size={11} className="text-secondary" />
                                <span>{u.phone}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-3">
                              <button
                                onClick={() => setViewingUser(u)}
                                className="btn btn-sm btn-light rounded-circle text-primary p-0 d-inline-flex align-items-center justify-content-center shadow-xs"
                                style={{ width: '34px', height: '34px', border: '1px solid #e2e8f0' }}
                                title="View Full Details"
                              >
                                <FiEye size={15} />
                              </button>

                              <button
                                onClick={() => handleEditEmployee(u)}
                                className="btn btn-sm btn-light rounded-circle text-dark p-0 d-inline-flex align-items-center justify-content-center shadow-xs"
                                style={{ width: '34px', height: '34px', border: '1px solid #e2e8f0' }}
                                title="Edit Staff Info"
                              >
                                <FiEdit2 size={14} />
                              </button>

                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteEmployee(u.id)}
                                  className="btn btn-sm btn-light rounded-circle text-danger p-0 d-inline-flex align-items-center justify-content-center shadow-xs"
                                  style={{ width: '34px', height: '34px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2' }}
                                  title="Delete / Remove"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal 1: View Employee Dossier / Profile */}
      {viewingUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white p-4 border-0">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-white text-danger fw-extrabold rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                    {viewingUser.name ? viewingUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'E'}
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">{viewingUser.name}</h5>
                    <span className="small opacity-75 font-monospace">{viewingUser.employeeId || `ID #${viewingUser.id}`}</span>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setViewingUser(null)}></button>
              </div>

              <div className="modal-body p-4 bg-light">
                <div className="card rounded-3 border-0 shadow-xs p-3 bg-white mb-3">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Role & Department Info</h6>
                  <div className="row g-3 small">
                    <div className="col-6">
                      <span className="text-secondary d-block">Designation</span>
                      <strong className="text-dark fs-6">{viewingUser.designation || 'Staff'}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-secondary d-block">Department</span>
                      <strong className="text-dark fs-6">{viewingUser.department || 'Operations'}</strong>
                    </div>
                    <div className="col-12">
                      <span className="text-secondary d-block">Access Level</span>
                      <div className="mt-1">
                        <span className={`badge rounded-pill px-2.5 py-1 fw-bold ${viewingUser.role === 'admin' ? 'bg-danger text-white' : 'bg-secondary text-white'}`}>
                          {viewingUser.role === 'admin' ? 'Administrator' : 'Employee / Staff'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card rounded-3 border-0 shadow-xs p-3 bg-white mb-3">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Contact Information</h6>
                  <div className="row g-3 small">
                    <div className="col-12">
                      <span className="text-secondary d-block">Email Address</span>
                      <strong className="text-dark">{viewingUser.email}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-secondary d-block">Phone Number</span>
                      <strong className="text-dark">{viewingUser.phone}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-secondary d-block">Joined Date</span>
                      <strong className="text-dark">{viewingUser.joinedDate || '2024'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 p-3 bg-white justify-content-end">
                <button type="button" className="btn btn-secondary btn-sm rounded-pill px-4" onClick={() => setViewingUser(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add or Edit Employee */}
      {(isAddModalOpen || editingUser) && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-dark text-white p-4 border-0">
                <h5 className="modal-title fw-bold">
                  {editingUser ? `Edit Staff Member: ${editingUser.name}` : 'Add New Staff / Employee'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                ></button>
              </div>

              <form onSubmit={handleSaveEmployee}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Full Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control rounded-3"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Email Address *</label>
                      <input
                        type="email"
                        required
                        className="form-control rounded-3"
                        placeholder="e.g. rahul.staff@foodie.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    {!editingUser && (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-secondary">Password *</label>
                        <input
                          type="password"
                          required
                          minLength={4}
                          className="form-control rounded-3"
                          placeholder="Default is 123456"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Phone Number *</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                        className="form-control rounded-3"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onKeyDown={(e) => {
                          if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) || e.ctrlKey || e.metaKey) {
                            return;
                          }
                          if (!/^[0-9]$/.test(e.key)) {
                            e.preventDefault();
                            return;
                          }
                          const start = e.target.selectionStart ?? 0;
                          const end = e.target.selectionEnd ?? 0;
                          if (start === end && String(formData.phone || '').length >= 10) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: val });
                        }}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Role / Access Level *</label>
                      <select
                        className="form-select rounded-3"
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="STAFF">Employee / Staff</option>
                        <option value="ADMIN">Administrator / Manager</option>
                        <option value="CHEF">Chef / Kitchen Staff</option>
                        <option value="CASHIER">Cashier / Billing Staff</option>
                        <option value="WAITER">Waiter / Dining Floor Staff</option>
                        <option value="DELIVERY">Logistics & Delivery Staff</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Designation / Job Title *</label>
                      <input
                        type="text"
                        required
                        className="form-control rounded-3"
                        placeholder="e.g. Head Chef, Waiter, Cashier"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-secondary">Department *</label>
                      <select
                        className="form-select rounded-3"
                        required
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="Dining Floor">Dining Floor (Waiters/Servers)</option>
                        <option value="Kitchen">Kitchen (Chefs & Cooks)</option>
                        <option value="Billing & POS">Billing & POS Counter</option>
                        <option value="Logistics">Logistics & Delivery</option>
                        <option value="Management">Management</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 p-3 bg-light">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="btn btn-secondary btn-sm rounded-pill px-4"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-danger btn-sm rounded-pill px-4 fw-bold d-flex align-items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      editingUser ? 'Save Changes' : 'Add Employee'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
export default Users;
