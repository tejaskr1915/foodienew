const fs = require('fs');
const file = 'c:/web developing/foodie/foodie/src/utils/categoryUtils.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace("const catOrigNorm = typeof cat === 'object' && cat.originalName ? normalizeCategoryName(cat.originalName) : catNorm;\r\n\r\n  if (dNorm === catNorm", "if (dNorm === catNorm");
code = code.replace("const catOrigNorm = typeof cat === 'object' && cat.originalName ? normalizeCategoryName(cat.originalName) : catNorm;\n\n  if (dNorm === catNorm", "if (dNorm === catNorm");
fs.writeFileSync(file, code);
