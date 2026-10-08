const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/api/index.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('deletePayment')) {
  content = content.replace(
    'export const createPayment    = (data)   => api.post(\'/payments\', data).then(extractData);',
    `export const createPayment    = (data)   => api.post('/payments', data).then(extractData);
export const fetchCustomerPayments = (customerId) => api.get(\`/payments/customer/\${customerId}\`).then(extractData);
export const deletePayment = (id) => api.delete(\`/payments/\${id}\`).then(extractData);
export const updatePayment = ({ id, data }) => api.put(\`/payments/\${id}\`, data).then(extractData);`
  );
  fs.writeFileSync(path, content, 'utf8');
}
console.log('Fixed api/index.js correctly');
