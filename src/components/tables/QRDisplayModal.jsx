import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { qrService } from '../../services/qrService';
import { FiPrinter, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export const QRDisplayModal = ({
  isOpen,
  onClose,
  table,
  onRefresh
}) => {
  const [qrRecord, setQrRecord] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Detect or get saved network host
  const getInitialHost = () => {
    const saved = localStorage.getItem('foodie_network_host');
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
    const origin = window.location.origin.replace(/\/+$/, '');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://192.168.1.13:3000';
    }
    return origin;
  };

  const [customHost, setCustomHost] = useState(getInitialHost);
  const [isEditingHost, setIsEditingHost] = useState(false);
  const [tempHost, setTempHost] = useState(getInitialHost);

  const tableIdentifier = table ? (table.number || table.id) : '1';
  const targetUrl = table ? `${customHost}/customer/welcome?table=${encodeURIComponent(tableIdentifier)}` : '';
  const qrImageUrl = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => {
        console.warn("Local QRCode generation error, fallback to API:", err);
      });
  }, [targetUrl]);

  const handleSaveHost = (e) => {
    if (e) e.preventDefault();
    const clean = (tempHost || '').trim().replace(/\/+$/, '');
    if (clean) {
      setCustomHost(clean);
      localStorage.setItem('foodie_network_host', clean);
    }
    setIsEditingHost(false);
  };

  useEffect(() => {
    const fetchQR = async () => {
      if (!table || !isOpen) return;
      setLoading(true);
      setErrorMsg('');
      try {
        let existing = await qrService.getQRCodeByTableId(table.id);
        if (!existing) {
          try {
            existing = await qrService.createQRCode({
              table: table.id,
              code: `FOODIE-TABLE-${table.id}`,
              targetUrl: targetUrl,
              is_active: true
            });
          } catch (createErr) {
            console.warn("Could not create backend QR record, using client fallback:", createErr);
          }
        }
        setQrRecord(existing || {
          table: table.id,
          code: `FOODIE-TABLE-${table.id}`,
          qr_image_url: qrImageUrl,
          is_active: true
        });
      } catch (err) {
        console.error("Failed to load QR code:", err);
        setErrorMsg("Failed to load QR code details.");
      }
      setLoading(false);
    };

    fetchQR();
  }, [table, isOpen, targetUrl, qrImageUrl]);

  const handleToggleStatus = async () => {
    if (!qrRecord || !qrRecord.id) return;
    setUpdating(true);
    try {
      const updated = await qrService.toggleQRCodeStatus(qrRecord.id, qrRecord.is_active);
      setQrRecord(updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to toggle QR status:", err);
      alert("Unable to toggle QR status.");
    }
    setUpdating(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${table?.number || table?.id} - QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              margin: 0;
            }
            .card {
              border: 3px solid #dc3545;
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            h1 { color: #dc3545; font-size: 36px; margin-bottom: 5px; }
            h2 { font-size: 28px; margin-top: 5px; margin-bottom: 20px; color: #1e293b; }
            p { font-size: 16px; color: #64748b; margin-bottom: 25px; }
            img { width: 260px; height: 260px; margin-bottom: 20px; }
            .footer { font-size: 13px; color: #94a3b8; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Foodie</h1>
            <h2>TABLE ${table?.number || table?.id}</h2>
            <p>Scan to view menu & place your order</p>
            <img src="${qrImageUrl}" alt="Table QR Code" />
            <div class="footer">Powered by Foodie Digital Ordering</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen || !table) return null;

  const isActive = qrRecord?.is_active !== undefined ? qrRecord.is_active : true;

  const footerActions = (
    <div className="d-flex align-items-center justify-content-between w-100 gap-2 flex-wrap">
      {qrRecord?.id && (
        <Button
          variant="light"
          onClick={handleToggleStatus}
          disabled={updating}
          className="d-flex align-items-center gap-1.5 small fw-bold"
        >
          {isActive ? <FiToggleRight className="text-success fs-5" /> : <FiToggleLeft className="text-secondary fs-5" />}
          {isActive ? 'Disable QR' : 'Enable QR'}
        </Button>
      )}
      <div className="d-flex align-items-center gap-2 ms-auto">
        <Button variant="primary" onClick={handlePrint} className="d-flex align-items-center gap-1.5 py-1.5 px-3">
          <FiPrinter /> Print Card
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} title={`Table ${table.number || table.id} QR Code`} onClose={onClose} footerActions={footerActions}>
      {loading ? (
        <div className="py-5 text-center">
          <Loader />
        </div>
      ) : (
        <div className="text-center py-3">
          {errorMsg && (
            <div className="alert alert-danger py-2 small fw-semibold mb-3">{errorMsg}</div>
          )}

          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <span className="fw-bold text-dark fs-5">Table {table.number || table.id}</span>
            <span className={`badge rounded-pill ${isActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} px-3 py-1 fw-bold`} style={{ fontSize: '11px' }}>
              {isActive ? 'Active & Scannable' : 'Disabled'}
            </span>
          </div>

          <div className="p-4 rounded-4 bg-light border border-light-subtle d-inline-block mb-1 shadow-sm position-relative">
            <img 
              src={qrImageUrl} 
              alt={`QR Code Table ${table.number || table.id}`}
              className="img-fluid rounded-3"
              style={{ width: '240px', height: '240px', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default QRDisplayModal;
