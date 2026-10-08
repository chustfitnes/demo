const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/components/DebtHistoryDrawer.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const payments = paymentsRes?.data || [];',
  'const allPayments = paymentsRes?.data || [];\n  const payments = allPayments.filter(p => p.notes !== "Boshlang\'ich to\'lov");'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Filtered payments');
