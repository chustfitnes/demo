const fs = require('fs');
const path = 'd:/DEMO/demo uchun/backend/controllers/customerController.js';
let content = fs.readFileSync(path, 'utf8');

const search = `    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    const debtorsWithStats = debtors.map(c => ({
      ...c,
      lastOrderDate: statsMap[c._id.toString()]?.lastOrderDate || null,
      unpaidOrdersCount: statsMap[c._id.toString()]?.unpaidOrdersCount || 0
    }));

    res.status(200).json({ success: true, data: debtorsWithStats });`;

const replace = `    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    const Payment = require('../models/Payment');
    const paymentStats = await Payment.aggregate([
      { $match: { customer: { $in: debtorIds }, notes: { $ne: "Boshlang'ich to'lov" } } },
      { $group: { _id: '$customer', totalPaid: { $sum: '$amount' } } }
    ]);
    const paymentMap = {};
    paymentStats.forEach(stat => paymentMap[stat._id.toString()] = stat.totalPaid);

    const debtorsWithStats = debtors.map(c => {
      const paid = paymentMap[c._id.toString()] || 0;
      const debt = Math.max(0, c.totalDebt || 0);
      return {
        ...c,
        lastOrderDate: statsMap[c._id.toString()]?.lastOrderDate || null,
        unpaidOrdersCount: statsMap[c._id.toString()]?.unpaidOrdersCount || 0,
        totalPaid: paid,
        initialDebt: debt + paid
      };
    });

    res.status(200).json({ success: true, data: debtorsWithStats });`;

content = content.replace(search, replace);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed getDebtors with payment stats');
