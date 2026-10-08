const fs = require('fs');

const path = 'd:/DEMO/demo uchun/frontend/src/pages/ProductsPage.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('ProductHistoryDrawer')) {
  content = content.replace(
    "import ProductModal from '../components/ProductModal';",
    "import ProductModal from '../components/ProductModal';\nimport ProductHistoryDrawer from '../components/ProductHistoryDrawer';"
  );
  
  content = content.replace(
    'const [editingProduct, setEditingProduct] = useState(null);',
    'const [editingProduct, setEditingProduct] = useState(null);\n  const [historyDrawerProduct, setHistoryDrawerProduct] = useState(null);'
  );
  
  content = content.replace(/<ProductGridItem/g, '<ProductGridItem onHistoryClick={() => setHistoryDrawerProduct(product)}');
  content = content.replace(/<ProductTableDesktopRow/g, '<ProductTableDesktopRow onHistoryClick={() => setHistoryDrawerProduct(product)}');
  content = content.replace(/<ProductTableMobileRow/g, '<ProductTableMobileRow onHistoryClick={() => setHistoryDrawerProduct(product)}');
  
  content = content.replace(
    '</Layout>',
    '  <ProductHistoryDrawer isOpen={!!historyDrawerProduct} onClose={() => setHistoryDrawerProduct(null)} product={historyDrawerProduct} />\n    </Layout>'
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched ProductsPage.jsx');
}
