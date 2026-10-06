import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import SearchBar from '../../components/common/SearchBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiUser, 
  FiClock, 
  FiLayers, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiStar,
  FiHome
} from 'react-icons/fi';
import { branchService } from '../../services/branchService';
import { useAuth } from '../../hooks/useAuth';

export const Branches = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive' | 'Under Renovation'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deletingBranch, setDeletingBranch] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: 'Bangalore',
    address: '',
    phone: '',
    email: '',
    managerName: '',
    openingHours: '10:00 AM - 11:30 PM',
    tablesCount: 20,
    status: 'Active',
    isMainBranch: false,
    image: ''
  });

  const fetchBranches = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await branchService.getBranches();
      setBranches(data || []);
    } catch (e) {
      console.error("Error fetching branches:", e);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchBranches();

    const handleUpdate = () => {
      fetchBranches(false);
    };

    window.addEventListener('foodie_branches_updated', handleUpdate);
    return () => {
      window.removeEventListener('foodie_branches_updated', handleUpdate);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: `FD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      city: 'Bangalore',
      address: '',
      phone: '',
      email: '',
      managerName: '',
      openingHours: '10:00 AM - 11:30 PM',
      tablesCount: 24,
      status: 'Active',
      isMainBranch: branches.length === 0,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      city: branch.city || 'Bangalore',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      managerName: branch.managerName || '',
      openingHours: branch.openingHours || '10:00 AM - 11:30 PM',
      tablesCount: branch.tablesCount || 20,
      status: branch.status || 'Active',
      isMainBranch: Boolean(branch.isMainBranch),
      image: branch.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage('Branch name is required.');
      return;
    }
    if (!formData.code?.trim()) {
      setErrorMessage('Branch code is required.');
      return;
    }
    if (!formData.city?.trim()) {
      setErrorMessage('City is required.');
      return;
    }
    if (!formData.status?.trim()) {
      setErrorMessage('Branch status is required.');
      return;
    }
    if (!formData.address?.trim()) {
      setErrorMessage('Branch address is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage('Contact phone number is required.');
      return;
    }
    if (!formData.email?.trim()) {
      setErrorMessage('Branch email is required.');
      return;
    }
    if (!formData.managerName?.trim()) {
      setErrorMessage('Branch manager name is required.');
      return;
    }
    if (!formData.openingHours?.trim()) {
      setErrorMessage('Opening hours are required.');
      return;
    }
    if (!formData.tablesCount || Number(formData.tablesCount) <= 0) {
      setErrorMessage('Total tables count is required and must be greater than 0.');
      return;
    }
    if (!formData.image?.trim()) {
      setErrorMessage('Cover image URL is required.');
      return;
    }

    setSaveLoading(true);
    setErrorMessage('');

    try {
      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, formData);
      } else {
        await branchService.createBranch(formData);
      }
      await fetchBranches(false);
      setIsModalOpen(false);
      setEditingBranch(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save branch.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBranch) return;
    try {
      await branchService.deleteBranch(deletingBranch.id);
      setDeletingBranch(null);
      await fetchBranches(false);
    } catch (err) {
      alert(err.message || 'Failed to delete branch.');
      setDeletingBranch(null);
    }
  };

  // Filtered branches
  const filteredBranches = branches.filter(branch => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term ||
      branch.name.toLowerCase().includes(term) ||
      branch.code.toLowerCase().includes(term) ||
      branch.city.toLowerCase().includes(term) ||
      (branch.managerName && branch.managerName.toLowerCase().includes(term)) ||
      (branch.email && branch.email.toLowerCase().includes(term)) ||
      (branch.phone && branch.phone.toLowerCase().includes(term)) ||
      (branch.address && branch.address.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'All' || branch.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'Under Renovation':
        return <Badge variant="warning">Under Renovation</Badge>;
      default:
        return <Badge variant="light">{status}</Badge>;
    }
  };

  const modalFooter = (
    <div className="d-flex justify-content-end gap-2">
      <Button variant="light" onClick={() => setIsModalOpen(false)} disabled={saveLoading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={saveLoading}>
        {editingBranch ? 'Update Branch' : 'Create Branch'}
      </Button>
    </div>
  );

  const renderBranchModal = () => (
    isModalOpen && (
      <Modal
        isOpen={isModalOpen}
        title={editingBranch ? `Edit Branch: ${editingBranch.name}` : "Add New Restaurant Branch"}
        onClose={() => setIsModalOpen(false)}
        footerActions={modalFooter}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2">
              <FiAlertCircle /> {errorMessage}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-8">
              <Input 
                label="Branch Name"
                name="name"
                placeholder="e.g. Foodie CyberCity Hub"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input 
                label="Branch Code"
                name="code"
                placeholder="e.g. FD-CYBER-03"
                value={formData.code}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input 
                label="City"
                name="city"
                placeholder="e.g. Bangalore, Hyderabad, Mumbai"
                value={formData.city}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-secondary fw-semibold small">
                Branch Status <span className="text-danger">*</span>
              </label>
              <select 
                className="form-select rounded-3 py-2"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Under Renovation">Under Renovation</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label text-secondary fw-semibold small">
                Full Address / Landmark <span className="text-danger">*</span>
              </label>
              <textarea 
                className="form-control rounded-3"
                rows={2}
                name="address"
                placeholder="e.g. Ground Floor, Cyber Towers, Hitech City, Hyderabad - 500081"
                value={formData.address}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input 
                label="Contact Phone Number"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
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
                  setFormData(prev => ({ ...prev, phone: val }));
                }}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input 
                label="Branch Email"
                name="email"
                type="email"
                placeholder="e.g. branch@foodierestaurant.com"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input 
                label="Branch Manager Name"
                name="managerName"
                placeholder="e.g. Rajesh Sharma"
                value={formData.managerName}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input 
                label="Opening Hours"
                name="openingHours"
                placeholder="e.g. 10:00 AM - 11:30 PM"
                value={formData.openingHours}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input 
                label="Total Tables"
                name="tablesCount"
                type="number"
                min={1}
                max={200}
                placeholder="e.g. 24"
                value={formData.tablesCount}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12">
              <Input 
                label="Cover Image URL"
                name="image"
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-12">
              <div className="form-check form-switch mt-1">
                <input 
                  className="form-check-input"
                  type="checkbox" 
                  id="isMainBranchCheck"
                  name="isMainBranch"
                  checked={formData.isMainBranch}
                  onChange={handleFormChange}
                />
                <label className="form-check-label small fw-semibold text-dark" htmlFor="isMainBranchCheck">
                  Set as Primary / Main Headquarters Branch
                </label>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    )
  );

  if (loading && branches.length === 0) {
    return (
      <AdminLayout>
        <div className="py-5 text-center">
          <Loader />
        </div>
      </AdminLayout>
    );
  }

  if (!loading && branches.length === 0) {
    return (
      <AdminLayout>
        <PageHeader 
          title="Manage Branches" 
          showBackButton
          backUrl="/admin/dashboard"
          actions={
            isAdmin && (
              <Button 
                onClick={handleOpenAdd} 
                variant="primary" 
                className="d-flex align-items-center gap-2 py-2 px-3.5 shadow-sm rounded-pill fw-bold"
              >
                <FiPlus /> Add Branch
              </Button>
            )
          }
        />
        <EmptyState 
          icon={<FiHome size={48} className="text-secondary" />}
          title="No Branches Found"
          description="There are currently no branches added yet."
        />
        {renderBranchModal()}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader 
        title="Manage Branches" 
        showBackButton
        backUrl="/admin/dashboard"
        actions={
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {branches.length > 0 && (
              <>
                <SearchBar 
                  placeholder="Search branch name, code, city..." 
                  value={search} 
                  onChange={setSearch} 
                  style={{ width: '260px' }}
                />

                <select 
                  className="form-select form-select-sm rounded-pill px-3 py-1.5"
                  style={{ width: '170px', height: '38px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Under Renovation">Under Renovation</option>
                </select>
              </>
            )}

            {isAdmin && (
              <Button 
                onClick={handleOpenAdd} 
                variant="primary" 
                className="d-flex align-items-center gap-2 py-2 px-3.5 shadow-sm rounded-pill fw-bold"
              >
                <FiPlus /> Add Branch
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="py-5 text-center">
          <Loader />
        </div>
      ) : filteredBranches.length === 0 ? (
        <EmptyState 
          icon={<FiHome size={48} className="text-secondary" />}
          title="No Branches Found"
          description="No restaurant branches match your search criteria."
        />
      ) : (
        <div className="row g-4">
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden bg-white foodie-card transition-all position-relative">
                {/* Branch Image Cover */}
                <div className="position-relative" style={{ height: '160px' }}>
                  <img 
                    src={branch.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'} 
                    alt={branch.name}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div 
                    className="position-absolute top-0 start-0 w-100 h-100" 
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} 
                  />

                  {/* Main Branch Pill */}
                  {branch.isMainBranch && (
                    <div className="position-absolute top-0 start-0 m-3">
                      <span className="badge bg-warning text-dark fw-bold rounded-pill px-2.5 py-1 shadow-sm d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                        <FiStar className="fill-current" /> Main HQ Branch
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="position-absolute top-0 end-0 m-3">
                    {getStatusBadge(branch.status)}
                  </div>

                  {/* Branch Name & Code Overlay */}
                  <div className="position-absolute bottom-0 start-0 p-3 text-white w-100">
                    <span className="badge bg-danger bg-opacity-75 rounded-pill px-2 py-0.5 mb-1" style={{ fontSize: '10px' }}>
                      {branch.code}
                    </span>
                    <h5 className="fw-bold text-white mb-0 text-truncate" title={branch.name}>
                      {branch.name}
                    </h5>
                  </div>
                </div>

                {/* Branch Details Body */}
                <div className="card-body p-3.5 d-flex flex-column gap-2">
                  <div className="d-flex align-items-start text-secondary small">
                    <FiMapPin className="text-danger mt-1 flex-shrink-0 me-2" size={15} />
                    <span className="text-dark fw-medium line-clamp-2" style={{ fontSize: '12.5px' }}>
                      {branch.address}
                    </span>
                  </div>

                  <div className="row g-2 pt-2 border-top border-light mt-1">
                    <div className="col-6">
                      <div className="d-flex align-items-center text-secondary small">
                        <FiUser className="text-primary flex-shrink-0 me-2" size={14} />
                        <span className="text-truncate fw-semibold" title={branch.managerName} style={{ fontSize: '12px' }}>
                          {branch.managerName || 'Manager: N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center text-secondary small">
                        <FiLayers className="text-info flex-shrink-0 me-2" size={14} />
                        <span className="fw-semibold text-dark" style={{ fontSize: '12px' }}>
                          {branch.tablesCount || 0} Tables
                        </span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center text-secondary small">
                        <FiClock className="text-warning flex-shrink-0 me-2" size={14} />
                        <span className="text-truncate" title={branch.openingHours} style={{ fontSize: '11.5px' }}>
                          {branch.openingHours || '10 AM - 11 PM'}
                        </span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center text-secondary small">
                        <FiPhone className="text-success flex-shrink-0 me-2" size={14} />
                        <span className="text-truncate" title={branch.phone} style={{ fontSize: '11.5px' }}>
                          {branch.phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-center text-secondary small">
                        <FiMail className="text-primary flex-shrink-0 me-2" size={14} />
                        <a 
                          href={branch.email ? `mailto:${branch.email}` : undefined}
                          className="text-truncate text-secondary text-decoration-none fw-medium" 
                          title={branch.email} 
                          style={{ fontSize: '11.5px' }}
                        >
                          {branch.email || 'Email: N/A'}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  {isAdmin && (
                    <div className="d-flex align-items-center justify-content-between pt-3 border-top border-light mt-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(branch)}
                        className="btn btn-sm btn-outline-danger d-flex align-items-center rounded-pill px-3 py-1 fw-bold shadow-xs transition-all"
                        style={{ fontSize: '12px' }}
                      >
                        <FiEdit2 size={13} className="me-1.5" /> Edit Branch
                      </button>

                      {!branch.isMainBranch && (
                        <button
                          type="button"
                          onClick={() => setDeletingBranch(branch)}
                          className="btn btn-sm btn-link text-danger p-0 text-decoration-none d-flex align-items-center"
                          style={{ fontSize: '12px' }}
                          title={`Delete branch ${branch.name}`}
                        >
                          <FiTrash2 size={13} className="me-1" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {renderBranchModal()}

      {/* Delete Branch Confirm Modal */}
      {deletingBranch && (
        <ConfirmModal 
          isOpen={!!deletingBranch}
          title="Delete Branch"
          message={`Are you sure you want to delete "${deletingBranch.name}" (${deletingBranch.code})? This branch location will be removed from your management list.`}
          confirmText="Delete Branch"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingBranch(null)}
        />
      )}
    </AdminLayout>
  );
};

export default Branches;
