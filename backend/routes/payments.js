const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  getCustomerPayments,
  deletePayment,
  updatePayment
} = require('../controllers/paymentController');

const idempotency = require('../middleware/idempotency');

router.route('/')
  .get(getPayments)
  .post(idempotency, createPayment);

router.get('/customer/:customerId', getCustomerPayments);

router.route('/:id')
  .put(updatePayment)
  .delete(deletePayment);

module.exports = router;
