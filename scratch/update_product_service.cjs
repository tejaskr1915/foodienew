const fs = require('fs');
const file = 'c:/web developing/foodie/foodie/src/services/productService.js';
let code = fs.readFileSync(file, 'utf8');

// For addProduct:
// It already saves foodie_dish_categories. We need to add multiple categories and toppings.
code = code.replace(
  "localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));",
  `localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));
    } catch (e) {
      console.error("Error persisting dish category:", e);
    }

    try {
      if (data.category && Array.isArray(data.category)) {
        const savedMultipleCategories = JSON.parse(localStorage.getItem('foodie_dish_multiple_categories') || '{}');
        savedMultipleCategories[newFoodId] = data.category;
        savedMultipleCategories[String(newFoodId)] = data.category;
        localStorage.setItem('foodie_dish_multiple_categories', JSON.stringify(savedMultipleCategories));
      }
    } catch (e) {}

    try {
      if (data.toppings) {
        const savedToppings = JSON.parse(localStorage.getItem('foodie_dish_toppings') || '{}');
        savedToppings[newFoodId] = data.toppings;
        savedToppings[String(newFoodId)] = data.toppings;
        localStorage.setItem('foodie_dish_toppings', JSON.stringify(savedToppings));
      }
    } catch (e) {}
`
);

// For updateProduct:
// It replaces at line 752
const updateProductRegex = /localStorage\.setItem\('foodie_dish_categories', JSON\.stringify\(savedCategories\)\);\s*\}\s*catch\s*\(e\)\s*\{\s*console\.error\("Error persisting dish category:", e\);\s*\}/g;
let matchCount = 0;
code = code.replace(updateProductRegex, (match) => {
  matchCount++;
  if (matchCount === 2) {
    return match + `\n
    try {
      if (data.category && Array.isArray(data.category)) {
        const savedMultipleCategories = JSON.parse(localStorage.getItem('foodie_dish_multiple_categories') || '{}');
        savedMultipleCategories[updatedFoodId] = data.category;
        savedMultipleCategories[String(updatedFoodId)] = data.category;
        localStorage.setItem('foodie_dish_multiple_categories', JSON.stringify(savedMultipleCategories));
      }
    } catch (e) {}

    try {
      if (data.toppings) {
        const savedToppings = JSON.parse(localStorage.getItem('foodie_dish_toppings') || '{}');
        savedToppings[updatedFoodId] = data.toppings;
        savedToppings[String(updatedFoodId)] = data.toppings;
        localStorage.setItem('foodie_dish_toppings', JSON.stringify(savedToppings));
      }
    } catch (e) {}
`;
  }
  return match;
});

// For deleteProduct:
// line 922
code = code.replace(
  "localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));\n    } catch (e) { }",
  `localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));
    } catch (e) { }
    
    try {
      const savedMultipleCategories = JSON.parse(localStorage.getItem('foodie_dish_multiple_categories') || '{}');
      delete savedMultipleCategories[id];
      delete savedMultipleCategories[String(id)];
      localStorage.setItem('foodie_dish_multiple_categories', JSON.stringify(savedMultipleCategories));
    } catch (e) { }

    try {
      const savedToppings = JSON.parse(localStorage.getItem('foodie_dish_toppings') || '{}');
      delete savedToppings[id];
      delete savedToppings[String(id)];
      localStorage.setItem('foodie_dish_toppings', JSON.stringify(savedToppings));
    } catch (e) { }`
);

fs.writeFileSync(file, code);
console.log("Updated productService.js");
