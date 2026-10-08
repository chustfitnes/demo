const fs = require('fs');
const p = 'd:/DEMO/demo uchun/frontend/src/pages/products/components/ProductTableDesktopRow.jsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  '<div className="text-[15px] font-[700] text-primary tracking-tight">{product.artikul}</div>',
  '<div onClick={(e) => { e.stopPropagation(); onHistoryClick && onHistoryClick(product); }} className="text-[15px] font-[700] text-primary tracking-tight cursor-pointer hover:text-blue-600 transition-colors" title="Tarixni ko\'rish">{product.artikul}</div>'
);
fs.writeFileSync(p, c, 'utf8');
