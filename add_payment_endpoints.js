const fs = require('fs');
const path = require('path');

const paymentControllerPath = 'd:/DEMO/demo uchun/backend/controllers/paymentController.js';
let content = fs.readFileSync(paymentControllerPath, 'utf8');

const newFunctions = `
// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
exports.deletePayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(req.params.id).session(session);
      if (!payment) throw new Error("To'lov topilmadi");
      
      await Customer.findByIdAndUpdate(payment.customer, {
        $inc: { totalDebt: payment.amount }
      }, { session });

      if (payment.order) {
        await Order.findByIdAndUpdate(payment.order, {
          $inc: { paidAmount: -payment.amount, debtAmount: payment.amount }
        }, { session });
      } else {
        const orders = await Order.find({ 
          customer: payment.customer, 
          status: { $in: ['confirmed', 'delivered'] },
          paidAmount: { $gt: 0 }
        }).sort({ createdAt: -1 }).session(session);

        let remainingToReverse = payment.amount;
        const bulkOperations = [];
        for (let o of orders) {
          if (remainingToReverse <= 0) break;
          // For Boshlang'ich to'lov, we don't want to reverse checkout payments easily, but if they paid generally, we just reverse recent paidAmounts.
          // To be safe, we reverse up to the amount paid on this order.
          const apply = Math.min(remainingToReverse, o.paidAmount);
          bulkOperations.push({
            updateOne: {
              filter: { _id: o._id },
              update: {
                $inc: { paidAmount: -apply, debtAmount: apply }
              }
            }
          });
          remainingToReverse -= apply;
        }
        if (bulkOperations.length > 0) {
          await Order.bulkWrite(bulkOperations, { session });
        }
      }
      
      await Payment.findByIdAndDelete(payment._id, { session });
    });
    
    // Clear cache
    const { clearDashboardCache } = require('../controllers/orderController');
    clearDashboardCache();

    res.status(200).json({ success: true, message: "To'lov o'chirildi" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
exports.updatePayment = async (req, res) => {
  // Simplified update for method and notes
  try {
    const { method, notes } = req.body;
    const payment = await Payment.findByIdAndUpdate(req.params.id, { method, notes }, { new: true });
    if (!payment) throw new Error("To'lov topilmadi");
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
`;

content += '\n' + newFunctions;
fs.writeFileSync(paymentControllerPath, content, 'utf8');

const paymentsRoutePath = 'd:/DEMO/demo uchun/backend/routes/payments.js';
let routeContent = fs.readFileSync(paymentsRoutePath, 'utf8');
routeContent = routeContent.replace(
  'getCustomerPayments',
  'getCustomerPayments,\n  deletePayment,\n  updatePayment'
);
routeContent = routeContent.replace(
  'module.exports = router;',
  `router.route('/:id')\n  .put(updatePayment)\n  .delete(deletePayment);\n\nmodule.exports = router;`
);
fs.writeFileSync(paymentsRoutePath, routeContent, 'utf8');

console.log('Added deletePayment and updatePayment endpoints');
