const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/pages/products/components/ProductTableDesktopRow.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add onHistoryClick prop
content = content.replace(
  'const ProductTableDesktopRow = ({',
  'const ProductTableDesktopRow = ({\n  onHistoryClick,'
);

// Make product.artikul clickable
content = content.replace(
  '<div className="text-[15px] font-[700] text-primary tracking-tight">{product.artikul}</div>',
  '<div onClick={(e) => { e.stopPropagation(); onHistoryClick && onHistoryClick(product); }} className="text-[15px] font-[700] text-primary tracking-tight cursor-pointer hover:text-blue-600 transition-colors" title="Tarixni ko\\'rish">{product.artikul}</div>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ProductTableDesktopRow');
