const fs = require('fs');
const path = 'd:/DEMO/demo uchun/backend/controllers/returnController.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /totalDebt:\s*-totalRefundAmount/,
  'totalDebt: -debtReduction'
);

content = content.replace(
  /\/\/ Store credit uchun totalDebt manfiy bo\'lishiga ruxsat beramiz\.\s*\n\s*\/\/ Safety: totalDebt check olib tashlandi\./,
  `// Safety: totalDebt check added back to avoid negative store credits wiping out generic debts
        await Customer.updateOne(
          { _id: order.customer, totalDebt: { $lt: 0 } },
          { $set: { totalDebt: 0 } },
          { session }
        );`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed returnController.js');
