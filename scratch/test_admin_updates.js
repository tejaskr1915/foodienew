import { MINIMUM_STOCK_COUNT, MIN_STOCK_LIMIT, MAX_STOCK_LIMIT, getStockStatus } from '../src/utils/inventoryConstants.js';

console.log('--- RUNNING ADMIN UPDATES & INVENTORY CONSTANTS VERIFICATION TESTS ---');

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

// 1. Verify Inventory Constants
assert(MINIMUM_STOCK_COUNT === 5, 'MINIMUM_STOCK_COUNT is 5');
assert(MIN_STOCK_LIMIT === 0, 'MIN_STOCK_LIMIT is 0');
assert(MAX_STOCK_LIMIT === 100, 'MAX_STOCK_LIMIT is 100');

// 2. Verify getStockStatus helper
assert(getStockStatus(0) === 'OUT_OF_STOCK', '0 count is OUT_OF_STOCK');
assert(getStockStatus(3) === 'LOW_STOCK', '3 count is LOW_STOCK (<= 5)');
assert(getStockStatus(5) === 'LOW_STOCK', '5 count is LOW_STOCK (<= 5)');
assert(getStockStatus(6) === 'IN_STOCK', '6 count is IN_STOCK (> 5)');
assert(getStockStatus(50) === 'IN_STOCK', '50 count is IN_STOCK');

console.log(`\nRESULTS: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('🎉 ALL ADMIN UPDATES & INVENTORY CONSTANTS TESTS PASSED!');
} else {
  process.exit(1);
}
