const mongoose = require('mongoose');
const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { logAction } = require('../utils/logger');

// ✅ FIX #3: createReturn — to'liq MongoDB transaction, qisman commit yo'q
exports.createReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, items, reason } = req.body;
    const io = req.app.get('io');

    let returnResult;
    let syncDeltas;
    let populatedReturn;

    await session.withTransaction(async () => {
      // 1. Buyurtmani yuklaymiz (session bilan — lock uchun)
      const order = await Order.findById(orderId)
        .populate('items.product')
        .session(session);

      if (!order) throw new Error('Buyurtma topilmadi');

      let totalRefundAmount = 0;
      let totalRefundCost = 0;
      const processedItems = [];

      // 2. Qaytariladigan mahsulotlarni tekshirish va hisoblash
      for (let returnItem of items) {
        const orderItem = order.items.find(
          i => i.product._id.toString() === returnItem.product
        );
        if (!orderItem) {
          throw new Error('Maxsulot buyurtmada topilmadi');
        }

        const availableToReturn = orderItem.quantity - (orderItem.returnedQuantity || 0);
        if (returnItem.quantity > availableToReturn) {
          throw new Error(
            `Siz faqat ${availableToReturn} ta ${orderItem.unit} qaytara olasiz.`
          );
        }

        const itemSubtotal =
          (orderItem.unitPrice * returnItem.quantity) *
          (1 - (orderItem.discount || 0) / 100);
        totalRefundAmount += itemSubtotal;

        const itemCost = (orderItem.unitCost || 0) * returnItem.quantity;
        totalRefundCost += itemCost;

        // returnedQuantity yangilaymiz (order saqlanganda hisob-kitob bo'ladi)
        orderItem.returnedQuantity = (orderItem.returnedQuantity || 0) + returnItem.quantity;

        const { calculateQuantityInRolls } = require('../utils/unitConverter');
        const quantityInRolls = calculateQuantityInRolls(
          returnItem.unit,
          returnItem.quantity,
          orderItem.product
        );

        processedItems.push({
          product: returnItem.product,
          unit: returnItem.unit,
          quantity: returnItem.quantity,
          quantityInRolls,
          unitPrice: orderItem.unitPrice,
          discount: orderItem.discount,
          refundAmount: itemSubtotal,
          unitCost: orderItem.unitCost || 0,
          unitCostUsd: orderItem.unitCostUsd || 0
        });
      }

      // 3. Return hujjati yaratish
      const [returnDoc] = await Return.create([{
        order: order._id,
        customer: order.customer,
        warehouse: order.warehouse,
        items: processedItems,
        totalRefundAmount,
        totalRefundCost,
        reason,
        processedBy: req.user ? req.user.name : 'Tizim',
        processedById: req.user ? req.user._id : null
      }], { session });

      // 4. Stock qaytarish — Brak (nuqsonli) tovarlarni sotuv omboridan ajratish
      const isDefective = reason && (
        reason.toLowerCase().includes('brak') || 
        reason.toLowerCase().includes('nuqson') || 
        reason.toLowerCase().includes('yaroqsiz')
      );

      for (let item of processedItems) {
        if (isDefective) {
          // Brak bo'lsa — faqat defectiveQuantity ga yoziladi, qayta sotuvga chiqmaydi
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { defectiveQuantity: item.quantityInRolls } },
            { session }
          );
        } else {
          // Soz tovar — sotuv zaxirasiga qaytadi
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantityInRolls, soldQuantity: -item.quantityInRolls } },
            { session }
          );
        }
      }

      // 5. Order'ni yangilash (pre-save hook totalAmount va debtAmount'ni qayta hisoblaydi)
      // 6. Mijoz qarzini kamaytirish va Cashback ni qaytarib olish
      const oldDebtAmount = order.debtAmount || 0;

      // ✅ FIX: order.save() OLDIN totalAmount ni saqlash (snapshot pattern)
      const snapshotTotalAmount = order.totalAmount || 1;
      const snapshotCashbackEarned = order.cashbackEarned || 0;
      const snapshotCashbackUsed   = order.cashbackUsed   || 0;

      if (order.overrideTotalAmount !== undefined && order.overrideTotalAmount !== null) {
        order.overrideTotalAmount = Math.max(0, order.overrideTotalAmount - totalRefundAmount);
      }
      order.notes = order.notes
        ? `${order.notes} | Qisman qaytarildi: ${returnDoc.returnNumber}`
        : `Qisman qaytarildi: ${returnDoc.returnNumber}`;

      await order.save({ session });

      const debtReduction = Math.max(0, oldDebtAmount - order.debtAmount);
      const cashRefundAmount = Math.max(0, totalRefundAmount - debtReduction);

      // Agar mijoz naqd to'lagan bo'lsa — kassa chiqimi (Refund Payment) rasmiylashtiriladi
      if (cashRefundAmount > 0) {
        const Payment = require('../models/Payment');
        await Payment.create([{
          order: order._id,
          customer: order.customer,
          warehouse: order.warehouse,
          amount: -cashRefundAmount,
          method: order.paymentType === 'naqd' ? 'naqd' : 'karta',
          notes: `Vozvrat chiqimi (#${returnDoc.returnNumber}): Naqd qaytarildi`,
          receivedBy: req.user ? req.user.name : 'Tizim',
          receivedById: req.user ? req.user._id : undefined
        }], { session });
      }

      // ✅ FIX: Integer arithmetic — tiyindagi floating point xatosining oldini olish
      const returnRatioMicro = Math.round(totalRefundAmount * 1_000_000 / snapshotTotalAmount);
      const reversedEarned = Math.round(snapshotCashbackEarned * returnRatioMicro / 1_000_000);
      const reversedUsed   = Math.round(snapshotCashbackUsed   * returnRatioMicro / 1_000_000);
      const cashbackDelta  = reversedUsed - reversedEarned;

      await Customer.findByIdAndUpdate(
        order.customer,
        { 
          $inc: { 
            totalDebt: -debtReduction, 
            totalPurchased: -totalRefundAmount,
            cashbackBalance: cashbackDelta
          } 
        },
        { session }
      );

      // TotalDebt hech qachon manfiy bo'lmasligi kafolatlanadi
      await Customer.updateOne({ _id: order.customer, totalDebt: { $lt: 0 } }, { $set: { totalDebt: 0 } }, { session });
      await Customer.updateOne(
        { _id: order.customer, cashbackBalance: { $lt: 0 } },
        { $set: { cashbackBalance: 0 } },
        { session }
      );

      // ✅ FIX: syncDeltas'da debtDelta bazadagi -debtReduction ga 100% mos bo'ladi (desinxronizatsiya yo'qoladi)
      syncDeltas = {
        products: processedItems.map(item => ({
          id: item.product.toString(),
          delta: isDefective ? 0 : item.quantityInRolls
        })),
        customer: {
          id: order.customer.toString(),
          debtDelta: -debtReduction,
          purchasedDelta: -totalRefundAmount,
          cashbackDelta: cashbackDelta,
          cashRefund: cashRefundAmount
        }
      };

      returnResult = returnDoc;
    });

    // ─── Side effects (transaction tashqarisida) ───
    // Populate — transaction muvaffaqiyatli tugagach
    populatedReturn = await Return.findById(returnResult._id)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .populate('items.product', 'brand artikul polka category');

    // Socket emit
    const whId = returnResult.warehouse?._id || returnResult.warehouse;
    io.to(whId.toString()).emit('return:created', { returnDoc: populatedReturn, syncDeltas });

    // Cache tozalash
    const { clearDashboardCache } = require('../controllers/orderController');
    clearDashboardCache();

    // Telegram bildirishnoma (asinxron, muvaffaqiyatsizligi kritik emas)
    const telegramBot = require('../utils/telegramBot');
    telegramBot.sendReturnReceipt(populatedReturn).catch(err =>
      console.error('Telegram vozvrat yuborish xatosi:', err)
    );

    await logAction(
      req, 'RETURN', 'Return', returnResult._id,
      `Vozvrat amalga oshirildi: ${returnResult.returnNumber} (${returnResult.totalRefundAmount} so'm)`
    );

    res.status(201).json({ success: true, data: populatedReturn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

exports.getReturns = async (req, res) => {
  try {
    const { page = 1, limit = 20, dateFrom, dateTo } = req.query;

    const query = {};

    // ✅ FIX: Rol asosidagi filterlash — Kassir faqat o'z filialini ko'rsin
    if (req.user && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      query.warehouse = req.user.warehouse;
    } else if (req.query.warehouse) {
      query.warehouse = req.query.warehouse;
    }

    // Sana filterlash
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const startIndex = (Number(page) - 1) * Number(limit);
    const total = await Return.countDocuments(query);

    const returns = await Return.find(query)
      .populate('order', 'orderNumber')
      .populate('customer', 'name phone')
      .populate('warehouse', 'name')
      .populate('items.product', 'brand artikul polka category')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: returns,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ FIX #3 (quickReturn ham): Transactionsiz stock update'ni himoya qilamiz
exports.quickReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { items, totalRefundAmount, reason, warehouse } = req.body;
    const io = req.app.get('io');

    let returnResult;
    let syncDeltas;
    let populatedReturn;

    if (totalRefundAmount < 0) {
      throw new Error("Qaytariladigan summa manfiy bo'lishi mumkin emas.");
    }

    await session.withTransaction(async () => {
      let processedItems = [];
      let calculatedTotalRefundCost = 0;

      for (let returnItem of items) {
        const product = await Product.findById(returnItem.product).session(session);
        if (!product) continue;

        const { calculateQuantityInRolls } = require('../utils/unitConverter');
        const quantityInRolls = calculateQuantityInRolls(
          returnItem.unit,
          returnItem.quantity,
          product
        );

        const itemCost = (product.costPrice || 0) * returnItem.quantity;
        calculatedTotalRefundCost += itemCost;

        processedItems.push({
          product: returnItem.product,
          unit: returnItem.unit,
          quantity: returnItem.quantity,
          quantityInRolls,
          unitPrice: returnItem.unitPrice || product.pricePerRoll,
          discount: 0,
          refundAmount: returnItem.refundAmount || 0,
          unitCost: product.costPrice || 0,
          unitCostUsd: product.costPriceUsd || 0
        });
      }

      if (processedItems.length === 0) {
        throw new Error('Qaytariladigan mahsulotlar yaroqsiz');
      }

      const returnDoc = new Return({
        warehouse,
        items: processedItems,
        totalRefundAmount: totalRefundAmount || 0,
        totalRefundCost: calculatedTotalRefundCost,
        reason: reason || 'Tezkor vozvrat',
        processedBy: req.user ? req.user.name : 'Tizim'
      });
      await returnDoc.save({ session });

      // Atomic stock qaytarish
      for (let item of processedItems) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: item.quantityInRolls, soldQuantity: -item.quantityInRolls } },
          { session }
        );
      }

      syncDeltas = {
        products: processedItems.map(item => ({
          id: item.product.toString(),
          delta: item.quantityInRolls
        })),
        customer: null
      };

      returnResult = returnDoc;
    });

    // ─── Side effects ───
    populatedReturn = await Return.findById(returnResult._id)
      .populate('warehouse', 'name')
      .populate('items.product', 'brand artikul polka category');

    const whId = returnResult.warehouse?._id || returnResult.warehouse;
    io.to(whId.toString()).emit('return:created', { returnDoc: populatedReturn, syncDeltas });

    const { clearDashboardCache } = require('../controllers/orderController');
    clearDashboardCache();

    const telegramBot = require('../utils/telegramBot');
    telegramBot.sendQuickReturnReceipt(populatedReturn).catch(err =>
      console.error('Telegram tezkor vozvrat yuborish xatosi:', err)
    );

    await logAction(
      req, 'RETURN', 'Return', returnResult._id,
      `Tezkor vozvrat: ${returnResult.returnNumber}`
    );

    res.status(201).json({ success: true, data: populatedReturn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};
