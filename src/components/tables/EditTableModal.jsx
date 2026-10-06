import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';

export const EditTableModal = ({
  isOpen,
  table,
  onClose,
  onSave,
  existingTables = []
}) => {
  const [numberDigits, setNumberDigits] = useState('');
  const [capacity, setCapacity] = useState('');
  const [area, setArea] = useState('Indoor Main');
  const [linkedMenus, setLinkedMenus] = useState('Main Menu');
  const [status, setStatus] = useState('Available');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const areas = [
    { value: 'Indoor Main', label: 'Indoor Main' },
    { value: 'Garden View', label: 'Garden View' },
    { value: 'Rooftop Terrace', label: 'Rooftop Terrace' }
  ];

  const menuOptions = [
    { value: 'Main Menu', label: 'Main Menu' },
    { value: 'Bar Menu', label: 'Bar Menu' },
    { value: 'Desserts Menu', label: 'Desserts Menu' }
  ];

  const statuses = [
    { value: 'Available', label: 'Available' },
    { value: 'Occupied', label: 'Occupied' },
    { value: 'Reserved', label: 'Reserved' }
  ];

  const formatTableNumber = (rawDigits) => {
    const clean = String(rawDigits || '').replace(/\D/g, '').slice(0, 3);
    if (!clean) return '';
    const n = parseInt(clean, 10);
    if (clean.length === 1) {
      return `T0${clean}`;
    }
    return `T${clean}`;
  };

  useEffect(() => {
    if (table && isOpen) {
      const rawNum = String(table.number || table.table_number || table.id || '').trim();
      const cleanDigits = rawNum.replace(/\D/g, '').slice(0, 3);
      const tDigitsMatch = rawNum.replace(/^TABLE[\s-_]*/i, '').match(/^T0*(\d{1,3})$/i);
      let initialDigits = '01';
      if (tDigitsMatch) {
        const n = parseInt(tDigitsMatch[1], 10);
        initialDigits = n < 10 ? `0${n}` : String(n);
      } else if (cleanDigits) {
        const n = parseInt(cleanDigits, 10);
        initialDigits = n < 10 ? `0${n}` : cleanDigits;
      }
      setNumberDigits(initialDigits.slice(0, 3));
      setCapacity(table.capacity !== undefined ? String(table.capacity) : '4');
      setArea(table.area || 'Indoor Main');
      setLinkedMenus(table.linkedMenus || 'Main Menu');
      setStatus(table.status || 'Available');
      setErrorMsg('');
    }
  }, [table, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanDigits = String(numberDigits || '').replace(/\D/g, '').slice(0, 3);
    if (!cleanDigits) {
      setErrorMsg('Please enter a valid table number (e.g. 01, 02, 100).');
      return;
    }

    if (cleanDigits.length > 3) {
      setErrorMsg('Table number cannot exceed 3 digits.');
      return;
    }

    const formattedNum = formatTableNumber(cleanDigits);

    // Check for duplicate table number against other tables
    const isDuplicate = existingTables.some(t => {
      if (String(t.id) === String(table?.id)) return false;
      const existingNum = String(t.number || t.table_number || '').trim().toUpperCase().replace(/^TABLE\s*/i, '');
      const existingCanon = existingNum.startsWith('T') ? existingNum : (parseInt(existingNum, 10) < 10 ? `T0${parseInt(existingNum, 10)}` : `T${existingNum}`);
      return existingCanon.toUpperCase() === formattedNum.toUpperCase();
    });

    if (isDuplicate) {
      setErrorMsg(`Table "${formattedNum}" already exists. Duplicate table numbers are not allowed.`);
      return;
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      setErrorMsg('Seating capacity must be at least 1 seat.');
      return;
    }
    if (capNum > 15) {
      setErrorMsg('Seating capacity cannot exceed 15 seats.');
      return;
    }

    setLoading(true);
    try {
      await onSave(table.id, {
        number: formattedNum,
        name: `Table ${formattedNum}`,
        capacity: capNum,
        area,
        linkedMenus,
        status
      });
      setErrorMsg('');
      onClose();
    } catch (err) {
      console.error("Error updating table:", err);
      const data = err.response?.data;
      let errMsg = '';
      if (data) {
        if (typeof data === 'string') errMsg = data;
        else if (Array.isArray(data)) errMsg = data[0];
        else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            errMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
          }
        }
      }
      setErrorMsg(errMsg || err.message || 'Failed to update table details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const footerActions = (
    <>
      <Button variant="light" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={loading}>
        Save Changes
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} title="Edit Table Details" onClose={onClose} footerActions={footerActions}>
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="alert alert-danger py-2 small fw-semibold mb-3">{errorMsg}</div>
        )}

        <div className="mb-3">
          <label className="form-label small fw-semibold text-secondary">
            Table Number <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span 
              className="input-group-text fw-bold text-white px-3"
              style={{ backgroundColor: 'var(--primary-color, #dc2626)', borderTopLeftRadius: '0.5rem', borderBottomLeftRadius: '0.5rem', fontSize: '15px' }}
            >
              T
            </span>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              className="form-control py-2 fw-semibold text-dark"
              style={{ borderTopRightRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}
              placeholder="01" 
              value={numberDigits} 
              onKeyDown={(e) => {
                if (!/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                setNumberDigits(val);
                setErrorMsg('');
              }} 
              required 
            />
          </div>
          <div className="form-text text-muted" style={{ fontSize: '11.5px' }}>
            Prefix <strong>T</strong> is fixed. Digits only, max 3 numbers (e.g. <strong>01</strong> to save as <strong>Table T01</strong>, or <strong>100</strong> for <strong>Table T100</strong>).
          </div>
        </div>

        <Input 
          label="Seating Capacity" 
          type="number"
          min={1}
          max={15}
          placeholder="1 - 15" 
          value={capacity} 
          onKeyDown={(e) => {
            if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
              e.preventDefault();
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const cur = parseInt(capacity, 10);
              const next = isNaN(cur) ? 1 : Math.min(15, cur + 1);
              setCapacity(String(next));
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const cur = parseInt(capacity, 10);
              const next = isNaN(cur) ? 1 : Math.max(1, cur - 1);
              setCapacity(String(next));
              return;
            }
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            if (raw === '') {
              setCapacity('');
              return;
            }
            const val = parseInt(raw, 10);
            if (val > 15) {
              setCapacity('15');
            } else {
              setCapacity(String(val));
            }
          }}
          onBlur={() => {
            const cap = parseInt(capacity, 10);
            if (isNaN(cap) || cap < 1) {
              setCapacity('1');
            } else if (cap > 15) {
              setCapacity('15');
            }
          }}
          required 
        />

        <Select 
          label="Area Location"
          options={areas}
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />

        <Select 
          label="Linked Menu"
          options={menuOptions}
          value={linkedMenus}
          onChange={(e) => setLinkedMenus(e.target.value)}
        />

        <Select 
          label="Table Status"
          options={statuses}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </form>
    </Modal>
  );
};

export default EditTableModal;
