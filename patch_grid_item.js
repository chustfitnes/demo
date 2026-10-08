const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/pages/products/components/ProductGridItem.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add onHistoryClick prop
content = content.replace(
  'const ProductGridItem = React.forwardRef(({',
  'const ProductGridItem = React.forwardRef(({\n  onHistoryClick,'
);

// Make product.artikul clickable
content = content.replace(
  '<div className="text-[14px] sm:text-[18px] font-[800] text-primary tracking-tight leading-none truncate">{product.artikul}</div>',
  '<div onClick={() => onHistoryClick && onHistoryClick(product)} className="text-[14px] sm:text-[18px] font-[800] text-primary tracking-tight leading-none truncate cursor-pointer hover:text-blue-600 transition-colors" title="Tarixni ko\\'rish">{product.artikul}</div>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ProductGridItem');
