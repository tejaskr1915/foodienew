import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';

export const AddTableModal = ({
  isOpen,
  onClose,
  onAdd,
  existingTables = []
}) => {
  const [numberDigits, setNumberDigits] = useState('');
  const [capacity, setCapacity] = useState('4');
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
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
    const targetDigitsNum = parseInt(cleanDigits, 10);

    // Check for duplicate table number against real table list
    const isDuplicate = (existingTables || []).some(t => {
      const raw = String(t.number || t.table_number || t.name || '').trim().toUpperCase();
      const cleanRaw = raw.replace(/^TABLE[\s-_]*/i, '').trim();
      const rawDigits = cleanRaw.replace(/\D/g, '');
      const parsedNum = rawDigits ? parseInt(rawDigits, 10) : null;
      
      const canonFormatted = cleanRaw.startsWith('T')
        ? cleanRaw
        : (parsedNum !== null ? (parsedNum < 10 ? `T0${parsedNum}` : `T${parsedNum}`) : cleanRaw);

      return (
        canonFormatted.toUpperCase() === formattedNum.toUpperCase() ||
        (parsedNum !== null && parsedNum === targetDigitsNum)
      );
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
      await onAdd({
        number: formattedNum,
        name: `Table ${formattedNum}`,
        capacity: capNum,
        area,
        linkedMenus,
        status
      });
      setNumberDigits('');
      setCapacity('4');
      setArea('Indoor Main');
      setLinkedMenus('Main Menu');
      setStatus('Available');
      setErrorMsg('');
      onClose();
    } catch (err) {
      console.error("Error creating table:", err);
      const data = err.response?.data;
      let errMsg = '';

      if (data) {
        if (data.errors && typeof data.errors === 'object') {
          if (Array.isArray(data.errors.non_field_errors) && data.errors.non_field_errors.length > 0) {
            errMsg = data.errors.non_field_errors[0];
          } else {
            const firstKey = Object.keys(data.errors)[0];
            if (firstKey) {
              const val = data.errors[firstKey];
              errMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
            }
          }
        } else if (typeof data === 'string') {
          errMsg = data;
        } else if (Array.isArray(data)) {
          errMsg = data[0];
        } else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            errMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
          }
        }
      }

      setErrorMsg(errMsg || err.message || 'Failed to add table. Please try again.');
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
        Add Table
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} title="Add New Dining Table" onClose={onClose} footerActions={footerActions}>
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
            Prefix <strong>T</strong> is fixed. Digits only, max 3 numbers (e.g. <strong>01</strong> to create <strong>Table T01</strong>, or <strong>100</strong> for <strong>Table T100</strong>).
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
          label="Initial Status"
          options={statuses}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </form>
    </Modal>
  );
};
export default AddTableModal;
