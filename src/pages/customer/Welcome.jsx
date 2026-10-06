import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FiCornerDownRight, FiPhone, FiLock, FiCheckCircle, FiCoffee, FiShoppingBag } from 'react-icons/fi';
import { tableService } from '../../services/tableService';
import { COUNTRY_CODES, detectUserCountryCode, fetchGeolocationCountryCode } from '../../utils/countryCodes';

export const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qrParam = searchParams.get('qr');
  const tableParam = searchParams.get('table');

  const { setTable, tableContext } = useCart();
  const { sendOTP, verifyOTP } = useAuth();

  const [tableNum, setTableNum] = useState(() => {
    const init = tableParam || qrParam;
    return init ? tableService.getCanonicalTableNumber(init) : '';
  });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrDisabled, setQrDisabled] = useState(false);

  const handleSkip = () => {
    setShowOrderTypeSelection(true);
  };

  const handleSelectOrderType = (type) => {
    sessionStorage.setItem('foodie_order_type', type);
    localStorage.setItem('foodie_order_type', type);

    if (type === 'TAKEAWAY') {
      const takeawayContext = { tableNumber: 'Takeaway', tableId: 'Takeaway', orderType: 'TAKEAWAY' };
      setTable(takeawayContext);
      sessionStorage.setItem('foodie_table', JSON.stringify(takeawayContext));
      localStorage.setItem('foodie_table', JSON.stringify(takeawayContext));
    } else {
      let rawNum = tableNum || tableParam || qrParam;
      if (!rawNum || String(rawNum).toLowerCase() === 'takeaway') {
        const ctxNum = tableContext?.tableNumber;
        if (ctxNum && String(ctxNum).toLowerCase() !== 'takeaway') {
          rawNum = ctxNum;
        } else {
          rawNum = 'T01';
        }
      }
      const canon = tableService.getCanonicalTableNumber(rawNum);
      const dineInContext = { tableNumber: canon, tableId: canon, diners: 2, orderType: 'DINE_IN' };
      setTable(dineInContext);
      sessionStorage.setItem('foodie_table', JSON.stringify(dineInContext));
      localStorage.setItem('foodie_table', JSON.stringify(dineInContext));
      if (typeof tableService.occupyTableByNumber === 'function') {
        tableService.occupyTableByNumber(canon).catch(() => {});
      }
    }

    const destination = location.state?.from || '/customer/home';
    navigate(destination, { replace: true });
  };

  // Capture table context from URL parameter or existing context on load
  useEffect(() => {
    const targetQuery = tableParam || qrParam;
    if (targetQuery) {
      const canonNum = tableService.getCanonicalTableNumber(targetQuery);
      setTable({ tableNumber: canonNum, tableId: canonNum, diners: 2 });
      setTableNum(canonNum);
    }

    const loadTable = async () => {
      const targetQuery = tableParam || qrParam;
      if (targetQuery) {
        const queryStr = String(targetQuery).toUpperCase().trim();
        try {
          const [allTables, allQRs] = await Promise.all([
            tableService.getTables(),
            tableService.getQRCodes().catch(() => [])
          ]);

          // Match by ID, table_number, or QR code string
          let matchedTable = allTables.find(t => 
            String(t.id) === queryStr || 
            t.number.toUpperCase() === queryStr ||
            t.number.toUpperCase().replace(/[^0-9]/g, '') === queryStr.replace(/[^0-9]/g, '')
          );

          if (!matchedTable && allQRs.length > 0) {
            const matchedQR = allQRs.find(q => q.code.toUpperCase() === queryStr || String(q.id) === queryStr);
            if (matchedQR) {
              matchedTable = allTables.find(t => Number(t.id) === Number(matchedQR.table));
            }
          }

          if (matchedTable) {
            // Check if QR code is disabled
            const relatedQR = allQRs.find(q => Number(q.table) === Number(matchedTable.id));
            if (relatedQR && relatedQR.is_active === false) {
              setQrDisabled(true);
              setError('This table QR is currently unavailable or disabled.');
            } else {
              setQrDisabled(false);
            }

            const canonNum = tableService.getCanonicalTableNumber(matchedTable.number);
            setTable({ tableNumber: canonNum, tableId: matchedTable.id, diners: matchedTable.capacity || 2 });
            setTableNum(canonNum);
          } else {
            const canonNum = tableService.getCanonicalTableNumber(queryStr);
            setTable({ tableNumber: canonNum, tableId: canonNum, diners: 2 });
            setTableNum(canonNum);
          }
        } catch (err) {
          console.error('Error validating QR table:', err);
          const canonNum = tableService.getCanonicalTableNumber(queryStr);
          setTable({ tableNumber: canonNum, tableId: canonNum, diners: 2 });
          setTableNum(canonNum);
        }
      } else if (tableContext) {
        setTableNum(tableService.getCanonicalTableNumber(tableContext.tableNumber));
      }
    };
    loadTable();
  }, [tableParam, qrParam, tableContext, setTable]);

  const [countryCode, setCountryCode] = useState('+91');

  // Geolocation / Timezone Detection
  useEffect(() => {
    const detected = detectUserCountryCode();
    setCountryCode(detected);

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

    setLoading(true);
    try {
      // Ensure table is saved in context if set
      if (tableNum.trim()) {
        const targetTable = tableService.getCanonicalTableNumber(tableNum);
        setTable({ tableNumber: targetTable, tableId: targetTable, diners: 2 });
        if (typeof tableService.occupyTableByNumber === 'function') {
          tableService.occupyTableByNumber(targetTable).catch(() => {});
        }
      }
      
      await sendOTP(phone);
      setOtpSent(true);
      setInfoMessage('OTP sent successfully! (Demo: use any OTP e.g. 123456)');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanOtp = otp.replace(/\D/g, '').trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP sent to your mobile.');
      return;
    }

    if (cleanOtp.length !== 6) {
      setError('OTP must be exactly 6 digits. No less, no more.');
      return;
    }

    setLoading(true);
    try {
      if (tableNum.trim()) {
        const targetTable = tableService.getCanonicalTableNumber(tableNum);
        setTable({ tableNumber: targetTable, tableId: targetTable, diners: 2 });
        if (typeof tableService.occupyTableByNumber === 'function') {
          tableService.occupyTableByNumber(targetTable).catch(() => {});
        }
      }
      await verifyOTP(phone, cleanOtp);
      setShowOrderTypeSelection(true);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-wrapper w-100 min-vh-100 bg-white px-4 d-flex flex-column justify-content-between py-5 mx-auto">
      <div className="text-center mt-4">
        <h2 className="fw-bold text-danger">Foodie</h2>
        <p className="text-muted small">Welcome to digital ordering</p>
      </div>

      <div className="my-auto py-4">

        {showOrderTypeSelection ? (
          <div className="text-center py-2 animate-fade-in">
            <div className="mb-4">
              {tableNum && String(tableNum).toLowerCase() !== 'takeaway' && (
                <div className="badge bg-danger-subtle text-danger px-3 py-1.5 rounded-pill fw-bold mb-2 font-monospace" style={{ fontSize: '12px' }}>
                  Table: {tableService.getCanonicalTableNumber(tableNum)}
                </div>
              )}
              <h4 className="fw-bold text-dark mb-1">Choose Dining Option</h4>
              <p className="text-secondary small mb-0">How would you like to enjoy your food today?</p>
            </div>

            <div className="d-flex flex-column gap-3 mb-2">
              {/* Dine-In Card */}
              <button
                type="button"
                onClick={() => handleSelectOrderType('DINE_IN')}
                className="btn btn-outline-danger p-3 rounded-4 d-flex align-items-center gap-3 text-start border-2 shadow-sm bg-white dining-option-card"
                style={{ borderColor: 'var(--primary-color, #dc3545)' }}
              >
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 dining-option-icon"
                  style={{ width: '48px', height: '48px', background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}
                >
                  <FiCoffee size={24} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="fw-bold text-dark fs-6">Table Dine-In</div>
                  <span className="text-secondary small d-block mt-0.5" style={{ fontSize: '11.5px', lineHeight: '1.3' }}>
                    Food will be freshly prepared and served right at your table
                  </span>
                </div>
              </button>

              {/* Takeaway Card */}
              <button
                type="button"
                onClick={() => handleSelectOrderType('TAKEAWAY')}
                className="btn btn-outline-danger p-3 rounded-4 d-flex align-items-center gap-3 text-start border-2 shadow-sm bg-white dining-option-card"
                style={{ borderColor: 'var(--primary-color, #dc3545)' }}
              >
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 dining-option-icon"
                  style={{ width: '48px', height: '48px', background: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}
                >
                  <FiShoppingBag size={24} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="fw-bold text-dark fs-6">Takeaway</div>
                  <span className="text-secondary small d-block mt-0.5" style={{ fontSize: '11.5px', lineHeight: '1.3' }}>
                    Pick up freshly packed order at the restaurant counter
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : !otpSent ? (
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
            
            <div className="d-grid gap-2 mt-3">
              <Button type="submit" variant="primary" className="py-2.5" loading={loading}>
                Send OTP
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="py-2.5 fw-bold" 
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="alert alert-success bg-success-subtle text-success-emphasis border border-success-subtle rounded-3 text-center mb-4 py-2 small fw-semibold">
              <FiCheckCircle className="me-1" /> OTP Sent to {countryCode} {phone}
            </div>
            
            <Input
              label="Enter 6-Digit OTP"
              type="password"
              placeholder="Enter 6-digit verification code"
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

            <div className="d-grid gap-2">
              <Button 
                type="submit" 
                variant="primary" 
                className="py-2.5" 
                loading={loading}
                disabled={otp.replace(/\D/g, '').length !== 6 || loading}
              >
                Verify & Continue
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="py-2.5 fw-bold" 
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
            </div>
          </form>
        )}
      </div>

      <div>
        <div className="text-center mt-3">
          <button 
            onClick={() => navigate('/login')} 
            className="btn btn-link text-secondary btn-sm text-decoration-none fw-bold d-inline-flex align-items-center gap-1"
          >
            <FiCornerDownRight />
            Employee / Admin Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
