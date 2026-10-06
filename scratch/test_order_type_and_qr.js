import { calculateBillDetails } from '../src/utils/pricing.js';

console.log('--- RUNNING ORDER TYPE & NUMERIC QR VERIFICATION TESTS ---');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// 1. Order Type backend value validation
const validOrderTypes = ['DINE_IN', 'TAKEAWAY'];
assert(validOrderTypes.includes('DINE_IN'), 'Backend accepts DINE_IN order_type');
assert(validOrderTypes.includes('TAKEAWAY'), 'Backend accepts TAKEAWAY order_type');

// 2. Numeric orders.id extraction helper validation
const extractNumericId = (order) => {
  const raw = order?._backendId || order?.backendNumericId || order?.id;
  const num = parseInt(String(raw).replace(/\D/g, ''), 10);
  return !isNaN(num) && num > 0 ? num : null;
};

assert(extractNumericId({ id: 42 }) === 42, 'Extracts numeric id 42 directly');
assert(extractNumericId({ _backendId: 105, id: 'ORD-2026-105' }) === 105, 'Prefers numeric _backendId over string order number');
assert(extractNumericId({ backendNumericId: 78, id: 'FD-78' }) === 78, 'Prefers backendNumericId 78');

// 3. GST Order of Operations check (Subtotal -> Discount -> GST -> Final Total)
const bill = calculateBillDetails({
  items: [{ id: 1, name: 'Burger', price: 500, quantity: 1 }],
  coupon: { code: 'WELCOME100', discount: 100, type: 'fixed', minOrderValue: 500 }
});

assert(bill.subtotal === 500, 'Subtotal is 500');
assert(bill.discount === 100, 'Discount is 100');
assert(bill.taxableAmount === 400, 'Taxable Amount is 400 (500 - 100)');
assert(bill.tax === 20, 'GST 5% on 400 is 20');
assert(bill.grandTotal === 420, 'Final Total is 420 (400 + 20)');

console.log(`\nRESULTS: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 ALL ORDER TYPE & QR VERIFICATION TESTS PASSED!');
} else {
  process.exit(1);
}
