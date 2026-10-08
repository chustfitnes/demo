const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/components/ProductHistoryDrawer.jsx';
let content = fs.readFileSync(path, 'utf8');

// Icons
content = content.replace('ShoppingBag, ArrowLeftRight, RotateCcw, ChevronDown, ChevronUp', 'ShoppingBag, ArrowLeftRight, RotateCcw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Layers');

// Box 1
content = content.replace('<ShoppingBag className="w-4 h-4 text-emerald-600" />', '<TrendingUp className="w-4 h-4 text-emerald-600" />');

// Box 2
content = content.replace('<RotateCcw className="w-4 h-4 text-rose-600" />', '<TrendingDown className="w-4 h-4 text-rose-600" />');

// Box 3
content = content.replace(/<div className="w-4 h-4 rounded-sm border-2 border-blue-600 relative">[\s\S]*?<\/div>/, '<Layers className="w-4 h-4 text-blue-600" />');

// Translation for list items
content = content.replace(/item\.type === 'SALE'/g, "item.type === 'SOTUV'");
content = content.replace(/item\.type === 'RETURN'/g, "item.type === 'VOZVRAT'");
content = content.replace(/item\.type === 'TRANSFER'/g, "item.type === 'TRANSFER'");

content = content.replace(/'SALE'/g, "'SOTUV'");
content = content.replace(/'RETURN'/g, "'VOZVRAT'");

// Fix the date formatting to match YYYY-MM-DD HH:mm
content = content.replace(
  /new Date\(item\.date\)\.toLocaleString\('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }\)/g,
  "new Date(item.date).toISOString().replace('T', ' ').substring(0, 16)"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed UI details');
