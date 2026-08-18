const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Mahsulot rasmlari uchun storage ─────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'crm/products',
    format: 'webp',
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm formatidagi fayllar yuklanishi mumkin (jpg, png, jpeg, webp, heic, gif, etc.)!'), false);
    }
  }
});

// ─── Branding logo uchun alohida storage ─────────────────────────────────────
// PNG/SVG formatini saqlaydi (webp conversion yo'q — shaffoflik saqlanadi)
const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPng = file.mimetype === 'image/png';
    const isSvg = file.mimetype === 'image/svg+xml';
    return {
      folder: 'crm/branding',
      public_id: 'store_logo',          // Har doim bir xil nom — eski fayl ustiga yoziladi
      overwrite: true,
      invalidate: true,
      format: isSvg ? 'svg' : 'png',    // SVG va PNG shaffofligini saqlash
      transformation: [
        { width: 512, height: 512, crop: 'limit' },
        { quality: 'auto' }
      ]
    };
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Logo uchun faqat JPG, PNG, WebP yoki SVG formatdagi fayllar yuklanishi mumkin!'), false);
    }
  }
});

module.exports = { upload, logoUpload, cloudinary };

