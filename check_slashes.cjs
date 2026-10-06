const fs = require('fs');
const path = require('path');
const dir = 'c:/foodie/src';
const walk = (d) => {
  let list = [];
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if(fs.statSync(p).isDirectory()) list = list.concat(walk(p));
    else if (p.endsWith('.js') || p.endsWith('.jsx')) list.push(p);
  });
  return list;
};
const files = walk(dir);
const r = /api\.(post|patch|put|delete)\(\s*(['`"])(.*?)\2/g;
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  let m;
  while((m = r.exec(c)) !== null) {
    const url = m[3];
    if(url.startsWith('/') && !url.endsWith('/') && !url.includes('?')) {
       console.log('Missing slash:', path.basename(f), url);
    }
  }
});
