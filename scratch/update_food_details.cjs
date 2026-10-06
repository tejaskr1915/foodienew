const fs = require('fs');
const file = 'c:/web developing/foodie/foodie/src/pages/customer/FoodDetails.jsx';
let code = fs.readFileSync(file, 'utf8');

// Inject state
code = code.replace(
  "const { id } = useParams();",
  `const { id } = useParams();
  const [availableToppings, setAvailableToppings] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);`
);

// Inject effect to load toppings
code = code.replace(
  "window.scrollTo(0, 0);",
  `window.scrollTo(0, 0);
    if (dish && dish.id) {
      try {
        const dishToppings = JSON.parse(localStorage.getItem('foodie_dish_toppings') || '{}')[dish.id] || [];
        setAvailableToppings(dishToppings);
      } catch (e) {
        setAvailableToppings([]);
      }
    }`
);

// Update handleAddToCart to pass toppings
code = code.replace(
  "await addToCart(dish, qtyToAdd);",
  "await addToCart(dish, qtyToAdd, { extraIngredients: selectedToppings.map(t => t.name) });"
);
code = code.replace(
  "await addToCart(dish, remainingToAdd);",
  "await addToCart(dish, remainingToAdd, { extraIngredients: selectedToppings.map(t => t.name) });"
);

// Inject UI
const toppingsHtml = `
              {availableToppings.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-3">Toppings / Add-ons</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {availableToppings.map((t, idx) => {
                      const isSelected = selectedToppings.some(st => st.name === t.name);
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedToppings(prev => prev.filter(st => st.name !== t.name));
                            } else {
                              setSelectedToppings(prev => [...prev, t]);
                            }
                          }}
                          className={\`px-3 py-2 rounded-3 border cursor-pointer d-flex align-items-center gap-2 transition-all \${isSelected ? 'shadow-sm border-dark' : 'border-light-subtle opacity-75'}\`}
                          style={{ backgroundColor: t.color || '#f8f9fa' }}
                        >
                          <div className={\`form-check m-0 p-0 d-flex align-items-center\`}>
                            <input 
                              type="checkbox" 
                              className="form-check-input m-0 cursor-pointer" 
                              checked={isSelected}
                              readOnly
                              style={{ width: '16px', height: '16px', marginTop: 0 }}
                            />
                          </div>
                          <span className={\`fw-bold small \${isSelected ? 'text-dark' : 'text-secondary'}\`}>{t.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
`;

code = code.replace(
  "{/* Quantity selector */}",
  toppingsHtml + "\n              {/* Quantity selector */}"
);

fs.writeFileSync(file, code);
console.log("Updated FoodDetails.jsx");
