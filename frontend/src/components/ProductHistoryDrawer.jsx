import React, { useState } from 'react';
import { X, Clock, ShoppingBag, ArrowLeftRight, RotateCcw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { useProductHistory } from '../hooks/useProducts';
import { formatUZS } from '../utils/format';

const formatMoney = (val) => {
  return formatUZS(val || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const ProductHistoryDrawer = ({ isOpen, onClose, product }) => {
  const { data: historyRes, isLoading } = useProductHistory(product?._id);
  const data = historyRes?.data || { totalSoldQty: 0, totalReturnedQty: 0, netSoldQty: 0, totalRevenue: 0, history: [] };
  const history = data.history || [];

  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen || !product) return null;

  const salesCount = history.filter(h => h.type === 'SALE' || h.type === 'SOTUV').length;
  const returnsCount = history.filter(h => h.type === 'RETURN' || h.type === 'VOZVRAT').length;
  const transfersCount = history.filter(h => h.type === 'TRANSFER').length;

  const filteredHistory = history.filter(h => {
    if (activeTab === 'sale') return h.type === 'SALE' || h.type === 'SOTUV';
    if (activeTab === 'return') return h.type === 'RETURN' || h.type === 'VOZVRAT';
    if (activeTab === 'transfer') return h.type === 'TRANSFER';
    return true;
  });

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity" 
        onClick={onClose} 
      />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[520px] bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-left">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 dark:border-neutral-800 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase truncate">
              {product.artikul || product.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400">
                {product.category || product.brand || 'MAHSULOT'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-gray-50/50 dark:bg-neutral-950">
          
          {/* Stats Boxes */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 sm:p-3.5 rounded-2xl border border-emerald-500/20 bg-white dark:bg-neutral-900 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                {data.totalSoldQty} {product.unit || 'dona'}
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                Jami sotilgan
              </span>
            </div>
            
            <div className="p-3 sm:p-3.5 rounded-2xl border border-rose-500/20 bg-white dark:bg-neutral-900 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500/10 flex items-center justify-center mb-1.5">
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                {data.totalReturnedQty} {product.unit || 'dona'}
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                Qaytarilgan
              </span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl border border-blue-500/20 bg-white dark:bg-neutral-900 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-500/10 flex items-center justify-center mb-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                {data.netSoldQty} {product.unit || 'dona'}
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                Net sotilgan
              </span>
            </div>
          </div>
          
          {/* Revenue Box */}
          <div className="w-full rounded-2xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
            <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-400">
              Jami tushum (ushbu mahsulotdan)
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatMoney(data.totalRevenue)}
            </span>
          </div>

          {/* Tabs */}
          <div className="p-1 bg-subtle/80 border border-subtle rounded-xl flex items-center gap-1 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`whitespace-nowrap shrink-0 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-13 font-bold transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-surface border border-subtle text-primary shadow-xs' 
                  : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'
              }`}
            >
              Barchasi
            </button>
            <button 
              onClick={() => setActiveTab('sale')} 
              className={`whitespace-nowrap shrink-0 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-13 font-bold transition-all cursor-pointer ${
                activeTab === 'sale' 
                  ? 'bg-surface border border-subtle text-primary shadow-xs' 
                  : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'
              }`}
            >
              Sotuvlar ({salesCount})
            </button>
            <button 
              onClick={() => setActiveTab('return')} 
              className={`whitespace-nowrap shrink-0 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-13 font-bold transition-all cursor-pointer ${
                activeTab === 'return' 
                  ? 'bg-surface border border-subtle text-primary shadow-xs' 
                  : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'
              }`}
            >
              Vozvratlar ({returnsCount})
            </button>
            <button 
              onClick={() => setActiveTab('transfer')} 
              className={`whitespace-nowrap shrink-0 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-13 font-bold transition-all cursor-pointer ${
                activeTab === 'transfer' 
                  ? 'bg-surface border border-subtle text-primary shadow-xs' 
                  : 'text-secondary hover:text-primary hover:bg-surface/50 border border-transparent'
              }`}
            >
              Transferlar ({transfersCount})
            </button>
          </div>

          {/* History List */}
          <div className="space-y-2.5">
            {isLoading ? (
              <div className="text-center py-10 text-gray-400 text-13">Yuklanmoqda...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
                <Clock className="w-8 h-8 text-gray-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-13 text-gray-500 dark:text-gray-400 font-medium">Tarix topilmadi</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isExpanded = expandedId === item.id;
                const isSale = item.type === 'SALE' || item.type === 'SOTUV';
                const isReturn = item.type === 'RETURN' || item.type === 'VOZVRAT';
                
                let icon, titleText, titleColor, statusStyle, badgeText, badgeStyle, sign;
                if (isSale) {
                  icon = <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />;
                  titleText = 'SOTUV';
                  titleColor = 'text-emerald-600';
                  statusStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
                  badgeText = item.status === 'confirmed' ? 'Tasdiqlangan' : (item.status || 'Tasdiqlangan');
                  badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
                  sign = '';
                } else if (isReturn) {
                  icon = <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />;
                  titleText = 'VOZVRAT';
                  titleColor = 'text-rose-600';
                  statusStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
                  badgeText = 'Qaytarildi';
                  badgeStyle = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';
                  sign = '- ';
                } else {
                  icon = <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
                  titleText = 'TRANSFER';
                  titleColor = 'text-blue-600';
                  statusStyle = 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
                  badgeText = 'Transfer';
                  badgeStyle = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
                  sign = '';
                }

                const entityName = isSale || isReturn ? (item.customer?.name || 'Bir martalik mijoz') : (item.to?.name || 'Ombor');

                return (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-xs hover:border-gray-200 dark:hover:border-neutral-700 transition-all cursor-pointer overflow-hidden" 
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                      {/* Left: Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border ${statusStyle}`}>
                          {icon}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          {/* Top Row: Type, Number, Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className={`text-xs font-black uppercase tracking-wider ${titleColor}`}>
                              {titleText}
                            </span>
                            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              #{item.number}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide border whitespace-nowrap ${badgeStyle}`}>
                              {badgeText}
                            </span>
                          </div>
                          
                          {/* Bottom Row: Date & Customer */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 min-w-0">
                            <span className="whitespace-nowrap text-[11px] sm:text-xs">
                              {formatDate(item.date)}
                            </span>
                            <span className="text-gray-300 dark:text-neutral-700">•</span>
                            <span className="truncate font-medium text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs">
                              {entityName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity, Price, Chevron */}
                      <div className="shrink-0 flex items-center gap-2 pl-1">
                        <div className="flex flex-col items-end">
                          <span className="text-13 sm:text-14 font-black text-gray-900 dark:text-white tabular-nums leading-tight">
                            {sign}{item.quantity} {item.unit || product.unit || 'dona'}
                          </span>
                          {isSale && (
                            <span className="text-12 sm:text-13 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                              {formatMoney(item.revenue)}
                            </span>
                          )}
                          {isReturn && item.refundAmount > 0 && (
                            <span className="text-12 sm:text-13 font-bold text-rose-500 dark:text-rose-400 tabular-nums mt-0.5">
                              -{formatMoney(item.refundAmount)}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 hover:text-gray-600 dark:text-gray-500 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/70 dark:bg-neutral-950 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                        {isSale && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Sotuvchi:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{item.seller?.name || 'Tizim'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dona narxi:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(item.unitPrice)}</span>
                            </div>
                            {item.returnedQuantity > 0 && (
                              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                                <span>Qaytarilgan:</span>
                                <span>{item.returnedQuantity} {item.unit || product.unit || 'dona'}</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {isReturn && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Qabul qildi:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{item.processor?.name || 'Tizim'}</span>
                            </div>
                          </>
                        )}

                        {!isSale && !isReturn && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Qayerdan:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{item.from?.name || 'Asosiy ombor'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Qayerga:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{item.to?.name || 'Ombor'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductHistoryDrawer;
