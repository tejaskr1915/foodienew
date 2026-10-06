import { orderService } from '../services/orderService';
import api from '../services/api';

/**
 * Dynamically load jsPDF so that Vite / builds do not crash if jspdf is not yet installed on other machines
 */
let cachedJsPDF = null;
const getJsPDF = async () => {
  if (cachedJsPDF) return cachedJsPDF;
  try {
    const mod = await import(/* @vite-ignore */ 'jspdf');
    cachedJsPDF = mod.jsPDF || mod.default || mod;
    return cachedJsPDF;
  } catch (err) {
    if (typeof window !== 'undefined' && (window.jspdf?.jsPDF || window.jsPDF)) {
      cachedJsPDF = window.jspdf?.jsPDF || window.jsPDF;
      return cachedJsPDF;
    }
    console.warn('[E-BILL] jsPDF is not installed or available:', err);
    return null;
  }
};

/**
 * Fallback to generate a clean printable HTML invoice if jsPDF is unavailable
 */
const printHtmlInvoice = (order, backendId, payment, customer) => {
  try {
    const displayOrderNum = String(backendId || order.id || order.backendNumericId || 'N/A');
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = parseFloat(order.subtotal || 0) || items.reduce((s, i) => s + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
    const isTakeaway = order.orderType === 'Takeaway' || order.table === 'Takeaway' || order.packingCharge > 0 || order.packing_charge > 0;
    const totalQty = items.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
    const packingCharge = parseFloat(order.packingCharge || order.packing_charge || (isTakeaway ? totalQty * 15 : 0));
    const discount = parseFloat(order.discount || 0);
    const taxableAmount = Math.max(0, subtotal - discount) + (isTakeaway ? packingCharge : 0);
    const customRound = (value) => {
      const decimal = value - Math.floor(value);
      return decimal >= 0.50 ? Math.ceil(value) : Math.floor(value);
    };

    const tax = parseFloat(order.tax || 0) || customRound(taxableAmount * 0.05);
    const deliveryFee = parseFloat(order.deliveryFee || order.delivery_fee || 0);
    const total = parseFloat(order.total || order.total_amount || 0) || Math.max(0, taxableAmount + tax + deliveryFee);
    const dateStr = order.date ? `${order.date} ${order.time || ''}` : new Date(order.placedAt || Date.now()).toLocaleString('en-IN');

    const rawPm = (payment?.payment_method || order.paymentMethod || order.payment_method || 'COD').toUpperCase();
    let pmDisplay = 'Cash (COD)';
    if (rawPm.includes('UPI')) pmDisplay = 'UPI Mobile';
    else if (rawPm.includes('CARD') || rawPm.includes('CREDIT') || rawPm.includes('DEBIT')) pmDisplay = 'Credit / Debit Card';
    else if (rawPm.includes('CASH') || rawPm.includes('COD')) pmDisplay = 'Cash (COD)';

    const rawPayStatus = String(payment?.payment_status || payment?.status || order.paymentStatus || order.payment_status || '').toUpperCase();
    const orderStatus = String(order.status || '').toUpperCase();
    const isFailed = rawPayStatus.includes('FAIL') ||
      rawPayStatus.includes('CANCEL') ||
      rawPayStatus.includes('REJECT') ||
      rawPayStatus === 'UNPAID' ||
      rawPayStatus === 'DECLINED' ||
      orderStatus === 'CANCELLED' ||
      orderStatus === 'REJECTED';

    const payStatusDisplay = isFailed ? 'FAILED' : 'COMPLETED';
    const payStatusColor = isFailed ? '#dc2626' : '#166534';

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Please allow popups to view and print the invoice.");
      return false;
    }

    const customerPhoneRaw = String(order.customerPhone || order.phone || order.user?.phone || '');
    const cleanPhone = customerPhoneRaw.replace(/\D/g, '');
    let maskedPhone = '';
    if (cleanPhone.length >= 10) {
      maskedPhone = cleanPhone.slice(0, 2) + 'XXXXXX' + cleanPhone.slice(-2);
    } else if (cleanPhone) {
      maskedPhone = cleanPhone.slice(0, 1) + 'XXXXX' + cleanPhone.slice(-1);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Foodie Invoice - #${displayOrderNum}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            color: #1e293b; 
            padding: 20px 30px; 
            margin: 0 auto; 
            max-width: 210mm;
            min-height: 297mm;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .main-content { flex: 1; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 24px; font-weight: bold; color: #dc2626; }
          .title { font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 4px; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; gap: 16px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; flex: 1; }
          .meta-box div { margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .totals { margin-left: auto; width: 320px; font-size: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; }
          .totals div { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .grand-total { font-weight: bold; font-size: 16px; color: #dc2626; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
          .neat-footer { 
            border-top: 1px solid #e2e8f0; 
            padding-top: 12px; 
            margin-top: 40px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            font-size: 12px; 
            color: #64748b; 
          }
          .neat-footer strong { color: #1e293b; }
          @media print { 
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="main-content">
          <div class="header">
            <div class="brand">FOODIE RESTAURANT</div>
            <div class="title">E-BILL / INVOICE</div>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <div><strong>Order:</strong> ${displayOrderNum}</div>
              <div><strong>Date:</strong> ${dateStr}</div>
              <div><strong>Table/Type:</strong> ${order.table || 'Takeaway'}</div>
              <div><strong>Order Status:</strong> ${order.status || 'Completed'}</div>
              ${maskedPhone ? `<div><strong>Mobile:</strong> ${maskedPhone}</div>` : ''}
            </div>
            <div class="meta-box">
              <div><strong>Payment Method:</strong> ${pmDisplay}</div>
              <div><strong>Payment Status:</strong> <span style="color:${payStatusColor}; font-weight:bold;">${payStatusDisplay}</span></div>
              <div><strong>Transaction Ref:</strong> ${payment?.transaction_id || `TXN_${rawPm}_${String(backendId || '101')}`}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.name}</strong>${it.instructions ? `<br><small style="color:#64748b;">${it.instructions}</small>` : ''}</td>
                  <td style="text-align:center;">${it.quantity || 1}</td>
                  <td style="text-align:right;">Rs. ${parseFloat(it.price || 0).toFixed(2)}</td>
                  <td style="text-align:right;">Rs. ${(parseFloat(it.price || 0) * parseInt(it.quantity || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal:</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
            ${(isTakeaway && packingCharge > 0) ? `<div><span>Packing Charges:</span><span>Rs. ${packingCharge.toFixed(2)}</span></div>` : ''}
            ${discount > 0 ? `<div style="color:#166534;"><span>Discount:</span><span>-Rs. ${discount.toFixed(2)}</span></div>` : ''}
            <div><span>GST (5%):</span><span>Rs. ${tax.toFixed(2)}</span></div>
            <div><span>Service Charge (2%):</span><span style="${(order.isServiceChargeRemoved || order.serviceCharge === 0) ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${(order.isServiceChargeRemoved || order.serviceCharge === 0) ? 'Rs. 0.00' : ('Rs. ' + parseFloat(order.serviceCharge !== undefined ? order.serviceCharge : (order.service_charge !== undefined ? order.service_charge : customRound(Math.max(0, subtotal - discount) * 0.02))).toFixed(2))}</span></div>
            ${deliveryFee > 0 ? `<div><span>Delivery:</span><span>Rs. ${deliveryFee.toFixed(2)}</span></div>` : ''}
            <div class="grand-total"><span>Grand Total:</span><span>Rs. ${total.toFixed(2)}</span></div>
          </div>
        </div>
        <div class="neat-footer">
          <div>
            <strong>Thank you for dining with Foodie Restaurant!</strong><br>
            <span>For feedback or queries: www.foodie.com | Helpline: +91 98765 43210</span>
          </div>
          <div style="text-align:right;">
            <span>Generated on ${new Date().toLocaleString('en-IN')}</span><br>
            <span>Computer Generated Tax Invoice</span>
          </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 9px 22px; font-size:14px; font-weight:bold; background:#dc2626; color:#fff; border:none; border-radius:6px; cursor:pointer;">Print Bill</button>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  } catch (err) {
    console.error('[PRINT INVOICE ERROR]', err);
    return false;
  }
};

/**
 * Helper to format currency numbers for PDF rendering
 */
const formatPdfCurrency = (amount) => {
  const num = parseFloat(amount || 0);
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Fetch authoritative backend order details and payments for E-Bill generation
 */
export const getBackendOrderDataForEBill = async (orderOrId) => {
  let targetOrder = typeof orderOrId === 'object' ? orderOrId : null;
  let inputId = typeof orderOrId === 'object' ? (orderOrId.id || orderOrId.order_id || orderOrId.orderId) : orderOrId;
  let orderNumberStr = typeof orderOrId === 'object' ? (orderOrId.order_number || orderOrId.orderNumber || '') : '';
  let numericId = typeof orderOrId === 'object' ? (orderOrId.backendNumericId || orderOrId._backendId || (typeof orderOrId.id === 'number' || /^\d+$/.test(String(orderOrId.id)) ? Number(orderOrId.id) : null)) : null;

  // 1. Fetch orders from backend to verify backend presence
  let backendOrdersList = [];
  try {
    const res = await api.get('/orders/?page_size=100');
    const raw = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
    backendOrdersList = Array.isArray(raw) ? raw : [];
  } catch (e) {
    console.warn("[E-BILL] Failed to fetch backend orders list:", e);
  }

  // Find match in backend orders list
  const inputStr = String(inputId || '').trim().toUpperCase();
  const numStr = String(numericId || '').trim();
  const orderNumSearch = String(orderNumberStr || '').trim().toUpperCase();

  let matchedBackendRecord = backendOrdersList.find(b => {
    const bId = String(b.id || b.pk || '');
    const bNum = String(b.order_number || b.orderNumber || '').toUpperCase();
    if (bId && (bId === inputStr || bId === numStr)) return true;
    if (bNum && (bNum === inputStr || bNum === orderNumSearch || (inputStr && bNum.endsWith(inputStr)))) return true;
    return false;
  });

  // If numeric DB ID available or input was numeric and not found in list yet, try direct GET /orders/{id}/
  const directId = numericId || (/^\d+$/.test(inputStr) ? Number(inputStr) : null);
  if (!matchedBackendRecord && directId) {
    try {
      const res = await api.get(`/orders/${directId}/`);
      if (res.data) {
        matchedBackendRecord = res.data?.data || res.data;
      }
    } catch (e) {
      console.warn(`[E-BILL] Direct endpoint GET /orders/${directId}/ failed:`, e);
    }
  }

  // If order object is passed directly, use targetOrder as fallback record
  if (!matchedBackendRecord && targetOrder) {
    matchedBackendRecord = {
      id: targetOrder._backendId || targetOrder.backendNumericId || targetOrder.id,
      order_number: targetOrder.order_number || targetOrder.orderNumber || inputStr,
      ...targetOrder
    };
  }

  // Fetch full details via orderService or construct from authoritative backend record
  let fullOrderDetails = null;
  try {
    const fetchId = matchedBackendRecord?.id || numericId || inputId;
    if (fetchId && typeof fetchId === 'number') {
      fullOrderDetails = await orderService.getOrderById(fetchId, true);
    }
  } catch (e) {
    console.warn("[E-BILL] Error fetching full details from orderService:", e);
  }

  const finalOrder = fullOrderDetails || matchedBackendRecord || targetOrder;
  const dbBackendId = matchedBackendRecord?.id || finalOrder?._backendId || finalOrder?.backendNumericId || null;

  // Fetch backend payments to get payment reference/status
  let paymentDetails = null;
  try {
    const paymentsRes = await api.get('/payments/?page_size=100');
    const rawPayments = paymentsRes.data?.data || (Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.results || []));
    const allPayments = Array.isArray(rawPayments) ? rawPayments : [];

    if (dbBackendId) {
      paymentDetails = allPayments.find(p => String(p.order?.id || p.order || p.order_id) === String(dbBackendId));
    }
    if (!paymentDetails && inputStr) {
      paymentDetails = allPayments.find(p => String(p.order?.id || p.order || p.order_id) === inputStr);
    }
  } catch (e) {
    console.warn("[E-BILL] Error fetching backend payments:", e);
  }

  // Fetch Customer/User details if valid user ID is attached
  let customerInfo = {
    name: 'Valued Customer',
    phone: finalOrder.customerPhone || finalOrder.customer_phone || '',
    email: finalOrder.customerEmail || finalOrder.customer_email || ''
  };

  const userId = finalOrder.user || matchedBackendRecord?.user;
  if (userId && typeof userId === 'number' && userId > 0 && userId < 100000) {
    try {
      const usersRes = await api.get('/users/');
      const rawUsers = usersRes.data?.data || (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results || []));
      const allUsers = Array.isArray(rawUsers) ? rawUsers : [];
      const userMatch = allUsers.find(u => u.id === userId);
      if (userMatch) {
        customerInfo.name = `${userMatch.first_name || ''} ${userMatch.last_name || ''}`.trim() || userMatch.username || 'Valued Customer';
        customerInfo.phone = userMatch.phone || customerInfo.phone;
        customerInfo.email = userMatch.email || customerInfo.email;
      }
    } catch (e) { }
  }

  return {
    success: true,
    isBackendOrder: true,
    order: finalOrder,
    backendId: dbBackendId,
    payment: paymentDetails,
    customer: customerInfo
  };
};

/**
 * Generate and download professional PDF E-Bill / Invoice
 */
export const generateEBillPDF = async (orderOrId) => {
  try {
    const backendData = await getBackendOrderDataForEBill(orderOrId);

    if (!backendData.success) {
      alert(backendData.error || "Unable to generate the E-Bill. Please try again.");
      return false;
    }

    const { order, backendId, payment, customer } = backendData;

    const JsPDFClass = await getJsPDF();
    if (!JsPDFClass) {
      // Graceful fallback to formatted printable browser bill
      return printHtmlInvoice(order, backendId, payment, customer);
    }

    // Create jsPDF document (A4, portrait, mm units)
    const doc = new JsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180mm

    // Color Palette
    const primaryCrimson = [220, 38, 38];   // #DC2626
    const darkSlate = [30, 41, 59];         // #1E293B
    const textGray = [100, 116, 139];       // #64748B
    const lightBg = [248, 250, 252];        // #F8FAFC
    const tableHeaderBg = [241, 245, 249];   // #F1F5F9
    const borderColor = [226, 232, 240];    // #E2E8F0

    let y = 18;

    // =========================================================
    // HEADER BANNER (Clean, without top red bar or receipt tag)
    // =========================================================
    // Restaurant Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...primaryCrimson);
    doc.text("FOODIE RESTAURANT", margin, y);

    // Document Title: INVOICE / E-BILL
    doc.setFontSize(16);
    doc.setTextColor(...darkSlate);
    doc.text("E-BILL / INVOICE", pageWidth - margin, y, { align: "right" });
    y += 6.5;

    // Restaurant Subtitle & Address
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...textGray);
    doc.text("Authentic & Premium Dining Experience", margin, y);
    y += 5;

    // Branch & Contact Line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textGray);
    doc.text("Main Branch: 123 Foodie Street, Gourmet Hub, Metro City | Phone: +91 98765 43210", margin, y);
    y += 7;

    // Divider Line
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // =========================================================
    // ORDER & CUSTOMER INFORMATION GRID
    // =========================================================
    const colWidth = contentWidth / 2 - 2;
    const boxHeight = 38;

    // Box 1 Background (Order Metadata)
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, colWidth, boxHeight, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, y, colWidth, boxHeight, 2, 2, 'S');

    // Box 2 Background (Customer & Payment Info)
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin + colWidth + 4, y, colWidth, boxHeight, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin + colWidth + 4, y, colWidth, boxHeight, 2, 2, 'S');

    // Box 1 Content: Order Info
    let box1Y = y + 5;
    const box1X = margin + 4;

    const displayOrderNum = String(backendId || order.backendNumericId || order.id || 'N/A');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlate);
    doc.text("ORDER INFORMATION", box1X, box1Y);
    box1Y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textGray);

    doc.text("Order ID:", box1X, box1Y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryCrimson);
    doc.text(`#${displayOrderNum}`, box1X + 26, box1Y);
    box1Y += 5.2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("Date & Time:", box1X, box1Y);
    doc.setTextColor(...darkSlate);
    const dateStr = order.date ? `${order.date} at ${order.time || ''}` : new Date(order.placedAt || Date.now()).toLocaleString('en-IN');
    doc.text(dateStr, box1X + 26, box1Y);
    box1Y += 5.2;

    doc.setTextColor(...textGray);
    doc.text("Dining Table / Type:", box1X, box1Y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkSlate);
    const tableNo = order.table || 'Takeaway';
    const orderTypeStr = order.orderType || (tableNo === 'Takeaway' ? 'Takeaway' : 'Dine-In');
    doc.text(`${tableNo} (${orderTypeStr})`, box1X + 30, box1Y);
    box1Y += 5.2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("Order Status:", box1X, box1Y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkSlate);
    doc.text(order.status || 'Completed', box1X + 26, box1Y);
    box1Y += 5.2;

    const customerPhoneRaw = String(order.customerPhone || order.phone || order.user?.phone || '');
    const cleanPhone = customerPhoneRaw.replace(/\D/g, '');
    let maskedPhone = '';
    if (cleanPhone.length >= 10) {
      maskedPhone = cleanPhone.slice(0, 2) + 'XXXXXX' + cleanPhone.slice(-2);
    } else if (cleanPhone) {
      maskedPhone = cleanPhone.slice(0, 1) + 'XXXXX' + cleanPhone.slice(-1);
    }

    if (maskedPhone) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textGray);
      doc.text("Mobile No:", box1X, box1Y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkSlate);
      doc.text(maskedPhone, box1X + 26, box1Y);
    }

    // Box 2 Content: Payment Info
    let box2Y = y + 5;
    const box2X = margin + colWidth + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...darkSlate);
    doc.text("PAYMENT INFORMATION", box2X, box2Y);
    box2Y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textGray);
    doc.text("Payment Method:", box2X, box2Y);
    doc.setFont("helvetica", "bold");
    const rawPm = (payment?.payment_method || order.paymentMethod || order.payment_method || 'COD').toUpperCase();
    let pmDisplay = 'Cash (COD)';
    if (rawPm.includes('UPI')) pmDisplay = 'UPI Mobile';
    else if (rawPm.includes('CARD') || rawPm.includes('CREDIT') || rawPm.includes('DEBIT')) pmDisplay = 'Credit / Debit Card';
    else if (rawPm.includes('CASH') || rawPm.includes('COD')) pmDisplay = 'Cash (COD)';
    doc.setTextColor(...darkSlate);
    doc.text(pmDisplay, box2X + 27, box2Y);
    box2Y += 5.2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("Payment Status:", box2X, box2Y);
    doc.setFont("helvetica", "bold");

    // Payment Status Logic: Completed for UPI, Card, COD. If unpaid/cancelled/failed -> Failed
    const rawPayStatus = String(payment?.payment_status || payment?.status || order.paymentStatus || order.payment_status || '').toUpperCase();
    const orderStatus = String(order.status || '').toUpperCase();
    const isFailed = rawPayStatus.includes('FAIL') ||
      rawPayStatus.includes('CANCEL') ||
      rawPayStatus.includes('REJECT') ||
      rawPayStatus === 'UNPAID' ||
      rawPayStatus === 'DECLINED' ||
      orderStatus === 'CANCELLED' ||
      orderStatus === 'REJECTED';

    const payStatus = isFailed ? 'FAILED' : 'COMPLETED';
    if (payStatus === 'COMPLETED') {
      doc.setTextColor(22, 101, 52); // Green
    } else {
      doc.setTextColor(220, 38, 38); // Red
    }
    doc.text(payStatus, box2X + 27, box2Y);
    box2Y += 5.2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("Transaction Ref:", box2X, box2Y);
    doc.setTextColor(...darkSlate);
    const txnId = payment?.transaction_id || `TXN_${rawPm}_${String(backendId || '101')}`;
    doc.text(String(txnId), box2X + 27, box2Y);

    y += boxHeight + 8;

    // =========================================================
    // ITEMS TABLE
    // =========================================================
    // Table Headers
    const colX = {
      sr: margin + 3,
      name: margin + 14,
      qty: margin + 110,
      price: margin + 135,
      total: pageWidth - margin - 4
    };

    // Header Bar Background
    doc.setFillColor(...tableHeaderBg);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    doc.setDrawColor(...borderColor);
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);

    doc.text("#", colX.sr, y + 5.5);
    doc.text("ITEM DESCRIPTION", colX.name, y + 5.5);
    doc.text("QTY", colX.qty, y + 5.5, { align: "center" });
    doc.text("UNIT PRICE", colX.price, y + 5.5, { align: "right" });
    doc.text("TOTAL (Rs.)", colX.total, y + 5.5, { align: "right" });

    y += 8;

    // Items Loop
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

    items.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const rowHeight = item.instructions ? 11 : 8;

      if (y + rowHeight > 260) {
        doc.addPage();
        y = 20;
      }

      if (!isEven) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      const qty = parseInt(item.quantity || 1);
      const unitPrice = parseFloat(item.price || 0);
      const itemTotal = unitPrice * qty;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...darkSlate);

      doc.text(String(idx + 1), colX.sr, y + 5);

      // Truncate long dish names if necessary
      const itemName = String(item.name || 'Dish Item');
      const truncatedName = doc.splitTextToSize(itemName, 90)[0];
      doc.setFont("helvetica", "bold");
      doc.text(truncatedName, colX.name, y + 5);

      doc.setFont("helvetica", "normal");
      doc.text(String(qty), colX.qty, y + 5, { align: "center" });
      doc.text(formatPdfCurrency(unitPrice).replace('Rs. ', ''), colX.price, y + 5, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(formatPdfCurrency(itemTotal).replace('Rs. ', ''), colX.total, y + 5, { align: "right" });

      if (item.instructions) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(...textGray);
        doc.text(`Note: ${item.instructions}`, colX.name, y + 9);
      }

      y += rowHeight;
    });

    y += 4;

    // =========================================================
    // PRICE & BILL FINANCIAL SUMMARY BOX
    // =========================================================
    const summaryBoxWidth = 90;
    const summaryBoxX = pageWidth - margin - summaryBoxWidth;

    const subtotal = parseFloat(order.subtotal || 0) || items.reduce((s, i) => s + (parseFloat(i.price || 0) * (parseInt(i.quantity) || 1)), 0);
    const itemDiscounts = parseFloat(order.itemDiscounts || 0);
    const discount = parseFloat(order.discount || 0);
    const voucherCode = order.voucher || order.voucherCode || order.coupon || null;
    const isTakeaway = order.orderType === 'Takeaway' || order.table === 'Takeaway' || order.packingCharge > 0 || order.packing_charge > 0;
    const totalQty = items.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0) || 1;
    const packingCharge = parseFloat(order.packingCharge || order.packing_charge || (isTakeaway ? totalQty * 15 : 0));
    
    const foodAfterDiscount = Math.max(0, subtotal - discount);
    const taxableAmount = foodAfterDiscount + (isTakeaway ? packingCharge : 0);
    const customRoundPdf = (value) => {
      const decimal = value - Math.floor(value);
      return decimal >= 0.50 ? Math.ceil(value) : Math.floor(value);
    };

    const tax = parseFloat(order.tax || 0) || customRoundPdf(taxableAmount * 0.05);
    
    const isServiceChargeRemoved = Boolean(order.isServiceChargeRemoved);
    const serviceCharge = parseFloat(
      order.serviceCharge !== undefined ? order.serviceCharge : (order.service_charge !== undefined ? order.service_charge : (isServiceChargeRemoved ? 0 : customRoundPdf(foodAfterDiscount * 0.02)))
    );
    const deliveryFee = parseFloat(order.deliveryFee || order.delivery_fee || 0);
    const grandTotal = parseFloat(order.total || order.total_amount || 0) || Math.max(0, taxableAmount + tax + serviceCharge + deliveryFee);

    let summaryHeight = 36;
    if (itemDiscounts > 0) summaryHeight += 5;
    if (packingCharge > 0) summaryHeight += 5;
    if (discount > 0) summaryHeight += 5;
    if (deliveryFee > 0) summaryHeight += 5;

    // Page break check before summary box
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + summaryHeight > pageHeight - 36) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(...lightBg);
    doc.roundedRect(summaryBoxX, y, summaryBoxWidth, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(summaryBoxX, y, summaryBoxWidth, summaryHeight, 2, 2, 'S');

    let sumY = y + 5;
    const labelX = summaryBoxX + 4;
    const valX = pageWidth - margin - 4;

    // Subtotal
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textGray);
    doc.text("Items Subtotal:", labelX, sumY);
    doc.setTextColor(...darkSlate);
    doc.text(formatPdfCurrency(subtotal), valX, sumY, { align: "right" });
    sumY += 5;

    // Packing Charges for takeaway if applicable
    if (packingCharge > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textGray);
      doc.text("Packing Charges:", labelX, sumY);
      doc.setTextColor(...darkSlate);
      doc.text(formatPdfCurrency(packingCharge), valX, sumY, { align: "right" });
      sumY += 5;
    }

    // Menu Discounts if applicable
    if (itemDiscounts > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(22, 101, 52);
      doc.text("Menu Discounts:", labelX, sumY);
      doc.text(`-${formatPdfCurrency(itemDiscounts)}`, valX, sumY, { align: "right" });
      sumY += 5;
    }

    // Coupon / Voucher Discount if applicable
    if (discount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(22, 101, 52);
      const voucherLabel = voucherCode ? `Voucher (${voucherCode}):` : 'Coupon Discount:';
      doc.text(voucherLabel, labelX, sumY);
      doc.text(`-${formatPdfCurrency(discount)}`, valX, sumY, { align: "right" });
      sumY += 5;
    }

    // Taxes & GST (5%)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("GST / Tax (5%):", labelX, sumY);
    doc.setTextColor(...darkSlate);
    doc.text(formatPdfCurrency(tax), valX, sumY, { align: "right" });
    sumY += 5;

    // Service Charge (2%)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textGray);
    doc.text("Service Charge (2%):", labelX, sumY);
    doc.setTextColor(...darkSlate);
    doc.text(isServiceChargeRemoved || serviceCharge === 0 ? "Rs. 0.00" : formatPdfCurrency(serviceCharge), valX, sumY, { align: "right" });
    sumY += 5;

    if (deliveryFee > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textGray);
      doc.text("Delivery Fee:", labelX, sumY);
      doc.setTextColor(...darkSlate);
      doc.text(formatPdfCurrency(deliveryFee), valX, sumY, { align: "right" });
      sumY += 5;
    }

    // Divider before Grand Total
    doc.setDrawColor(...borderColor);
    doc.line(summaryBoxX + 2, sumY - 1, pageWidth - margin - 2, sumY - 1);
    sumY += 3;

    // Grand Total Highlight
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primaryCrimson);
    doc.text("TOTAL (GST INCL):", labelX, sumY);
    doc.setFontSize(10.5);
    doc.text(formatPdfCurrency(grandTotal), valX, sumY, { align: "right" });

    // =========================================================
    // NEAT A4 BOTTOM FOOTER (Anchored on all pages)
    // =========================================================
    const totalPages = doc.internal.getNumberOfPages();
    const currentDateStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      const footerY = pageHeight - 20;

      // Subtle Top Divider Line
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.4);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      // Left Column: Greeting & Feedback
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...darkSlate);
      doc.text("Thank you for dining with Foodie Restaurant!", margin, footerY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...textGray);
      doc.text("For feedback or support, visit www.foodie.com | Helpline: +91 98765 43210", margin, footerY + 9.5);

      // Right Column: Timestamp & Document Authenticity
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...textGray);
      doc.text(`Generated on ${currentDateStr}`, pageWidth - margin, footerY + 5, { align: "right" });

      const pageInfo = totalPages > 1 ? `Page ${p} of ${totalPages} | ` : '';
      doc.text(`${pageInfo}Computer Generated Tax Invoice`, pageWidth - margin, footerY + 9.5, { align: "right" });
    }

    // Download PDF file with specified name format e.g. Foodie_EBill_ORD-20260910-88531.pdf
    const fileName = `Foodie_EBill_${displayOrderNum}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error("[E-BILL GENERATION ERROR]", error);
    alert("Unable to generate the E-Bill. Please try again.");
    return false;
  }
};

export default generateEBillPDF;
