const fs = require('fs');
const path = require('path');

const controllerPath = 'd:/DEMO/demo uchun/backend/controllers/productController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const newFunction = `
// @desc    Get product history (sales, returns, transfers)
// @route   GET /api/products/:id/history
// @access  Private
exports.getProductHistory = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Return = require('../models/Return');
    const Transfer = require('../models/Transfer');

    const productId = req.params.id;

    // 1. Olish: Sotuvlar (Orders)
    const orders = await Order.find({ 'items.product': productId, status: { $ne: 'cancelled' } })
      .populate('customer', 'name phone type')
      .populate('seller', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const sales = [];
    let totalSoldQty = 0;
    let totalRevenue = 0;

    orders.forEach(order => {
      const item = order.items.find(i => i.product.toString() === productId);
      if (item) {
        // activeQuantity bu (sotilgan - qaytarilgan)
        const activeQuantity = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        totalSoldQty += item.quantity;
        const itemRevenue = (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100);
        totalRevenue += itemRevenue;
        
        sales.push({
          type: 'SALE',
          id: order._id,
          number: order.orderNumber,
          date: order.createdAt,
          customer: order.customer,
          seller: order.seller,
          status: order.status,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          revenue: itemRevenue,
          returnedQuantity: item.returnedQuantity || 0
        });
      }
    });

    // 2. Olish: Vozvratlar (Returns)
    const returns = await Return.find({ 'items.product': productId })
      .populate('customer', 'name phone')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const returnEvents = [];
    let totalReturnedQty = 0;

    returns.forEach(ret => {
      const item = ret.items.find(i => i.product.toString() === productId);
      if (item) {
        totalReturnedQty += item.quantity;
        returnEvents.push({
          type: 'RETURN',
          id: ret._id,
          number: ret.returnNumber,
          date: ret.createdAt,
          customer: ret.customer,
          processor: ret.processedBy || { name: ret.processedByString || 'Tizim' },
          quantity: item.quantity,
          unit: item.unit,
          refundAmount: item.refundAmount
        });
      }
    });

    // 3. Olish: Transferlar (Transfers)
    const transfers = await Transfer.find({ 'items.product': productId })
      .populate('fromWarehouse', 'name')
      .populate('toWarehouse', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const transferEvents = [];
    transfers.forEach(tr => {
      const item = tr.items.find(i => i.product.toString() === productId);
      if (item) {
        transferEvents.push({
          type: 'TRANSFER',
          id: tr._id,
          number: tr.transferNumber,
          date: tr.createdAt,
          from: tr.fromWarehouse,
          to: tr.toWarehouse,
          status: tr.status,
          quantity: item.quantity,
          unit: item.unit || 'rulon'
        });
      }
    });

    // Birlashtirish
    const history = [...sales, ...returnEvents, ...transferEvents].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        totalSoldQty,
        totalReturnedQty,
        netSoldQty: Math.max(0, totalSoldQty - totalReturnedQty),
        totalRevenue,
        history
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
`;

content += '\n' + newFunction;
fs.writeFileSync(controllerPath, content, 'utf8');

const routePath = 'd:/DEMO/demo uchun/backend/routes/products.js';
let routeContent = fs.readFileSync(routePath, 'utf8');

routeContent = routeContent.replace(
  'getReplenishmentRecommendations,',
  'getReplenishmentRecommendations,\n  getProductHistory,'
);
routeContent = routeContent.replace(
  'router.get(\'/replenishment\', authorizeWithPermission(\'manage_products\'), getReplenishmentRecommendations);',
  'router.get(\'/replenishment\', authorizeWithPermission(\'manage_products\'), getReplenishmentRecommendations);\nrouter.get(\'/:id/history\', getProductHistory);'
);

fs.writeFileSync(routePath, routeContent, 'utf8');

console.log('Added getProductHistory endpoint');
