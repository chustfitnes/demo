const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  usdExchangeRate: {
    type: Number,
    required: true,
    default: 12500
  },
  cartFields: {
    showCustomer: { type: Boolean, default: true },
    showAddress:  { type: Boolean, default: true },
    showDate:     { type: Boolean, default: true },
    showNotes:    { type: Boolean, default: true }
  },
  // ─── Funksiya sozlamalari (feature flags) ─────────────────────────────────
  features: {
    // Smena boshqaruvi (Kassir ish boshlash/yopish tizimi)
    // false = o'chirilgan (hozir default), true = yoqilgan
    shiftEnabled: { type: Boolean, default: false }
  },
  lastDailyReportDate: {
    type: String,
    default: ''
  },
  // ─── White-Label Branding Sozlamalari ─────────────────────────────────────
  // Har qanday do'kon/xizmat uchun demo maqsadida sozlanishi mumkin.
  // SuperAdmin panelidan logo, nom, rang va valyuta o'zgartiriladi.
  branding: {
    storeName:     { type: String, default: 'Mening Do\'konim' },
    tagline:       { type: String, default: 'Professional Savdo Boshqaruv Tizimi' },
    logoUrl:       { type: String, default: '' },
    logoPublicId:  { type: String, default: '' },  // Cloudinary'dan o'chirish uchun
    primaryColor:  { type: String, default: '#18181b' },
    accentColor:   { type: String, default: '#2563eb' },
    currency:      { type: String, default: 'UZS' },
  },
  // ─── Mahsulot Sozlamalari (Ixtiyoriy biznesga moslashish) ─────────────────
  productCategories: {
    type: [{
      value: { type: String, required: true }, // 'perfume', 'hardware'
      label: { type: String, required: true }, // 'Atir', 'Qurilish mollari'
      defaultUnit: { type: String, required: true } // 'ml', 'dona'
    }],
    default: [
      { value: 'oboi', label: 'Maxsulot (asosiy)', defaultUnit: 'rulon' },
      { value: 'other', label: 'Boshqa tovarlar', defaultUnit: 'dona' }
    ]
  },
  productUnits: {
    type: [{
      value: { type: String, required: true },
      label: { type: String, required: true }
    }],
    default: [
      { value: 'rulon', label: 'Rulon' },
      { value: 'dona', label: 'Dona' },
      { value: 'kv.m', label: 'Kvadrat metr' },
      { value: 'ml', label: 'Millilitr' },
      { value: 'kg', label: 'Kilogram' }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
