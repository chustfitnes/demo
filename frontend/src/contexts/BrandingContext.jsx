import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';

// ─── Default Branding ─────────────────────────────────────────────────────────
const DEFAULT_BRANDING = {
  storeName: 'CRM',
  tagline: 'Professional Savdo Boshqaruv Tizimi',
  logoUrl: '',
  primaryColor: '#18181b',
  accentColor: '#2563eb',
  currency: 'UZS',
};

const DEFAULT_CATEGORIES = [
  { value: 'oboi', label: 'Maxsulot (asosiy)', defaultUnit: 'rulon' },
  { value: 'other', label: 'Boshqa tovarlar', defaultUnit: 'dona' }
];

const DEFAULT_UNITS = [
  { value: 'rulon', label: 'Rulon' },
  { value: 'dona', label: 'Dona' },
  { value: 'kv.m', label: 'Kvadrat metr' },
  { value: 'ml', label: 'Millilitr' },
  { value: 'kg', label: 'Kilogram' }
];

const STORAGE_KEY = 'crm_branding';
const CAT_STORAGE_KEY = 'crm_categories';
const UNIT_STORAGE_KEY = 'crm_units';

// ─── Document and CSS applicator ──────────────────────────────────────────────
function getContrastYIQ(hexcolor) {
  if (!hexcolor) return '#FFFFFF';
  if (hexcolor.slice(0, 1) === '#') {
    hexcolor = hexcolor.slice(1);
  }
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(h => h + h).join('');
  }
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#0F0F0E' : '#FFFFFF';
}

function applyBrandingUI(branding) {
  if (!branding) return;
  const root = document.documentElement;
  if (branding.accentColor) {
    root.style.setProperty('--color-accent', branding.accentColor);
    root.style.setProperty('--accent-primary', branding.accentColor);
    
    // Tugmalar ustidagi matn rangi orqa fonga qarab moslashishi uchun
    const contrastColor = getContrastYIQ(branding.accentColor);
    root.style.setProperty('--text-on-accent', contrastColor);
  }
  
  if (branding.logoUrl) {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = branding.logoUrl;
    const shortcut = document.querySelector('link[rel="shortcut icon"]');
    if (shortcut) shortcut.href = branding.logoUrl;
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.href = branding.logoUrl;
  }
  
  if (branding.storeName) {
    document.title = branding.storeName;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  productCategories: DEFAULT_CATEGORIES,
  productUnits: DEFAULT_UNITS,
  isLoading: false,
  refreshBranding: () => {},
  updateLocalBranding: () => {},
});

export const BrandingProvider = ({ children }) => {
  const getInitial = () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return { ...DEFAULT_BRANDING, ...JSON.parse(cached) };
    } catch {}
    return DEFAULT_BRANDING;
  };

  const getInitialCategories = () => {
    try {
      const cached = localStorage.getItem(CAT_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_CATEGORIES;
  };

  const getInitialUnits = () => {
    try {
      const cached = localStorage.getItem(UNIT_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_UNITS;
  };

  const [branding, setBranding] = useState(getInitial);
  const [productCategories, setProductCategories] = useState(getInitialCategories);
  const [productUnits, setProductUnits] = useState(getInitialUnits);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    applyBrandingUI(branding);
  }, []); // eslint-disable-line

  const refreshBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settings');
      const data = res.data?.data;
      if (data) {
        if (data.branding) {
          const merged = { ...DEFAULT_BRANDING, ...data.branding };
          setBranding(merged);
          applyBrandingUI(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        if (data.productCategories) {
          setProductCategories(data.productCategories);
          localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(data.productCategories));
        }
        if (data.productUnits) {
          setProductUnits(data.productUnits);
          localStorage.setItem(UNIT_STORAGE_KEY, JSON.stringify(data.productUnits));
        }
      }
    } catch (err) {
      console.warn('[BrandingContext] Settings yuklanmadi, cached qiymat ishlatiladi:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLocalBranding = useCallback((partial) => {
    setBranding(prev => {
      const next = { ...prev, ...partial };
      applyBrandingUI(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      refreshBranding();
    }
  }, [refreshBranding]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'crm_token' && e.newValue) {
        refreshBranding();
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBranding(parsed);
          applyBrandingUI(parsed);
        } catch(err) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ 
      branding, 
      productCategories, 
      productUnits, 
      isLoading, 
      refreshBranding, 
      updateLocalBranding 
    }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);

export default BrandingContext;
