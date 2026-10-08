import React, { useState, useMemo } from 'react';
import { Scale, Search, Phone, ChevronRight, AlertCircle, Users, RefreshCw, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebtors } from '../hooks/useCustomers';
import PaymentModal from '../components/PaymentModal';
import DebtHistoryDrawer from '../components/DebtHistoryDrawer';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
};

// Yoki UZS uchun (loyihada qaysi biri ishlatilayotgan bo'lsa):
const formatUZS = (val) => {
  return new Intl.NumberFormat('ru-RU').format(val || 0).replace(/,/g, ' ') + " so'm";
};

// Rasmlardagi kabi $ formatini ishlatamiz, yoki tizim kodi formatUZS ishlatsa formatUZS. Biz original formatUZS ga qaytamiz, lekin dizayn screenshot kabi bo'ladi.
const formatMoney = (val) => formatUZS(val);

const DebtPage = () => {
  const [search, setSearch] = useState('');
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [historyDrawerData, setHistoryDrawerData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setIsSyncing(true);
    await queryClient.invalidateQueries({ queryKey: ['debtors'] });
    setTimeout(() => setIsSyncing(false), 500);
  };

  const { data: debtorsRes, isLoading } = useDebtors();
  const debtors = debtorsRes?.data || [];

  const filteredDebtors = useMemo(() => {
    if (!search) return debtors;
    const lower = search.toLowerCase();
    return debtors.filter(d => d.name.toLowerCase().includes(lower) || d.phone.includes(lower));
  }, [search, debtors]);

  const totalDebtAmount = useMemo(() => debtors.reduce((sum, d) => sum + Math.max(0, d.totalDebt || 0), 0), [debtors]);
  const totalPaidAmount = useMemo(() => debtors.reduce((sum, d) => sum + (d.totalPaid || 0), 0), [debtors]);
  const totalInitialAmount = totalDebtAmount + totalPaidAmount;
  const globalProgress = totalInitialAmount > 0 ? Math.round((totalPaidAmount / totalInitialAmount) * 100) : 0;

  return (
    <div className="p-2 pb-[100px] sm:p-[32px_40px] animate-fade-in bg-app min-h-screen">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-[26px] font-[700] tracking-tight text-primary">Qarzdorlik</h1>
          <p className="text-14 text-secondary mt-1 font-[500]">Mijozlarning joriy nasiya va qarzlari holati.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 shrink-0">
        {/* Card 1: Jami qarzdorlik */}
        <div className="bg-surface border border-subtle rounded-2xl p-6 flex items-start justify-between relative overflow-hidden group shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-rose-600 rounded-l-2xl" />
          <div className="w-full">
            <div className="flex items-center gap-2 text-13 font-[600] text-secondary mb-3">
              <AlertCircle className="w-[16px] h-[16px] text-rose-600" strokeWidth={2} /> Jami qarzdorlik
            </div>
            <div className="text-[32px] font-[700] text-rose-600 tracking-tight">
              {formatMoney(totalDebtAmount)}
            </div>
          </div>
        </div>

        {/* Card 2: Jami to'langan */}
        <div className="bg-surface border border-subtle rounded-2xl p-6 flex items-start justify-between relative overflow-hidden shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
          <div className="w-full">
            <div className="flex items-center gap-2 text-13 font-[600] text-secondary mb-3">
              <RefreshCw className="w-[16px] h-[16px] text-emerald-500" strokeWidth={2} /> Jami to'langan
            </div>
            <div className="text-[32px] font-[700] text-emerald-600 tracking-tight mb-2">
              {formatMoney(totalPaidAmount)}
            </div>
            <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden flex">
               <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalProgress}%` }}></div>
            </div>
            <div className="text-11 font-[600] text-tertiary uppercase tracking-wider mt-2">
              {globalProgress}% umumiy to'lov
            </div>
          </div>
        </div>

        {/* Card 3: Qarzdor mijozlar */}
        <div className="bg-surface border border-subtle rounded-2xl p-6 flex items-start justify-between shadow-sm">
          <div className="w-full">
            <div className="flex items-center gap-2 text-13 font-[600] text-secondary mb-3">
              <Users className="w-[16px] h-[16px] text-tertiary" strokeWidth={2} /> Qarzdor mijozlar
            </div>
            <div className="text-[32px] font-[700] text-primary tracking-tight mb-2">
              {debtors.length}
            </div>
            <div className="text-13 font-[500] text-secondary mt-3">
              Dastlabki nasiya: <span className="font-[600]">{formatMoney(totalInitialAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-app/40">
          <div className="relative w-full sm:w-[320px]">
            <Search className="w-[16px] h-[16px] text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Mijoz ismi yoki telefon..."
              className="w-full h-11 bg-surface border border-default rounded-xl pl-10 pr-4 text-14 font-[500] text-primary focus:border-focus focus:ring-4 focus:ring-focus/10 placeholder:text-tertiary transition-all shadow-sm outline-none"
            />
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-11 px-5 bg-surface border border-subtle rounded-xl text-14 font-[600] text-secondary flex items-center gap-2 hover:bg-raised transition-all active:scale-95 disabled:opacity-50 shadow-sm whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <RefreshCw className={`w-[16px] h-[16px] ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2} />
            Sinxronlash
          </button>
        </div>

        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-[72px] w-full animate-pulse bg-subtle rounded-xl"></div>
              ))}
            </div>
          ) : filteredDebtors.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24 px-4">
              <div className="w-20 h-20 bg-raised rounded-full flex items-center justify-center mb-5 border border-subtle shadow-inner">
                <Scale className="w-[32px] h-[32px] text-tertiary" strokeWidth={1.5} />
              </div>
              <h3 className="text-18 font-[700] text-primary">Mijozlarda qarz yo'q</h3>
              <p className="text-14 font-[500] text-secondary mt-2 max-w-sm">Siz izlagan mezon bo'yicha hech qanday qarzdor mijoz topilmadi.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block w-full overflow-x-auto">
                <table className="w-full text-left min-w-[1100px]">
                  <thead className="bg-app/40 sticky top-0 z-10 backdrop-blur-md">
                    <tr className="border-b border-subtle text-11 font-[700] text-tertiary uppercase tracking-widest">
                      <th className="pl-6 pr-4 py-4 font-normal">Mijoz</th>
                      <th className="px-4 py-4 font-normal">Telefon</th>
                      <th className="px-4 py-4 font-normal text-right">Dastlabki nasiya</th>
                      <th className="px-4 py-4 font-normal text-right">To'langan</th>
                      <th className="px-4 py-4 font-normal text-right">Qolgan qarz</th>
                      <th className="px-4 py-4 font-normal w-48">Holat</th>
                      <th className="pl-4 pr-6 py-4 font-normal text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {filteredDebtors.map(debtor => {
                      const totalPaid = debtor.totalPaid || 0;
                      const currentDebt = Math.max(0, debtor.totalDebt || 0);
                      const initialDebt = debtor.initialDebt || (currentDebt + totalPaid);
                      const progress = initialDebt > 0 ? Math.round((totalPaid / initialDebt) * 100) : 0;
                      const isFullyPaid = currentDebt === 0;

                      return (
                        <tr key={debtor._id} className="hover:bg-raised transition-colors group h-[80px]">
                          <td className="pl-6 pr-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-subtle text-primary flex items-center justify-center text-15 font-[700] shrink-0 border border-default shadow-sm">
                                {debtor.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-[700] text-primary text-15 mb-0.5">{debtor.name}</div>
                                <div className="text-12 font-[500] text-tertiary flex flex-wrap items-center gap-x-1.5 gap-y-0.5 max-w-[250px]">
                                  <span className="whitespace-nowrap">{debtor.type === 'wholesale' ? 'Sotuv' : 'Chakana'}</span>
                                  {debtor.lastOrderDate && (
                                    <>
                                      <span className="opacity-50">•</span>
                                      <span className="whitespace-nowrap">So'nggi: {new Date(debtor.lastOrderDate).toLocaleDateString('ru-RU')}</span>
                                    </>
                                  )}
                                  {debtor.unpaidOrdersCount > 0 && (
                                    <>
                                      <span className="opacity-50">•</span>
                                      <span className="text-secondary whitespace-nowrap">{debtor.unpaidOrdersCount}x order</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4">
                            <div className="flex items-center gap-2 text-13 font-[600] text-secondary font-mono whitespace-nowrap">
                              <Phone className="w-[14px] h-[14px] text-tertiary" strokeWidth={2}/> {debtor.phone}
                            </div>
                          </td>
                          <td className="px-4 text-right">
                            <span className="text-14 font-[600] text-secondary tabular-nums whitespace-nowrap">{formatMoney(initialDebt)}</span>
                          </td>
                          <td className="px-4 text-right">
                            <span className="text-14 font-[700] text-emerald-600 tabular-nums whitespace-nowrap">{totalPaid > 0 ? formatMoney(totalPaid) : '—'}</span>
                          </td>
                          <td className="px-4 text-right">
                            <span className="text-15 font-[700] text-rose-600 tabular-nums whitespace-nowrap">{formatMoney(currentDebt)}</span>
                          </td>
                          <td className="px-4 align-middle">
                            <div className="flex flex-col gap-1.5 max-w-[160px]">
                              <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex">
                                <div className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : progress > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className={`text-[11px] font-[700] uppercase tracking-wider ${isFullyPaid ? 'text-emerald-600' : progress > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {progress}% to'langan
                              </span>
                            </div>
                          </td>
                          <td className="pl-4 pr-6 text-right align-middle">
                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setHistoryDrawerData(debtor)}
                                className="w-9 h-9 rounded-full bg-surface border border-default text-secondary hover:text-primary hover:border-subtle hover:bg-raised flex items-center justify-center transition-all shadow-sm"
                                title="To'lovlar tarixi"
                              >
                                <Clock className="w-[16px] h-[16px]" strokeWidth={2} />
                              </button>
                              <button 
                                onClick={() => setPaymentModalData({ customerId: debtor._id, customerName: debtor.name, totalDebt: currentDebt })}
                                className="h-9 px-4 rounded-full text-13 font-[600] bg-surface text-primary border border-default hover:border-primary transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                To'lov <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden flex flex-col divide-y divide-subtle">
                {filteredDebtors.map((debtor) => {
                  const totalPaid = debtor.totalPaid || 0;
                  const currentDebt = Math.max(0, debtor.totalDebt || 0);
                  const initialDebt = debtor.initialDebt || (currentDebt + totalPaid);
                  const progress = initialDebt > 0 ? Math.round((totalPaid / initialDebt) * 100) : 0;

                  return (
                    <div key={debtor._id} className="p-5 flex flex-col gap-4 bg-surface hover:bg-raised active:bg-raised transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-subtle text-primary flex items-center justify-center text-14 font-[700] shrink-0 border border-default shadow-sm">
                            {debtor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-15 font-[700] text-primary">{debtor.name}</div>
                            <div className="text-12 font-[500] text-tertiary mt-0.5">{debtor.type === 'wholesale' ? 'Sotuv' : 'Chakana'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-16 font-[700] text-rose-600 font-mono tracking-tight">{formatMoney(currentDebt)}</div>
                          <div className="text-[10px] text-tertiary uppercase font-[700] tracking-widest mt-1">Qolgan qarz</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed border-subtle">
                        <div>
                          <div className="text-[10px] text-tertiary uppercase font-[700] tracking-widest mb-1">Dastlabki</div>
                          <div className="text-13 font-[600] text-secondary">{formatMoney(initialDebt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-tertiary uppercase font-[700] tracking-widest mb-1">To'langan ({progress}%)</div>
                          <div className="text-13 font-[700] text-emerald-600">{formatMoney(totalPaid)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-secondary font-mono text-13 font-[600]">
                          <div className="w-7 h-7 rounded-full bg-raised flex items-center justify-center border border-subtle">
                            <Phone className="w-[12px] h-[12px] text-tertiary" strokeWidth={2}/>
                          </div>
                          {debtor.phone}
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setHistoryDrawerData(debtor)}
                             className="w-9 h-9 rounded-full bg-surface border border-default text-secondary hover:text-primary hover:border-subtle hover:bg-raised flex items-center justify-center transition-all shadow-sm"
                           >
                             <Clock className="w-[16px] h-[16px]" strokeWidth={2} />
                           </button>
                           <button 
                             onClick={() => setPaymentModalData({ customerId: debtor._id, customerName: debtor.name, totalDebt: currentDebt })}
                             className="h-9 px-4 rounded-full text-13 font-[600] bg-primary text-inverse hover:opacity-90 transition-colors flex items-center gap-1.5 active:scale-95 shadow-md shadow-primary/20"
                           >
                             To'lov <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
                           </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {paymentModalData && (
        <PaymentModal 
          isOpen={true} 
          onClose={() => setPaymentModalData(null)} 
          customerId={paymentModalData.customerId}
          customerName={paymentModalData.customerName}
          totalDebt={paymentModalData.totalDebt}
        />
      )}

      <DebtHistoryDrawer
        isOpen={!!historyDrawerData}
        onClose={() => setHistoryDrawerData(null)}
        customer={historyDrawerData}
        onMakePayment={() => {
          setPaymentModalData({ customerId: historyDrawerData._id, customerName: historyDrawerData.name, totalDebt: historyDrawerData.totalDebt });
          setHistoryDrawerData(null);
        }}
      />
    </div>
  );
};

export default DebtPage;
