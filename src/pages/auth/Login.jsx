import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FiLock, FiMail, FiCheckCircle, FiShield, FiKey } from 'react-icons/fi';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('foodieadmin@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter ID, 2: Enter OTP & New Password, 3: Success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    try {
      const userObj = await login(email, password);
      if (userObj.role === 'employee') {
        navigate('/employee/dashboard', { replace: true });
      } else if (userObj.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email, phone number, or password.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP / Reset Code
  const handleSendResetCode = (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered email address or mobile number.');
      return;
    }

    const cleanId = forgotIdentifier.trim().toLowerCase();
    const cleanDigits = forgotIdentifier.replace(/\D/g, '').slice(-10);
    const isAdmin = ['adim123@gmail.com', 'admin123@gmail.com', 'admin@foodie.com'].includes(cleanId);
    
    let customEmployees = [];
    try {
      customEmployees = JSON.parse(localStorage.getItem('foodie_custom_employees') || '[]');
    } catch (err) {}

    const isCustomEmp = customEmployees.some(emp => {
      const eEmail = String(emp.email || '').trim().toLowerCase();
      const ePhone = String(emp.phone || '').replace(/\D/g, '').slice(-10);
      const eId = String(emp.employeeId || emp.id || '').trim().toLowerCase();
      return eEmail === cleanId || (cleanDigits && ePhone === cleanDigits) || eId === cleanId;
    });

    if (!isAdmin && !isCustomEmp) {
      setForgotError('No employee or admin account found with this email or phone number in the directory.');
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      const randomOtp = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedOtp(randomOtp);
      setForgotLoading(false);
      setForgotStep(2);
    }, 600);
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = (e) => {
    e.preventDefault();
    setForgotError('');

    if (!resetOtp.trim()) {
      setForgotError('Please enter the 4-digit verification code.');
      return;
    }

    if (resetOtp.trim() !== generatedOtp && resetOtp.trim() !== '1234') {
      setForgotError(`Invalid verification code. Use ${generatedOtp} or 1234.`);
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-type.');
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      try {
        const cleanId = forgotIdentifier.trim().toLowerCase();
        const cleanDigits = forgotIdentifier.replace(/\D/g, '').slice(-10);

        // Save password override in localStorage
        const existingOverrides = JSON.parse(localStorage.getItem('foodie_password_overrides') || '{}');
        existingOverrides[cleanId] = newPassword;
        if (cleanDigits) existingOverrides[cleanDigits] = newPassword;
        localStorage.setItem('foodie_password_overrides', JSON.stringify(existingOverrides));

        // Update in custom employees if present
        const customEmployees = JSON.parse(localStorage.getItem('foodie_custom_employees') || '[]');
        const updatedCustom = customEmployees.map(emp => {
          const empEmail = String(emp.email || '').trim().toLowerCase();
          const empPhone = String(emp.phone || '').replace(/\D/g, '').slice(-10);
          if (empEmail === cleanId || (cleanDigits && empPhone === cleanDigits)) {
            return { ...emp, password: newPassword };
          }
          return emp;
        });
        localStorage.setItem('foodie_custom_employees', JSON.stringify(updatedCustom));
      } catch (err) {}

      // Pre-populate login fields
      setEmail(forgotIdentifier);
      setPassword(newPassword);

      setForgotLoading(false);
      setForgotStep(3);
    }, 600);
  };

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep(1);
    setForgotIdentifier('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
  };

  return (
    <div className="mobile-wrapper min-vh-100 bg-white px-4 py-5 d-flex flex-column justify-content-center mx-auto">
      <div className="text-center mb-4">
        <h2 className="fw-bold text-danger mb-1">Foodie</h2>
        <p className="text-muted small">Admin & Employee Portal</p>
      </div>

      <div className="card border-0 shadow-sm p-4 rounded-4 bg-light-subtle">
        <form onSubmit={handleSubmit}>
          <div className="text-start mb-3">
            <Input
              label="Email Address or Phone Number"
              type="text"
              placeholder="e.g. employee@foodie.com or 9876543210"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
            />
          </div>

          <div className="text-start mb-2">
            <Input
              label="Password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              required
            />
          </div>

          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              onClick={() => {
                setForgotIdentifier(email || '');
                setForgotStep(1);
                setForgotError('');
                setIsForgotModalOpen(true);
              }}
              className="btn btn-link text-danger text-decoration-none p-0 fw-semibold"
              style={{ fontSize: '12px' }}
            >
              Forgot Password?
            </button>
          </div>

          {error && <div className="text-danger small mb-3 fw-semibold text-start">{error}</div>}

          <div className="d-grid gap-2 mt-2">
            <Button type="submit" variant="primary" className="py-2.5 fw-bold" loading={loading}>
              Login to Dashboard
            </Button>
          </div>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-4 p-3 rounded-3 bg-white border small text-start">
          <div className="fw-bold text-dark mb-2">Demo Credentials (Click to fill):</div>
          <div 
            className="p-2 bg-light rounded-2 border border-light-subtle cursor-pointer d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setEmail('foodieadmin@gmail.com');
              setPassword('Admin@123');
              setError('');
            }}
            title="Click to auto-fill Admin credentials"
          >
            <div>
              <span className="badge bg-danger text-white me-2">Admin</span>
              <strong className="text-dark">foodieadmin@gmail.com</strong>
            </div>
            <span className="text-muted small">pwd: <strong>Admin@123</strong></span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white p-4 border-0">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="bg-white text-danger p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                    <FiLock size={18} />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Reset Password</h5>
                    <span className="small opacity-75">Admin & Staff Portal</span>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseForgotModal}></button>
              </div>

              <div className="modal-body p-4 bg-light text-start">
                {/* Step 1: Request Code */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendResetCode}>
                    <p className="text-secondary small mb-3">
                      Enter your registered email address or mobile number to receive a verification code and reset your password.
                    </p>

                    <div className="mb-3">
                      <label className="form-label small fw-bold text-dark">Email or Mobile Number</label>
                      <input
                        type="text"
                        required
                        className="form-control rounded-3"
                        placeholder="e.g. employee@foodie.com or 9876543210"
                        value={forgotIdentifier}
                        onChange={(e) => {
                          setForgotIdentifier(e.target.value);
                          setForgotError('');
                        }}
                      />
                    </div>

                    {forgotError && <div className="text-danger small mb-3 fw-semibold">{forgotError}</div>}

                    <div className="d-grid gap-2 mt-4">
                      <Button type="submit" variant="primary" className="py-2.5 fw-bold" loading={forgotLoading}>
                        Send Verification Code
                      </Button>
                    </div>
                  </form>
                )}

                {/* Step 2: Enter Code & New Password */}
                {forgotStep === 2 && (
                  <form onSubmit={handleResetPassword}>
                    <div className="alert alert-info py-2 px-3 small rounded-3 mb-3 d-flex align-items-center justify-content-between">
                      <span>Verification code sent to <strong>{forgotIdentifier}</strong></span>
                      <span className="badge bg-primary rounded-pill">Code: {generatedOtp}</span>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold text-dark">4-Digit Verification Code</label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        className="form-control rounded-3 text-center fw-bold fs-5 letter-spacing-2"
                        placeholder="••••"
                        value={resetOtp}
                        onChange={(e) => {
                          setResetOtp(e.target.value);
                          setForgotError('');
                        }}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold text-dark">New Password</label>
                      <input
                        type="password"
                        required
                        className="form-control rounded-3"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setForgotError('');
                        }}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold text-dark">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        className="form-control rounded-3"
                        placeholder="Re-type new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setForgotError('');
                        }}
                      />
                    </div>

                    {forgotError && <div className="text-danger small mb-3 fw-semibold">{forgotError}</div>}

                    <div className="d-grid gap-2 mt-4">
                      <Button type="submit" variant="primary" className="py-2.5 fw-bold" loading={forgotLoading}>
                        Reset Password
                      </Button>
                    </div>
                  </form>
                )}

                {/* Step 3: Success */}
                {forgotStep === 3 && (
                  <div className="text-center py-3">
                    <div className="bg-success-subtle text-success p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                      <FiCheckCircle size={32} />
                    </div>
                    <h5 className="fw-bold text-dark mb-2">Password Reset Successfully!</h5>
                    <p className="text-secondary small mb-4">
                      Your password for <strong>{forgotIdentifier}</strong> has been updated. You can now login with your new password.
                    </p>
                    <button
                      type="button"
                      className="btn btn-danger rounded-pill px-4 py-2 fw-bold w-100"
                      onClick={handleCloseForgotModal}
                    >
                      Back to Login
                    </button>
                  </div>
                )}
              </div>

              {forgotStep !== 3 && (
                <div className="modal-footer border-0 p-3 bg-white justify-content-end">
                  <button type="button" className="btn btn-secondary btn-sm rounded-pill px-4" onClick={handleCloseForgotModal}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Login;
