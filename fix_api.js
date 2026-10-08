const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/api/index.js';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('deletePayment')) {
  content = content.replace(
    'export const fetchCustomerPayments',
    'export const deletePayment = (id) => api.delete(`/payments/${id}`).then(extractData);\nexport const updatePayment = ({ id, data }) => api.put(`/payments/${id}`, data).then(extractData);\nexport const fetchCustomerPayments'
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed api/index.js');
}
