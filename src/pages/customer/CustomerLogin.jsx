import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FiCheckCircle } from 'react-icons/fi';
import { COUNTRY_CODES, detectUserCountryCode, fetchGeolocationCountryCode } from '../../utils/countryCodes';

export const CustomerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOTP, verifyOTP } = useAuth();
  const { clearCart } = useCart();

  // Phone & OTP state
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const destination = location.state?.from || '/customer/checkout';

  // Geolocation & Timezone Detection on component mount
  useEffect(() => {
    // 1. Instant detection from browser timezone & locale
    const detected = detectUserCountryCode();
    setCountryCode(detected);

    // 2. Fast non-blocking IP geolocation lookup
    fetchGeolocationCountryCode().then((code) => {
      if (code) setCountryCode(code);
    });
  }, []);

  const selectedCountryObj = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const reqLen = selectedCountryObj.phoneLen || 10;
    if (phone.length < reqLen) {
      setError(`Please enter a valid ${reqLen}-digit mobile number.`);
      return;
    }

    if (selectedCountryObj.pattern && !selectedCountryObj.pattern.test(phone)) {
      setError(`Please enter a valid mobile number.`);
      return;
    }

    setOtpLoading(true);
    try {
      await sendOTP(phone);
      setOtpSent(true);
      setInfoMessage('OTP sent successfully! (Demo: use 123456)');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanOtp = otp.replace(/\D/g, '').trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    if (cleanOtp.length !== 6) {
      setError('OTP must be exactly 6 digits. No less, no more.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await verifyOTP(phone, cleanOtp);
      const guestCartRaw = sessionStorage.getItem('foodie_guest_cart_unmerged') || sessionStorage.getItem('foodie_guest_cart_temp') || sessionStorage.getItem('foodie_guest_cart') || sessionStorage.getItem('foodie_cart') || localStorage.getItem('foodie_guest_cart_temp');
      let hasGuestCartItems = false;
      try {
        if (guestCartRaw) {
          const parsed = JSON.parse(guestCartRaw);
          if (Array.isArray(parsed) && parsed.length > 0) hasGuestCartItems = true;
        }
      } catch (e) {}

      if (res && res.isNewUser && !hasGuestCartItems) {
        sessionStorage.removeItem('foodie_cart');
        localStorage.removeItem('foodie_cart');
        try {
          if (typeof clearCart === 'function') await clearCart();
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('foodie_cart_updated'));
        navigate('/customer/home', { replace: true });
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="mobile-wrapper w-100 min-vh-100 bg-white px-4 py-5 d-flex flex-column justify-content-between mx-auto">
      <div>
        <div className="text-center mt-2 mb-4">
          <h2 className="fw-bold text-danger mb-1">Foodie</h2>
          <p className="text-muted small">
            {location.state?.from?.includes('checkout') ? 'Sign in to confirm your order' : 'Customer Sign In'}
          </p>
        </div>

        <div className="card border-0 shadow-sm p-4 rounded-4 bg-light-subtle">
          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <div className="text-start mb-3">
                <label className="form-label text-secondary small fw-semibold mb-1">Mobile Number</label>
                <div className="input-group">
                  <select 
                    className="form-select border-light-subtle bg-white text-dark fw-bold text-center" 
                    style={{ 
                      flex: '0 0 54px',
                      width: '54px', 
                      maxWidth: '56px', 
                      minWidth: '50px', 
                      fontSize: '12px',
                      padding: '0.65rem 0.8rem 0.65rem 0.35rem',
                      borderRadius: '10px 0 0 10px',
                      cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.2rem center',
                      backgroundSize: '8px 6px'
                    }}
                    value={countryCode}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                      setError('');
                    }}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                    <option value="+61">+61</option>
                    <option value="+65">+65</option>
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="form-control border-light-subtle py-2.5 ps-3 pe-2 text-dark fw-semibold"
                    style={{
                      flex: '1 1 auto',
                      fontSize: '13.5px',
                      borderRadius: '0 10px 10px 0',
                      borderLeft: '1px solid #dee2e6'
                    }}
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
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
                      if (start === end && String(phone || '').length >= 10) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setError('');
                    }}
                    required
                  />
                </div>
              </div>

              {error && <div className="text-danger small mb-3 fw-semibold text-start">{error}</div>}

              <div className="d-grid gap-2 mt-4">
                <Button type="submit" variant="primary" className="py-2.5 fw-bold" loading={otpLoading}>
                  Send OTP
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="alert alert-success bg-success-subtle text-success-emphasis border border-success-subtle rounded-3 text-center mb-3 py-2 small fw-semibold">
                <FiCheckCircle className="me-1" /> OTP Sent to {countryCode} {phone}
              </div>

              <Input
                label="Enter 6-Digit OTP"
                type="password"
                placeholder="Enter 6-digit code (e.g. 123456)"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                maxLength={6}
                minLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />

              {error && <div className="text-danger small mb-3 fw-semibold text-start">{error}</div>}
              {infoMessage && <div className="text-success small mb-3 fw-semibold text-start">{infoMessage}</div>}

              <div className="d-grid gap-2 mt-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="py-2.5 fw-bold" 
                  loading={otpLoading}
                  disabled={otp.replace(/\D/g, '').length !== 6 || otpLoading}
                >
                  Verify OTP & Proceed to Checkout
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="py-3"></div>
    </div>
  );
};

export default CustomerLogin;
