import React, { useState } from 'react';
import { X, Clock, Edit2, Trash2, MoreVertical, CreditCard, Banknote, Calendar } from 'lucide-react';
import { useCustomerPayments, useDeletePayment, useUpdatePayment } from '../hooks/usePayments';
import { formatUZS } from '../utils/format';

const DebtHistoryDrawer = ({ isOpen, onClose, customer, onMakePayment }) => {
  const { data: paymentsRes, isLoading } = useCustomerPayments(customer?._id);
  const allPayments = paymentsRes?.data || [];
  const payments = allPayments.filter(p => p.notes !== "Boshlang'ich to'lov");
  const deleteMutation = useDeletePayment();
  const updateMutation = useUpdatePayment();

  const [activeTab, setActiveTab] = useState('all');
  const [menuOpenId, setMenuOpenId] = useState(null);

  if (!isOpen || !customer) return null;

  const totalPaid = customer.totalPaid || 0;
  const totalDebt = Math.max(0, customer.totalDebt || 0);
  const initialDebt = customer.initialDebt || (totalDebt + totalPaid);
  const progressPercent = initialDebt > 0 ? Math.round((totalPaid / initialDebt) * 100) : 0;

  const naqdTotal = payments.filter(p => p.method === 'naqd').reduce((sum, p) => sum + p.amount, 0);
  const kartaTotal = payments.filter(p => p.method === 'karta').reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter(p => {
    if (activeTab === 'naqd') return p.method === 'naqd';
    if (activeTab === 'karta') return p.method === 'karta';
    return true;
  });

  const handleDelete = (id) => {
    if (window.confirm("Bu to'lovni o'chirishga ishonchingiz komilmi?")) {
      deleteMutation.mutate(id);
      setMenuOpenId(null);
    }
  };

  const handleEdit = (id) => {
    // Tahrirlash mantig'i: hozircha usulni almashtirish yoki izoh yozish qismi
    const method = window.prompt("Yangi to'lov usulini kiriting (naqd/karta):");
    if (method && ['naqd', 'karta'].includes(method.toLowerCase())) {
      updateMutation.mutate({ id, data: { method: method.toLowerCase() } });
    }
    setMenuOpenId(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-surface shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-left">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-subtle relative flex items-start justify-between">
          <div>
            <h2 className="text-22 font-[700] text-primary tracking-tight">{customer.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-14 text-secondary font-mono">{customer.phone}</span>
              <span className="px-2 py-0.5 rounded text-10 font-[700] uppercase tracking-wider bg-subtle text-secondary">
                {customer.type === 'wholesale' ? 'Sotuv' : 'Chakana'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle/50 flex items-center justify-center text-secondary hover:bg-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Qarz Holati */}
          <section>
            <h3 className="text-12 font-[700] text-tertiary uppercase tracking-wider mb-3">Qarz Holati</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border border-subtle bg-app flex flex-col items-center justify-center text-center">
                <span className="text-11 font-[600] text-secondary uppercase tracking-wider mb-1">Dastlabki</span>
                <span className="text-14 font-[700] text-primary tabular-nums">{formatUZS(initialDebt)}</span>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center text-center">
                <span className="text-11 font-[600] text-emerald-600 uppercase tracking-wider mb-1">To'langan</span>
                <span className="text-14 font-[700] text-emerald-600 tabular-nums">{formatUZS(totalPaid)}</span>
              </div>
              <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center text-center">
                <span className="text-11 font-[600] text-rose-600 uppercase tracking-wider mb-1">Qoldi</span>
                <span className="text-14 font-[700] text-rose-600 tabular-nums">{formatUZS(totalDebt)}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                <div className="absolute top-0 right-0 h-full bg-rose-500 transition-all duration-500" style={{ width: `${100 - progressPercent}%` }}></div>
              </div>
              <div className="flex items-center justify-between mt-2 text-13">
                <span className="font-[600] text-emerald-600">✓ {formatUZS(totalPaid)} to'langan ({progressPercent}%)</span>
                <span className="font-[600] text-rose-600">{formatUZS(totalDebt)} qoldi</span>
              </div>
            </div>
          </section>

          {/* To'lov usullari */}
          <section>
            <h3 className="text-12 font-[700] text-tertiary uppercase tracking-wider mb-3">To'lov Usullari Bo'yicha</h3>
            <div className="flex flex-wrap gap-2">
              {naqdTotal > 0 && (
                <div className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-emerald-700">
                  <Banknote className="w-4 h-4" />
                  <span className="text-13 font-[600]">Naqd: {formatUZS(naqdTotal)}</span>
                </div>
              )}
              {kartaTotal > 0 && (
                <div className="px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center gap-2 text-blue-700">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-13 font-[600]">Karta: {formatUZS(kartaTotal)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Tarix */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-12 font-[700] text-tertiary uppercase tracking-wider">To'lovlar Tarixi</h3>
              <span className="px-2 py-0.5 rounded-full bg-raised text-11 font-[600] text-secondary">{payments.length}</span>
            </div>
            
            <div className="flex items-center gap-1.5 mb-4 p-1 bg-subtle/80 rounded-xl border border-subtle max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-lg text-13 font-[600] transition-all ${activeTab === 'all' ? 'bg-surface border border-subtle text-primary shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'}`}>
                Barchasi ({payments.length})
              </button>
              <button onClick={() => setActiveTab('naqd')} className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-lg text-13 font-[600] transition-all ${activeTab === 'naqd' ? 'bg-surface border border-subtle text-primary shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'}`}>
                Naqd ({payments.filter(p => p.method === 'naqd').length})
              </button>
              <button onClick={() => setActiveTab('karta')} className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-lg text-13 font-[600] transition-all ${activeTab === 'karta' ? 'bg-surface border border-subtle text-primary shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'}`}>
                Karta ({payments.filter(p => p.method === 'karta').length})
              </button>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-6 text-tertiary text-13">Yuklanmoqda...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 bg-app rounded-xl border border-dashed border-subtle">
                  <Clock className="w-8 h-8 text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-13 text-secondary font-[500]">To'lovlar topilmadi</p>
                </div>
              ) : (
                filteredPayments.map((p, idx) => (
                  <div key={p._id} className="relative flex items-start gap-4 p-4 rounded-xl border border-subtle bg-app hover:border-default transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-600">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-16 font-[700] text-emerald-600 tabular-nums">+ {formatUZS(p.amount)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-[700] uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {p.method}
                          </span>
                        </div>
                        <div className="relative">
                          <button onClick={() => setMenuOpenId(menuOpenId === p._id ? null : p._id)} className="w-8 h-8 rounded-full flex items-center justify-center text-tertiary hover:bg-subtle transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === p._id && (
                            <div className="absolute right-0 mt-1 w-36 bg-surface border border-subtle rounded-lg shadow-xl py-1 z-10 animate-fade-in">
                              <button onClick={() => handleEdit(p._id)} className="w-full text-left px-3 py-2 text-13 font-[500] text-secondary hover:bg-raised flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Tahrirlash
                              </button>
                              <button onClick={() => handleDelete(p._id)} className="w-full text-left px-3 py-2 text-13 font-[500] text-rose-600 hover:bg-rose-500/10 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> O'chirish
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-12 text-secondary mt-1">
                        <span className="text-tertiary">#{payments.length - idx}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(p.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="font-[500]">{p.receivedBy}</span>
                      </div>
                      {p.notes && (
                        <div className="mt-2.5 px-3 py-2 rounded bg-raised border border-subtle text-12 text-secondary italic">
                          "{p.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-subtle bg-app">
          <button 
            onClick={onMakePayment}
            className="w-full h-12 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-15 font-[600] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          >
            Yangi to'lov qabul qilish
          </button>
        </div>
      </div>
    </>
  );
};

export default DebtHistoryDrawer;
