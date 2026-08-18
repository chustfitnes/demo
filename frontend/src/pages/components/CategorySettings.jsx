import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Save, Tags } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import { useBranding } from '../../contexts/BrandingContext';
import toast from 'react-hot-toast';

const CategorySettings = () => {
  const { data: settingsRes } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { refreshBranding } = useBranding();

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // Load from API
  useEffect(() => {
    if (settingsRes?.data) {
      setCategories(settingsRes.data.productCategories || []);
      setUnits(settingsRes.data.productUnits || []);
    }
  }, [settingsRes]);

  const handleAddCategory = () => {
    setCategories([...categories, { value: '', label: '', defaultUnit: 'dona' }]);
  };

  const handleRemoveCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleChangeCategory = (index, field, value) => {
    const newCats = [...categories];
    newCats[index][field] = value;
    if (field === 'label') {
      newCats[index].value = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setCategories(newCats);
  };

  const handleAddUnit = () => {
    setUnits([...units, { value: '', label: '' }]);
  };

  const handleRemoveUnit = (index) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleChangeUnit = (index, field, value) => {
    const newUnits = [...units];
    newUnits[index][field] = value;
    if (field === 'label') {
      newUnits[index].value = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setUnits(newUnits);
  };

  const handleSave = () => {
    // Basic validation
    const validCats = categories.filter(c => c.value && c.label && c.defaultUnit);
    const validUnits = units.filter(u => u.value && u.label);

    updateSettingsMutation.mutate({ 
      productCategories: validCats,
      productUnits: validUnits
    }, {
      onSuccess: () => {
        toast.success("Mahsulot toifalari saqlandi!");
        refreshBranding();
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Saqlashda xatolik yuz berdi");
      }
    });
  };

  return (
    <div className="bg-surface border border-subtle rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
      <h2 className="text-16 font-[600] text-primary mb-2 flex items-center gap-2">
        <Package className="w-5 h-5 text-indigo-500" /> Mahsulot Toifalari va Birliklari
      </h2>
      <p className="text-13 text-secondary mb-6 pb-4 border-b border-subtle">
        O'z biznesingizga mos mahsulot kategoriyalari va o'lchov birliklarini (ml, dona, kg) erkin kiriting.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ─── Kategoriyalar ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-14 font-[600] text-primary flex items-center gap-2">
              <Tags className="w-4 h-4 text-tertiary" /> Kategoriyalar
            </h3>
            <button 
              onClick={handleAddCategory}
              className="text-12 font-[600] text-accent hover:opacity-80 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Qo'shish
            </button>
          </div>
          
          <div className="space-y-3">
            {categories.length === 0 && <p className="text-12 text-tertiary">Kategoriya qo'shilmagan</p>}
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-app p-3 rounded-xl border border-subtle relative group">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={cat.label}
                    onChange={e => handleChangeCategory(idx, 'label', e.target.value)}
                    placeholder="Masalan: Atir, Oboi, Shampun"
                    className="w-full h-[36px] bg-surface border border-subtle hover:border-default focus:border-focus rounded-lg px-3 text-13 font-[500] text-primary outline-none transition-all"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-11 text-tertiary">Birligi:</span>
                    <select
                      value={cat.defaultUnit}
                      onChange={e => handleChangeCategory(idx, 'defaultUnit', e.target.value)}
                      className="h-[32px] bg-surface border border-subtle hover:border-default focus:border-focus rounded-lg px-2 text-12 font-[500] text-primary outline-none transition-all flex-1 appearance-none"
                    >
                      {units.map((u, i) => (
                        <option key={i} value={u.value}>{u.label}</option>
                      ))}
                      {/* Fallback option if units is empty */}
                      {units.length === 0 && <option value="dona">Dona</option>}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveCategory(idx)}
                  className="w-8 h-8 rounded-lg bg-state-danger-bg text-state-danger-text flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 -top-2 border border-state-danger-border shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── O'lchov birliklari ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-14 font-[600] text-primary flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center bg-emerald-500/10 text-emerald-600 rounded">U</span> Birliklar
            </h3>
            <button 
              onClick={handleAddUnit}
              className="text-12 font-[600] text-emerald-600 hover:opacity-80 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Qo'shish
            </button>
          </div>
          
          <div className="space-y-3">
            {units.length === 0 && <p className="text-12 text-tertiary">Birlik qo'shilmagan</p>}
            {units.map((unit, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-app p-3 rounded-xl border border-subtle group">
                <input
                  type="text"
                  value={unit.label}
                  onChange={e => handleChangeUnit(idx, 'label', e.target.value)}
                  placeholder="Masalan: dona, ml, kg"
                  className="flex-1 h-[36px] bg-surface border border-subtle hover:border-default focus:border-focus rounded-lg px-3 text-13 font-[500] text-primary outline-none transition-all"
                />
                <button 
                  onClick={() => handleRemoveUnit(idx)}
                  className="w-8 h-8 rounded-lg text-tertiary hover:bg-state-danger-bg hover:text-state-danger-text flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="mt-6 flex items-center gap-3 pt-4 border-t border-subtle justify-end">
        <button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="h-[44px] px-8 rounded-xl text-14 font-[600] text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm bg-accent hover:bg-accent-hover"
        >
          <Save className="w-4 h-4" strokeWidth={2} />
          {updateSettingsMutation.isPending ? 'Saqlanmoqda...' : 'Toifa va Birliklarni Saqlash'}
        </button>
      </div>

    </div>
  );
};

export default CategorySettings;
