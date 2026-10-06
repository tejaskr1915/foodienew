const fs = require('fs');

// 1. cartService.js
let c = fs.readFileSync('src/services/cartService.js', 'utf8');
c = c.replace(/food_item: item\.food_item \?\? item\.food/g, "food: item.food_item ?? item.food ?? item.id");
c = c.replace(/price: item\.price/g, "unit_price: item.price, subtotal: item.price * item.quantity");
fs.writeFileSync('src/services/cartService.js', c);

// 2. orderService.js
let o = fs.readFileSync('src/services/orderService.js', 'utf8');
o = o.replace(/food_item: item\.food_id \|\| item\.id/g, "food: item.food_id || item.id");
fs.writeFileSync('src/services/orderService.js', o);

// 3. inventoryService.js
let i = fs.readFileSync('src/services/inventoryService.js', 'utf8');
i = i.replace(/food_item: Number\(id\)/g, "food: Number(id)");
fs.writeFileSync('src/services/inventoryService.js', i);

// 4. productService.js
let p = fs.readFileSync('src/services/productService.js', 'utf8');
p = p.replace(/food_item: updatedFoodId/g, "food: updatedFoodId");
fs.writeFileSync('src/services/productService.js', p);

console.log('Fixed field names!');
