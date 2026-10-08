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
    const { orderId, items, reason, returnType = 'standard', totalRefundAmount: customRefundAmount } = req.body;
    const io = req.app.get('io');

    const isDefective = returnType === 'defective' || (reason && (
      reason.toLowerCase().includes('brak') || 
      reason.toLowerCase().includes('nuqson') || 
      reason.toLowerCase().includes('yaroqsiz')
    ));

    if (isDefective && (!reason || !reason.trim())) {
      throw new Error("Brak mahsulot uchun sabab (reason) ko'rsatilishi shart");
    }

    let returnResult;
    let syncDeltas;
    let populatedReturn;

    await session.withTransaction(async () => {
      // 1. Buyurtmani yuklaymiz (session bilan — lock uchun)
      const order = await Order.findById(orderId)
        .populate('items.product')
        .session(session);

      if (!order) throw new Error('Buyurtma topilmadi');

      let calculatedRefundAmount = 0;
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

        // Limit: availableToReturn = quantity - returnedQuantity - defectQuantity
        const availableToReturn = orderItem.quantity - (orderItem.returnedQuantity || 0) - (orderItem.defectQuantity || 0);
        if (returnItem.quantity > availableToReturn) {
          throw new Error(
            `Siz faqat ${availableToReturn} ta ${orderItem.unit} qaytara olasiz.`
          );
        }

        const itemSubtotal =
          (orderItem.unitPrice * returnItem.quantity) *
          (1 - (orderItem.discount || 0) / 100);
        calculatedRefundAmount += itemSubtotal;

        const itemCost = (orderItem.unitCost || 0) * returnItem.quantity;
        totalRefundCost += itemCost;

        // returnType asosida returnedQuantity yoki defectQuantity yangilanadi
        if (isDefective) {
          orderItem.defectQuantity = (orderItem.defectQuantity || 0) + returnItem.quantity;
        } else {
          orderItem.returnedQuantity = (orderItem.returnedQuantity || 0) + returnItem.quantity;
        }

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

      const totalRefundAmount = (customRefundAmount !== undefined && customRefundAmount !== null && customRefundAmount !== '')
        ? Math.max(0, Number(customRefundAmount))
        : calculatedRefundAmount;

      // 3. Return hujjati yaratish
      const [returnDoc] = await Return.create([{
        order: order._id,
        customer: order.customer,
        warehouse: order.warehouse,
        items: processedItems,
        totalRefundAmount,
        totalRefundCost,
        returnType: isDefective ? 'defective' : 'standard',
        reason: reason || (isDefective ? 'Brak mahsulot' : 'Standard vozvrat'),
        processedBy: req.user ? req.user.name : 'Tizim',
        processedById: req.user ? req.user._id : null
      }], { session });

      // 4. Stock qaytarish — Brak (nuqsonli) tovarlarni sotuv omboridan ajratish
      for (let item of processedItems) {
        if (isDefective) {
          // Brak bo'lsa — faqat defectiveQuantity ga yoziladi, sotuv omboriga (quantity) QAYTMAYDI!
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

      // 5. Order'ni yangilash (pre-save hook activeQuantity, totalAmount va debtAmount'ni qayta hisoblaydi)
      // 6. Mijoz qarzini kamaytirish va Cashback ni qaytarib olish
      const oldDebtAmount = order.debtAmount || 0;

      // ✅ FIX: order.save() OLDIN totalAmount ni saqlash (snapshot pattern)
      const snapshotTotalAmount = order.totalAmount || 1;
      const snapshotCashbackEarned = order.cashbackEarned || 0;
      const snapshotCashbackUsed   = order.cashbackUsed   || 0;

      if (order.overrideTotalAmount !== undefined && order.overrideTotalAmount !== null) {
        order.overrideTotalAmount = Math.max(0, order.overrideTotalAmount - totalRefundAmount);
      }
      const noteLabel = isDefective ? `Brak qayd etildi: ${returnDoc.returnNumber}` : `Qisman qaytarildi: ${returnDoc.returnNumber}`;
      order.notes = order.notes
        ? `${order.notes} | ${noteLabel}`
        : noteLabel;

      await order.save({ session });

      const debtReduction = Math.max(0, oldDebtAmount - order.debtAmount);
      const cashRefundAmount = Math.max(0, totalRefundAmount - debtReduction);

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

// ✅ FIX #3 (quickReturn ham): Transactionsiz stock update'ni himoya qilamiz + Brak va Mijoz integratsiyasi
exports.quickReturn = async (req, res) => {
  // Agar buyurtma tanlangan bo'lsa — to'g'ridan-to'g'ri to'liq tekshiruvchi createReturn ga yo'naltiramiz
  if (req.body.orderId) {
    return exports.createReturn(req, res);
  }

  const session = await mongoose.startSession();
  try {
    const { items, totalRefundAmount = 0, reason, warehouse, returnType = 'standard', customerId } = req.body;
    const io = req.app.get('io');

    const isDefective = returnType === 'defective' || (reason && (
      reason.toLowerCase().includes('brak') || 
      reason.toLowerCase().includes('nuqson') || 
      reason.toLowerCase().includes('yaroqsiz')
    ));

    if (isDefective && (!reason || !reason.trim())) {
      throw new Error("Brak mahsulot uchun sabab (reason) ko'rsatilishi shart");
    }

    if (totalRefundAmount < 0) {
      throw new Error("Qaytariladigan summa manfiy bo'lishi mumkin emas.");
    }

    let returnResult;
    let syncDeltas;
    let populatedReturn;
    let debtReduction = 0;
    let customerDoc = null;

    await session.withTransaction(async () => {
      let processedItems = [];
      let calculatedTotalRefundCost = 0;
      let effectiveWarehouse = warehouse || (req.user && req.user.warehouse);

      for (let returnItem of items) {
        const product = await Product.findById(returnItem.product).session(session);
        if (!product) continue;

        if (!effectiveWarehouse && product.warehouse) {
          effectiveWarehouse = product.warehouse;
        }

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

      if (!effectiveWarehouse) {
        throw new Error('Omborxona (filial) aniqlanmadi');
      }

      const returnDoc = new Return({
        warehouse: effectiveWarehouse,
        customer: customerId || null,
        items: processedItems,
        totalRefundAmount: Number(totalRefundAmount) || 0,
        totalRefundCost: calculatedTotalRefundCost,
        returnType: isDefective ? 'defective' : 'standard',
        reason: reason || (isDefective ? 'Brak mahsulot' : 'Tezkor vozvrat'),
        processedBy: req.user ? req.user.name : 'Tizim',
        processedById: req.user ? req.user._id : null
      });
      await returnDoc.save({ session });

      // Ombor zaxirasini yangilash
      for (let item of processedItems) {
        if (isDefective) {
          // Brak bo'lsa — faqat defectiveQuantity ga yoziladi, sotuv omboriga (quantity) QAYTMAYDI!
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { defectiveQuantity: item.quantityInRolls } },
            { session }
          );
        } else {
          // Soz tovar — sotuv omboriga qaytadi
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantityInRolls, soldQuantity: -item.quantityInRolls } },
            { session }
          );
        }
      }

      // Agar mijoz tanlangan bo'lsa va qaytariladigan summa bo'lsa
      if (customerId && totalRefundAmount > 0) {
        customerDoc = await Customer.findById(customerId).session(session);
        if (customerDoc) {
          debtReduction = Math.min(customerDoc.totalDebt || 0, Number(totalRefundAmount));
          await Customer.findByIdAndUpdate(
            customerId,
            {
              $inc: {
                totalDebt: -debtReduction,
                totalPurchased: -Number(totalRefundAmount)
              }
            },
            { session }
          );
          await Customer.updateOne(
            { _id: customerId, totalDebt: { $lt: 0 } },
            { $set: { totalDebt: 0 } },
            { session }
          );
        }
      }

      syncDeltas = {
        products: processedItems.map(item => ({
          id: item.product.toString(),
          delta: isDefective ? 0 : item.quantityInRolls
        })),
        customer: customerDoc ? {
          id: customerId.toString(),
          debtDelta: -debtReduction,
          purchasedDelta: -Number(totalRefundAmount)
        } : null
      };

      returnResult = returnDoc;
    });

    // ─── Side effects ───
    populatedReturn = await Return.findById(returnResult._id)
      .populate('warehouse', 'name')
      .populate('customer', 'name phone')
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
      `${isDefective ? 'Brak vozvrat' : 'Tezkor vozvrat'}: ${returnResult.returnNumber}`
    );

    res.status(201).json({ success: true, data: populatedReturn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};
