const fs = require('fs');
const path = 'd:/DEMO/demo uchun/backend/controllers/productController.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/type: 'SALE'/g, "type: 'SOTUV'");
content = content.replace(/type: 'RETURN'/g, "type: 'VOZVRAT'");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed backend types');
