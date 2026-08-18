const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authorize } = require('../middleware/authMiddleware');

router.post('/send-daily', authorize('superadmin', 'admin', 'manager'), reportController.sendManualReport);
router.get('/sales', authorize('superadmin', 'admin', 'manager', 'cashier'), reportController.getSalesReport);
router.get('/export-excel', authorize('superadmin', 'admin', 'manager'), reportController.exportSalesExcel);

module.exports = router;
