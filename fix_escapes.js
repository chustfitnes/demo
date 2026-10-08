const fs = require('fs');
const files = [
  'd:/DEMO/demo uchun/frontend/src/pages/DebtPage.jsx',
  'd:/DEMO/demo uchun/frontend/src/components/DebtHistoryDrawer.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\`/g, '\`');
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed syntax!');
