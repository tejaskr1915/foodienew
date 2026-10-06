const fs = require('fs');

function updateAddDish() {
  const file = 'c:/web developing/foodie/foodie/src/components/menu/AddDishModal.jsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    "const [category, setCategory] = useState(defaultCategory || '');",
    "const [category, setCategory] = useState(defaultCategory && defaultCategory !== 'All Categories' ? [defaultCategory] : []);\n  const [toppings, setToppings] = useState([]);\n  const [newToppingName, setNewToppingName] = useState('');\n  const [newToppingColor, setNewToppingColor] = useState('#f8d7da');"
  );

  code = code.replace(
    "setCategories([{ value: '', label: 'Select a category' }, ...unique]);",
    "setCategories(unique);"
  );

  code = code.replace(
    "if (defaultCategory) {\n        setCategory(defaultCategory);\n      }",
    "if (defaultCategory && defaultCategory !== 'All Categories') {\n        setCategory([defaultCategory]);\n      } else { setCategory([]); }"
  );

  code = code.replace(
    "if (!category) {",
    "if (!category || category.length === 0) {"
  );

  code = code.replace(
    "category,",
    "category: Array.isArray(category) ? category[0] : category,\n        toppings,"
  );

  code = code.replace(
    "setCategory(defaultCategory || '');",
    "setCategory(defaultCategory && defaultCategory !== 'All Categories' ? [defaultCategory] : []);\n      setToppings([]);"
  );

  const selectRegex = /<Select\s+label="Category"\s+options=\{categories\}\s+value=\{category\}\s+onChange=\{\(e\) => setCategory\(e\.target\.value\)\}\s+required\s+\/>/;
  
  const checkboxHtml = `
        <div className="mb-3 text-start">
          <label className="form-label text-secondary small fw-semibold mb-2">Categories <span className="text-danger">*</span></label>
          <div className="border rounded-3 p-3 bg-light overflow-auto" style={{ maxHeight: '150px' }}>
            {categories.map((c, idx) => (
              <div key={idx} className="form-check mb-2">
                <input
                  className="form-check-input cursor-pointer shadow-sm"
                  type="checkbox"
                  id={\`cat-\${idx}\`}
                  checked={Array.isArray(category) && category.includes(c.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCategory(prev => Array.isArray(prev) ? [...prev, c.value] : [c.value]);
                    } else {
                      setCategory(prev => Array.isArray(prev) ? prev.filter(v => v !== c.value) : []);
                    }
                  }}
                />
                <label className="form-check-label cursor-pointer w-100 fw-medium" htmlFor={\`cat-\${idx}\`}>
                  {c.label}
                </label>
              </div>
            ))}
            {categories.length === 0 && <div className="text-muted small">No categories available</div>}
          </div>
        </div>

        <div className="mb-3 text-start">
          <label className="form-label text-secondary small fw-semibold mb-2">Toppings / Add-ons</label>
          <div className="border rounded-3 p-3 bg-light">
            {toppings.map((t, idx) => (
              <div key={idx} className="d-flex align-items-center justify-content-between bg-white border p-2 rounded-2 mb-2 shadow-sm">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle border border-secondary border-opacity-25" style={{ width: '16px', height: '16px', backgroundColor: t.color }}></span>
                  <span className="fw-medium small">{t.name}</span>
                </div>
                <button type="button" className="btn btn-sm text-danger p-0" onClick={() => setToppings(prev => prev.filter((_, i) => i !== idx))}>
                  <i className="bi bi-trash"></i> Remove
                </button>
              </div>
            ))}
            <div className="d-flex align-items-center gap-2 mt-2">
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder="Topping Name (e.g. Extra Cheese)" 
                value={newToppingName}
                onChange={(e) => setNewToppingName(e.target.value)}
              />
              <input 
                type="color" 
                className="form-control form-control-sm p-1" 
                style={{ width: '40px', height: '31px' }}
                value={newToppingColor}
                onChange={(e) => setNewToppingColor(e.target.value)}
              />
              <button 
                type="button" 
                className="btn btn-sm btn-dark text-nowrap"
                onClick={() => {
                  if (newToppingName.trim()) {
                    setToppings(prev => [...prev, { name: newToppingName.trim(), color: newToppingColor }]);
                    setNewToppingName('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
`;

  code = code.replace(selectRegex, checkboxHtml);
  fs.writeFileSync(file, code);
  console.log("Updated AddDishModal.jsx");
}

function updateEditDish() {
  const file = 'c:/web developing/foodie/foodie/src/components/menu/EditDishModal.jsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    "const [category, setCategory] = useState('');",
    "const [category, setCategory] = useState([]);\n  const [toppings, setToppings] = useState([]);\n  const [newToppingName, setNewToppingName] = useState('');\n  const [newToppingColor, setNewToppingColor] = useState('#f8d7da');"
  );

  code = code.replace(
    "setCategories([{ value: '', label: 'Select a category' }, ...unique]);",
    "setCategories(unique);"
  );

  code = code.replace(
    "setCategory(dish.category || '');",
    "const dishCats = JSON.parse(localStorage.getItem('foodie_dish_multiple_categories') || '{}')[dish.id] || [dish.category || ''];\n      setCategory(dishCats.filter(Boolean));\n      const dishToppings = JSON.parse(localStorage.getItem('foodie_dish_toppings') || '{}')[dish.id] || [];\n      setToppings(dishToppings);"
  );
  
  code = code.replace(
    "if (!category) {",
    "if (!category || category.length === 0) {"
  );

  code = code.replace(
    "category,",
    "category: Array.isArray(category) ? category[0] : category,\n        toppings,"
  );

  const selectRegex = /<Select\s+label="Category"\s+options=\{categories\}\s+value=\{category\}\s+onChange=\{\(e\) => setCategory\(e\.target\.value\)\}\s+required\s+\/>/;
  
  const checkboxHtml = `
        <div className="mb-3 text-start">
          <label className="form-label text-secondary small fw-semibold mb-2">Categories <span className="text-danger">*</span></label>
          <div className="border rounded-3 p-3 bg-light overflow-auto" style={{ maxHeight: '150px' }}>
            {categories.map((c, idx) => (
              <div key={idx} className="form-check mb-2">
                <input
                  className="form-check-input cursor-pointer shadow-sm"
                  type="checkbox"
                  id={\`edit-cat-\${idx}\`}
                  checked={Array.isArray(category) && category.includes(c.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCategory(prev => Array.isArray(prev) ? [...prev, c.value] : [c.value]);
                    } else {
                      setCategory(prev => Array.isArray(prev) ? prev.filter(v => v !== c.value) : []);
                    }
                  }}
                />
                <label className="form-check-label cursor-pointer w-100 fw-medium" htmlFor={\`edit-cat-\${idx}\`}>
                  {c.label}
                </label>
              </div>
            ))}
            {categories.length === 0 && <div className="text-muted small">No categories available</div>}
          </div>
        </div>

        <div className="mb-3 text-start">
          <label className="form-label text-secondary small fw-semibold mb-2">Toppings / Add-ons</label>
          <div className="border rounded-3 p-3 bg-light">
            {toppings.map((t, idx) => (
              <div key={idx} className="d-flex align-items-center justify-content-between bg-white border p-2 rounded-2 mb-2 shadow-sm">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle border border-secondary border-opacity-25" style={{ width: '16px', height: '16px', backgroundColor: t.color }}></span>
                  <span className="fw-medium small">{t.name}</span>
                </div>
                <button type="button" className="btn btn-sm text-danger p-0" onClick={() => setToppings(prev => prev.filter((_, i) => i !== idx))}>
                  <i className="bi bi-trash"></i> Remove
                </button>
              </div>
            ))}
            <div className="d-flex align-items-center gap-2 mt-2">
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder="Topping Name (e.g. Extra Cheese)" 
                value={newToppingName}
                onChange={(e) => setNewToppingName(e.target.value)}
              />
              <input 
                type="color" 
                className="form-control form-control-sm p-1" 
                style={{ width: '40px', height: '31px' }}
                value={newToppingColor}
                onChange={(e) => setNewToppingColor(e.target.value)}
              />
              <button 
                type="button" 
                className="btn btn-sm btn-dark text-nowrap"
                onClick={() => {
                  if (newToppingName.trim()) {
                    setToppings(prev => [...prev, { name: newToppingName.trim(), color: newToppingColor }]);
                    setNewToppingName('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
`;

  code = code.replace(selectRegex, checkboxHtml);
  fs.writeFileSync(file, code);
  console.log("Updated EditDishModal.jsx");
}

updateAddDish();
updateEditDish();
