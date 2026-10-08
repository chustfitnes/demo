const fs = require('fs');
const p = 'd:/DEMO/demo uchun/frontend/src/pages/products/components/ProductTableMobileRow.jsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'const ProductTableMobileRow = React.forwardRef(({',
  'const ProductTableMobileRow = React.forwardRef(({\n  onHistoryClick,'
);

c = c.replace(
  '<div className="text-[14px] font-[700] text-primary tracking-tight">{product.artikul}</div>',
  '<div onClick={(e) => { e.stopPropagation(); onHistoryClick && onHistoryClick(product); }} className="text-[14px] font-[700] text-primary tracking-tight cursor-pointer hover:text-blue-600 transition-colors" title="Tarixni ko\'rish">{product.artikul}</div>'
);

fs.writeFileSync(p, c, 'utf8');
