const fs = require('fs');
const path = 'd:/DEMO/demo uchun/frontend/src/pages/ProductsPage.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('<ProductHistoryDrawer')) {
  content = content.replace(
    '{viewerImages && <ImageViewerModal images={viewerImages} onClose={() => setViewerImages(null)} />}',
    '{viewerImages && <ImageViewerModal images={viewerImages} onClose={() => setViewerImages(null)} />}\n      <ProductHistoryDrawer isOpen={!!historyDrawerProduct} onClose={() => setHistoryDrawerProduct(null)} product={historyDrawerProduct} />'
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Added ProductHistoryDrawer to ProductsPage');
} else {
  console.log('Already exists');
}
