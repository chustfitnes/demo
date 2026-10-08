const fs = require('fs');

const apiPath = 'd:/DEMO/demo uchun/frontend/src/api/index.js';
let apiContent = fs.readFileSync(apiPath, 'utf8');
apiContent = apiContent.replace(
  'export const fetchProduct     = (id)     => api.get(`/products/${id}`).then(extractData);',
  'export const fetchProduct     = (id)     => api.get(`/products/${id}`).then(extractData);\nexport const fetchProductHistory = (id) => api.get(`/products/${id}/history`).then(extractData);'
);
fs.writeFileSync(apiPath, apiContent, 'utf8');

const hookPath = 'd:/DEMO/demo uchun/frontend/src/hooks/useProducts.js';
let hookContent = fs.readFileSync(hookPath, 'utf8');
if (!hookContent.includes('useProductHistory')) {
  hookContent += `
export const useProductHistory = (id) => {
  return useQuery({
    queryKey: ['productHistory', id],
    queryFn: () => api.fetchProductHistory(id),
    enabled: !!id
  });
};
`;
  fs.writeFileSync(hookPath, hookContent, 'utf8');
}
console.log('Frontend API and Hooks updated');
