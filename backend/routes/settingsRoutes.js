const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getDbStats, clearDomain, uploadLogo, deleteLogo } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { logoUpload } = require('../middleware/upload');

router.get('/', protect, getSettings);
router.put('/', protect, authorize('superadmin', 'admin'), updateSettings);
router.get('/db-stats', protect, authorize('superadmin', 'admin'), getDbStats);
router.post('/clear-domain', protect, authorize('superadmin', 'admin'), clearDomain);

// ─── Branding Logo Routes ──────────────────────────────────────────────────────
// logoUpload — multer middleware, Cloudinaryga yuklaydi, keyin controller ishlaydi
router.post('/upload-logo', protect, authorize('superadmin', 'admin'), logoUpload.single('logo'), uploadLogo);
router.delete('/logo', protect, authorize('superadmin', 'admin'), deleteLogo);

module.exports = router;

