const fs = require('fs');

function fixProductService() {
  const file = 'c:/web developing/foodie/foodie/src/services/productService.js';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(/    \} catch \(e\) \{\}\r?\n\r?\n      \} catch \(e\) \{\r?\n        console\.error\("Error persisting dish category:", e\);\r?\n      \}\r?\n    \}/g, "    } catch (e) {}\n    }");
  
  fs.writeFileSync(file, code);
  console.log("Fixed productService.js");
}

function fixAddDishModal() {
  const file = 'c:/web developing/foodie/foodie/src/components/menu/AddDishModal.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace("const [category, toppings, setCategory]", "const [category, setCategory]");
  fs.writeFileSync(file, code);
  console.log("Fixed AddDishModal.jsx");
}

function fixEditDishModal() {
  const file = 'c:/web developing/foodie/foodie/src/components/menu/EditDishModal.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace("const [category, toppings, setCategory]", "const [category, setCategory]");
  fs.writeFileSync(file, code);
  console.log("Fixed EditDishModal.jsx");
}

fixProductService();
fixAddDishModal();
fixEditDishModal();
