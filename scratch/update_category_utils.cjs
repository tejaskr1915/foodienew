const fs = require('fs');
const file = 'c:/web developing/foodie/foodie/src/utils/categoryUtils.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "// 1. Direct ID match\n  if (catId && (Number(dish.categoryId) === Number(catId) || Number(dish.category) === Number(catId))) {\n    return true;\n  }",
  `// 1. Direct ID match
  if (catId && (Number(dish.categoryId) === Number(catId) || Number(dish.category) === Number(catId))) {
    return true;
  }

  // Check multiple categories from local storage overrides
  try {
    const multiCats = JSON.parse(localStorage.getItem('foodie_dish_multiple_categories') || '{}')[dish.id];
    if (multiCats && Array.isArray(multiCats)) {
      if (multiCats.some(c => 
        normalizeCategoryName(c) === catNorm || 
        normalizeCategoryName(getFrontendCategoryName(c)) === catNorm ||
        (catOrigNorm && normalizeCategoryName(c) === catOrigNorm)
      )) {
        return true;
      }
    }
  } catch (e) {}`
);

// We need to inject catOrigNorm before using it in the injected code
code = code.replace(
  "const catId = typeof cat === 'object' ? cat.id : null;",
  "const catId = typeof cat === 'object' ? cat.id : null;\n  const catOrigNorm = typeof cat === 'object' && cat.originalName ? normalizeCategoryName(cat.originalName) : catNorm;"
);

// Remove the later declaration of catOrigNorm
code = code.replace(
  "const catOrigNorm = typeof cat === 'object' && cat.originalName ? normalizeCategoryName(cat.originalName) : catNorm;\n\n  if (dNorm === catNorm",
  "if (dNorm === catNorm"
);

fs.writeFileSync(file, code);
console.log("Updated categoryUtils.js");
