const fs = require('fs');
const path = 'd:/DEMO/demo uchun/backend/controllers/customerController.js';
let content = fs.readFileSync(path, 'utf8');
const search = 'const debtors = await Customer.find({ isActive: true, totalDebt: { $gt: 0 } })';
const replace = `
    const debtorsWithOrders = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'delivered'] }, debtAmount: { $gt: 0 } } },
      { $group: { _id: '$customer' } }
    ]);
    const activeDebtorIds = debtorsWithOrders.map(d => d._id);

    const debtors = await Customer.find({ 
      isActive: true, 
      $or: [
        { totalDebt: { $gt: 0 } },
        { _id: { $in: activeDebtorIds } }
      ]
    })`;

content = content.replace(search, replace);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed customerController.js');
