import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CornerDownLeft, AlertTriangle, Minus, Plus } from 'lucide-react';
import { useCreateReturn } from '../hooks/useReturns';
import toast from 'react-hot-toast';

const ReturnModal = ({ isOpen, onClose, order, initialType = 'standard' }) => {
  const [returnType, setReturnType] = useState(initialType);
  const [returnItems, setReturnItems] = useState({});
  const [reason, setReason] = useState('');
  const createReturnMutation = useCreateReturn();

  useEffect(() => {
    if (isOpen && order) {
      setReturnType(initialType || 'standard');
      const initialItems = {};
      order.items?.forEach(item => {
        const max = Math.max(0, item.quantity - (item.returnedQuantity || 0) - (item.defectQuantity || 0));
        if (max > 0) {
          const prodId = item.product?._id || item.product;
          initialItems[prodId] = {
            product: prodId,
            productName: item.product?.brand || item.product?.artikul || 'Nomsiz',
            produktImage: item.product?.images?.[0]?.url || null,
            unit: item.unit,
            maxQuantity: max,
            returnQuantity: 0,
            unitPrice: item.unitPrice,
          };
        }
      });
      setReturnItems(initialItems);
      setReason('');
    }
  }, [isOpen, order, initialType]);

  if (!isOpen || !order) return null;

  const isDefective = returnType === 'defective';

  const handleQuantityChange = (productId, val) => {
    const max = returnItems[productId].maxQuantity;
    let newQty = parseInt(val, 10) || 0;
    if (newQty > max) newQty = max;
    if (newQty < 0) newQty = 0;
    setReturnItems(prev => ({ ...prev, [productId]: { ...prev[productId], returnQuantity: newQty } }));
  };

  const increment = (productId) => {
    const item = returnItems[productId];
    if (item.returnQuantity < item.maxQuantity) {
      handleQuantityChange(productId, item.returnQuantity + 1);
    }
  };

  const decrement = (productId) => {
    const item = returnItems[productId];
    if (item.returnQuantity > 0) {
      handleQuantityChange(productId, item.returnQuantity - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemsToReturn = Object.values(returnItems)
      .filter(item => item.returnQuantity > 0)
      .map(item => ({ product: item.product, unit: item.unit, quantity: item.returnQuantity }));

    if (itemsToReturn.length === 0) {
      return toast.error("Qaytarish uchun kamida bitta mahsulot miqdorini kiriting!");
    }

    if (isDefective && (!reason || !reason.trim())) {
      return toast.error("Brak mahsulot uchun sabab (reason) kiritilishi shart!");
    }

    createReturnMutation.mutate({
      orderId: order._id,
      items: itemsToReturn,
      reason: reason.trim(),
      returnType: isDefective ? 'defective' : 'standard'
    }, {
      onSuccess: () => {
        toast.success(isDefective ? "Brak muvaffaqiyatli qayd etildi!" : "Vozvrat muvaffaqiyatli amalga oshirildi!");
        onClose();
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Xatolik yuz berdi");
      }
    });
  };

  const hasItemsToReturn = Object.values(returnItems).some(i => i.returnQuantity > 0);
  const totalReturnCount = Object.values(returnItems).reduce((acc, i) => acc + i.returnQuantity, 0);
  const items = Object.values(returnItems);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full sm:max-w-[560px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
              isDefective 
                ? 'bg-state-danger-bg border-state-danger-border text-state-danger-text' 
                : 'bg-state-warning-bg border-state-warning-border text-state-warning-text'
            }`}>
              {isDefective ? (
                <AlertTriangle className="w-4 h-4" strokeWidth={2} />
              ) : (
                <CornerDownLeft className="w-4 h-4" strokeWidth={2} />
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-[700] text-primary leading-tight">
                {isDefective ? 'Brak Vozvrat (Nuqsonli tovar)' : 'Tezkor Vozvrat (Oddiy qaytarish)'}
              </h2>
              <p className="text-11 text-tertiary mt-0.5">
                Buyurtma: <span className="font-mono text-secondary font-[500]">{order.orderNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-subtle text-secondary hover:bg-raised hover:text-primary transition-all shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="px-5 pt-3 pb-2 bg-surface border-b border-subtle shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-subtle p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setReturnType('standard')}
              className={`py-2 text-12 font-[600] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isDefective 
                  ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <CornerDownLeft className="w-3.5 h-3.5 text-state-warning-text" />
              Oddiy Vozvrat
            </button>
            <button
              type="button"
              onClick={() => setReturnType('defective')}
              className={`py-2 text-12 font-[600] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isDefective 
                  ? 'bg-state-danger-bg text-state-danger-text font-[700] shadow-sm ring-1 ring-state-danger-border' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-state-danger-text" />
              Brak Vozvrat
            </button>
          </div>

          {/* Defective Warning Banner */}
          {isDefective && (
            <div className="mt-2.5 p-2.5 bg-state-danger-bg/60 border border-state-danger-border rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-state-danger-text shrink-0 mt-0.5" />
              <p className="text-[11px] font-[500] text-state-danger-text leading-tight">
                <strong>Diqqat:</strong> Brak mahsulotlar omborga qaytmaydi — faqat hisobdan chiqariladi va buyurtmada brak deb qayd etiladi.
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-app space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-secondary text-14">
              Ushbu buyurtmada qaytarish uchun mavjud mahsulot yo'q
            </div>
          ) : (
            items.map(item => (
              <div key={item.product} className="bg-surface rounded-2xl border border-subtle p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {item.produktImage ? (
                    <img src={item.produktImage} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-subtle" alt={item.productName} />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-raised shrink-0 flex items-center justify-center text-tertiary text-[10px] font-[600] border border-subtle">IMG</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-[600] text-14 text-primary truncate">{item.productName}</div>
                    <div className="text-12 text-secondary mt-0.5">Mavjud limit: <span className="font-mono font-[600] text-primary">{item.maxQuantity} {item.unit}</span></div>
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-3">
                  <span className="text-12 text-secondary shrink-0">
                    {isDefective ? 'Brak miqdori:' : 'Qaytarish miqdori:'}
                  </span>
                  <div className="flex items-center gap-0 ml-auto border border-default rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => decrement(item.product)}
                      disabled={item.returnQuantity <= 0}
                      className="w-10 h-10 flex items-center justify-center bg-subtle text-primary hover:bg-raised active:scale-90 transition-all disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={item.maxQuantity}
                      value={item.returnQuantity === 0 ? '' : item.returnQuantity}
                      onChange={(e) => handleQuantityChange(item.product, e.target.value)}
                      className="w-14 h-10 text-center text-14 font-[700] font-mono bg-surface text-primary outline-none border-x border-default"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => increment(item.product)}
                      disabled={item.returnQuantity >= item.maxQuantity}
                      className="w-10 h-10 flex items-center justify-center bg-subtle text-primary hover:bg-raised active:scale-90 transition-all disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <span className="text-12 text-secondary shrink-0 font-medium">{item.unit}</span>
                </div>

                {/* Progress bar */}
                {item.returnQuantity > 0 && (
                  <div className="h-1.5 w-full bg-subtle rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDefective ? 'bg-state-danger-text' : 'bg-state-warning-text'
                      }`}
                      style={{ width: `${(item.returnQuantity / item.maxQuantity) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Reason input */}
          <div className="bg-surface rounded-2xl border border-subtle p-4 shadow-sm">
            <label className="block text-12 font-[600] text-secondary mb-2">
              {isDefective ? (
                <span>Brak sababi <span className="text-red-500 font-bold">* (Majburiy)</span></span>
              ) : (
                <span>Vozvrat sababi <span className="text-tertiary font-normal">(ixtiyoriy)</span></span>
              )}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isDefective ? "Brak sababini yozing (masalan: yirtilgan, rang xatoligi, nuqsonli bo'yoq)..." : "Masalan: Ortiqcha olingan, rangi mos kelmadi..."}
              rows={2}
              className={`w-full bg-app hover:bg-raised border rounded-xl px-4 py-3 text-14 text-primary outline-none transition-all resize-none leading-relaxed ${
                isDefective && !reason.trim() ? 'border-red-300 focus:border-red-500' : 'border-subtle focus:border-focus'
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-6 bg-surface border-t border-subtle shrink-0 rounded-b-3xl sm:rounded-b-2xl">
          {hasItemsToReturn && (
            <div className={`flex items-center justify-center mb-3 py-2 rounded-xl border ${
              isDefective 
                ? 'bg-state-danger-bg border-state-danger-border text-state-danger-text' 
                : 'bg-state-warning-bg border-state-warning-border text-state-warning-text'
            }`}>
              <span className="text-13 font-[600]">
                Jami {totalReturnCount} ta mahsulot {isDefective ? 'brak sifatida qayd etiladi' : 'qaytariladi'}
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={createReturnMutation.isPending}
              className="flex-1 h-12 border border-default rounded-xl text-14 font-[500] text-secondary hover:bg-subtle active:scale-95 transition-all disabled:opacity-40"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasItemsToReturn || createReturnMutation.isPending || (isDefective && !reason.trim())}
              className={`flex-1 h-12 rounded-xl text-14 font-[700] disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2 border ${
                isDefective 
                  ? 'bg-state-danger-bg border-state-danger-border text-state-danger-text hover:bg-red-100' 
                  : 'bg-state-warning-bg border-state-warning-border text-state-warning-text hover:bg-amber-100'
              }`}
            >
              {isDefective ? (
                <AlertTriangle className="w-4 h-4" strokeWidth={2} />
              ) : (
                <CornerDownLeft className="w-4 h-4" strokeWidth={2} />
              )}
              {createReturnMutation.isPending ? 'Saqlanmoqda...' : (isDefective ? 'Brakni tasdiqlash' : 'Vozvratni tasdiqlash')}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ReturnModal;
