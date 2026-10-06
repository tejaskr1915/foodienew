import { calculateCouponDiscount, calculateBillDetails, GST_RATE } from '../src/utils/pricing.js';

console.log('--- RUNNING COUPON & GST CALCULATION TESTS ---');

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

// Case 1: Subtotal ₹499, Coupon min ₹500 -> Disabled, no discount
const coupon500 = { code: 'FOODIE100', discount: 100, type: 'fixed', minOrderValue: 500 };
const items499 = [{ id: 1, name: 'Burger', price: 499, quantity: 1 }];
const bill499 = calculateBillDetails({ items: items499, coupon: coupon500 });
assert(bill499.subtotal === 499, `Case 1: Subtotal is 499 (got ${bill499.subtotal})`);
assert(!bill499.isCouponEligible, `Case 1: Coupon is ineligible (min order 500)`);
assert(bill499.discount === 0, `Case 1: Discount is 0 (got ${bill499.discount})`);
assert(bill499.couponRemaining === 1, `Case 1: Remaining is 1 (got ${bill499.couponRemaining})`);
assert(bill499.taxableAmount === 499, `Case 1: Taxable amount is 499 (got ${bill499.taxableAmount})`);
assert(bill499.tax === Math.round(499 * 0.05), `Case 1: GST 5% on 499 is 25 (got ${bill499.tax})`);
assert(bill499.grandTotal === 499 + 25, `Case 1: Grand total is 524 (got ${bill499.grandTotal})`);

// Case 2: Subtotal ₹500, Coupon min ₹500 -> Enabled
const items500 = [{ id: 1, name: 'Pizza', price: 500, quantity: 1 }];
const bill500 = calculateBillDetails({ items: items500, coupon: coupon500 });
assert(bill500.subtotal === 500, `Case 2: Subtotal is 500 (got ${bill500.subtotal})`);
assert(bill500.isCouponEligible, `Case 2: Coupon is eligible at exact 500 threshold`);
assert(bill500.discount === 100, `Case 2: Discount is 100 (got ${bill500.discount})`);
assert(bill500.taxableAmount === 400, `Case 2: Taxable amount is 400 (got ${bill500.taxableAmount})`);
assert(bill500.tax === 20, `Case 2: GST 5% on 400 is 20 (got ${bill500.tax})`);
assert(bill500.grandTotal === 420, `Case 2: Grand total is 420 (got ${bill500.grandTotal})`);

// Case 3: Subtotal ₹501, Coupon min ₹500 -> Enabled
const items501 = [{ id: 1, name: 'Special Platter', price: 501, quantity: 1 }];
const bill501 = calculateBillDetails({ items: items501, coupon: coupon500 });
assert(bill501.isCouponEligible, `Case 3: Coupon is eligible above threshold (501)`);
assert(bill501.discount === 100, `Case 3: Discount is 100`);
assert(bill501.taxableAmount === 401, `Case 3: Taxable amount is 401`);
assert(bill501.tax === 20, `Case 3: GST 5% on 401 is 20 (got ${bill501.tax})`);
assert(bill501.grandTotal === 421, `Case 3: Grand total is 421 (got ${bill501.grandTotal})`);

// Case 4: Subtotal ₹1000, 10% Percentage Coupon -> Discount ₹100, Taxable ₹900, GST ₹45, Final ₹945
const coupon10Pct = { code: 'SAVE10', discount: 10, type: 'percentage', minOrderValue: 200 };
const items1000 = [{ id: 1, name: 'Deluxe Combo', price: 1000, quantity: 1 }];
const bill1000Pct = calculateBillDetails({ items: items1000, coupon: coupon10Pct });
assert(bill1000Pct.subtotal === 1000, `Case 4: Subtotal is 1000 (got ${bill1000Pct.subtotal})`);
assert(bill1000Pct.discount === 100, `Case 4: 10% discount on 1000 is 100 (got ${bill1000Pct.discount})`);
assert(bill1000Pct.taxableAmount === 900, `Case 4: Taxable amount is 900 (got ${bill1000Pct.taxableAmount})`);
assert(bill1000Pct.tax === 45, `Case 4: GST 5% on 900 is 45 (got ${bill1000Pct.tax})`);
assert(bill1000Pct.grandTotal === 945, `Case 4: Grand total is 945 (got ${bill1000Pct.grandTotal})`);

// Case 5: Subtotal ₹1000, ₹100 Fixed Coupon -> Taxable ₹900, GST ₹45, Final ₹945
const bill1000Fixed = calculateBillDetails({ items: items1000, coupon: coupon500 });
assert(bill1000Fixed.subtotal === 1000, `Case 5: Subtotal is 1000 (got ${bill1000Fixed.subtotal})`);
assert(bill1000Fixed.discount === 100, `Case 5: Fixed discount is 100 (got ${bill1000Fixed.discount})`);
assert(bill1000Fixed.taxableAmount === 900, `Case 5: Taxable amount is 900 (got ${bill1000Fixed.taxableAmount})`);
assert(bill1000Fixed.tax === 45, `Case 5: GST 5% on 900 is 45 (got ${bill1000Fixed.tax})`);
assert(bill1000Fixed.grandTotal === 945, `Case 5: Grand total is 945 (got ${bill1000Fixed.grandTotal})`);

// Case 6: Subtotal ₹400, Coupon min ₹500 -> Cannot be applied, no discount, GST on 400 = 20, Total = 420
const items400 = [{ id: 1, name: 'Burger & Fries', price: 400, quantity: 1 }];
const bill400 = calculateBillDetails({ items: items400, coupon: coupon500 });
assert(bill400.subtotal === 400, `Case 6: Subtotal is 400 (got ${bill400.subtotal})`);
assert(!bill400.isCouponEligible, `Case 6: Coupon ineligible for 400`);
assert(bill400.discount === 0, `Case 6: Discount is 0 (got ${bill400.discount})`);
assert(bill400.taxableAmount === 400, `Case 6: Taxable amount is 400 (got ${bill400.taxableAmount})`);
assert(bill400.tax === 20, `Case 6: GST 5% on 400 is 20 (got ${bill400.tax})`);
assert(bill400.grandTotal === 420, `Case 6: Grand total is 420 (got ${bill400.grandTotal})`);

// Case 7: Extra Ingredients & Selling Price Discount
const itemsWithExtras = [
  { id: 1, name: 'Custom Pizza', price: 450, discountPercent: 10, extraIngredients: [{ name: 'Extra Cheese', price: 50 }, { name: 'Olives', price: 30 }], quantity: 2 }
];
// Selling price = 450 - 45 = 405. Extra charges per unit = 80. Total per unit = 485. Total for 2 = 970.
const billExtras = calculateBillDetails({ items: itemsWithExtras, coupon: coupon500 });
assert(billExtras.itemsSubtotal === 900, `Case 7: Base items subtotal is 900 (got ${billExtras.itemsSubtotal})`);
assert(billExtras.menuDiscounts === 90, `Case 7: Menu discounts is 90 (got ${billExtras.menuDiscounts})`);
assert(billExtras.extraCharges === 160, `Case 7: Extra charges is 160 (got ${billExtras.extraCharges})`);
assert(billExtras.subtotal === 970, `Case 7: Subtotal before coupon is 970 (got ${billExtras.subtotal})`);
assert(billExtras.discount === 100, `Case 7: Coupon discount is 100 (got ${billExtras.discount})`);
assert(billExtras.taxableAmount === 870, `Case 7: Taxable amount is 870 (got ${billExtras.taxableAmount})`);
assert(billExtras.tax === Math.round(870 * 0.05), `Case 7: GST is 44 (got ${billExtras.tax})`);
assert(billExtras.grandTotal === 870 + 44, `Case 7: Grand total is 914 (got ${billExtras.grandTotal})`);

console.log(`\nRESULTS: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 ALL CALCULATION UNIT TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
