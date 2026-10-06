import productService, { getCachedCategories } from '../src/services/productService.js';

console.log("=== Testing productService exports ===");
console.log("productService.getCachedCategories type:", typeof productService.getCachedCategories);
console.log("standalone getCachedCategories type:", typeof getCachedCategories);

if (typeof productService.getCachedCategories === 'function') {
  console.log("TEST PASSED: productService.getCachedCategories is a function!");
} else {
  console.error("TEST FAILED: productService.getCachedCategories is not a function.");
}
