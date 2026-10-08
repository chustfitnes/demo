const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/components/ProductHistoryDrawer.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/h\.type === 'SOTUV'/g, "h.type === 'SALE'");
content = content.replace(/h\.type === 'VOZVRAT'/g, "h.type === 'RETURN'");

content = content.replace(/item\.type === 'SOTUV'/g, "item.type === 'SALE'");
content = content.replace(/item\.type === 'VOZVRAT'/g, "item.type === 'RETURN'");

content = content.replace(
  />\{item\.type\}<\/span>/g,
  ">{item.type === 'SALE' ? 'SOTUV' : item.type === 'RETURN' ? 'VOZVRAT' : item.type}</span>"
);

content = content.replace(
  /className="text-11 sm:text-12 font-mono text-tertiary"/g,
  'className="text-11 sm:text-12 font-mono text-tertiary whitespace-nowrap"'
);

content = content.replace(
  /className={`hidden sm:inline-flex px-1\.5/g,
  'className={`hidden sm:inline-flex whitespace-nowrap shrink-0 px-1.5'
);

// Check if customer name logic uses type === 'SALE'
// We reverted item.type === 'SOTUV' to 'SALE' so it should work now!

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed logical bugs');
