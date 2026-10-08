import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, RefreshCcw, Package, AlertTriangle, 
  CornerDownLeft, User, FileText, ChevronDown, Check, ArrowRight
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { useCreateQuickReturn, useCreateReturn } from '../hooks/useReturns';
import { formatUZS } from '../utils/format';
import toast from 'react-hot-toast';
import { haptics } from '../utils/haptics';
import ConfirmModal from '../components/ConfirmModal';

const QuickReturnPage = () => {
  // Mode: 'standard' (Oddiy vozvrat) | 'defective' (Brak vozvrat)
  const [returnType, setReturnType] = useState('standard');
  const isDefective = returnType === 'defective';

  // Customer selection state
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null means "Noma'lum / Naqd xaridor"

  // Order selection state
  const [selectedOrderId, setSelectedOrderId] = useState(''); // '' means "Buyurtmasiz (Erkin)"
  
  // General product search state (Fallback)
  const [productSearch, setProductSearch] = useState('');
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
  const productSearchRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Debounced searches
  const [debouncedProdSearch, setDebouncedProdSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedProdSearch(productSearch), 300);
    return () => clearTimeout(handler);
  }, [productSearch]);

  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Queries
  const { data: customersRes } = useCustomers({ search: debouncedCustomerSearch, limit: 10 });
  const customersList = customersRes?.data || [];

  const { data: customerOrdersRes, isLoading: isOrdersLoading } = useOrders(
    selectedCustomer?._id ? { customer: selectedCustomer._id, limit: 10 } : { limit: 0 }
  );
  const customerOrders = (selectedCustomer?._id && customerOrdersRes?.data) ? customerOrdersRes.data : [];

  const selectedOrder = customerOrders.find(o => o._id === selectedOrderId) || null;

  const { data: prodRes, isLoading: isProductsLoading } = useProducts({ search: debouncedProdSearch, limit: 10 });
  const searchResults = prodRes?.data || [];

  // Items in return cart
  const [returnItems, setReturnItems] = useState([]);
  const [refundAmountStr, setRefundAmountStr] = useState('');
  const [reason, setReason] = useState('');

  // Mutations
  const createQuickReturnMutation = useCreateQuickReturn();
  const createOrderReturnMutation = useCreateReturn();
  const isSubmitting = createQuickReturnMutation.isPending || createOrderReturnMutation.isPending;

  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setIsProductSearchFocused(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When order selection changes, if order selected, clear free items that don't belong or suggest
  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
  };

  // Add item from Order's smart block
  const addOrderItemToReturn = (orderItem) => {
    haptics.light();
    const prodId = orderItem.product?._id || orderItem.product;
    const maxAvailable = Math.max(0, orderItem.quantity - (orderItem.returnedQuantity || 0) - (orderItem.defectQuantity || 0));

    if (maxAvailable <= 0) {
      return toast.error("Ushbu mahsulot allaqachon to'liq qaytarilgan!");
    }

    setReturnItems(prev => {
      const existing = prev.find(i => i.product._id === prodId);
      if (existing) {
        if (existing.quantity >= maxAvailable) {
          toast.error(`Buyurtma bo'yicha maksimal limit: ${maxAvailable} ta`);
          return prev;
        }
        return prev.map(i => i.product._id === prodId ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, {
          product: orderItem.product,
          quantity: 1,
          unit: orderItem.unit || 'rulon',
          unitPrice: orderItem.unitPrice || 0,
          maxLimit: maxAvailable,
          fromOrder: true
        }];
      }
    });
  };

  // Add item from Fallback general search
  const addGeneralProductToReturn = (product) => {
    haptics.light();
    setReturnItems(prev => {
      const existing = prev.find(i => i.product._id === product._id);
      if (existing) {
        if (existing.maxLimit && existing.quantity >= existing.maxLimit) {
          toast.error(`Maksimal limit: ${existing.maxLimit} ta`);
          return prev;
        }
        return prev.map(i => i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, {
          product,
          quantity: 1,
          unit: product.unit || 'rulon',
          unitPrice: product.pricePerRoll || 0,
          maxLimit: null, // erkin
          fromOrder: false
        }];
      }
    });
    setProductSearch('');
    setIsProductSearchFocused(false);
  };

  const updateQuantity = (productId, newQty) => {
    haptics.light();
    if (newQty < 1) return;
    setReturnItems(prev => prev.map(i => {
      if (i.product._id === productId) {
        if (i.maxLimit && newQty > i.maxLimit) {
          toast.error(`Buyurtma bo'yicha limitdan oshirib bo'lmaydi (${i.maxLimit} ta)`);
          return { ...i, quantity: i.maxLimit };
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const removeProduct = (productId) => {
    haptics.light();
    setReturnItems(prev => prev.filter(i => i.product._id !== productId));
  };

  // Auto-calculated refund sum
  const totalCalculatedRefund = returnItems.reduce((acc, item) => {
    return acc + (item.quantity * item.unitPrice);
  }, 0);

  // Sync default refundAmountStr if empty
  useEffect(() => {
    if (returnItems.length > 0 && !refundAmountStr) {
      setRefundAmountStr(totalCalculatedRefund.toString());
    } else if (returnItems.length === 0) {
      setRefundAmountStr('');
    }
  }, [returnItems.length, totalCalculatedRefund]);

  const handleSubmit = () => {
    if (returnItems.length === 0) {
      return toast.error("Qaytarish uchun mahsulot tanlanmagan!");
    }
    if (isDefective && (!reason || !reason.trim())) {
      return toast.error("Brak mahsulot uchun sabab (reason) kiritilishi shart!");
    }
    setConfirmSubmit(true);
  };

  const confirmReturn = () => {
    haptics.success();

    // If linked to an order
    if (selectedOrderId && selectedOrder) {
      const itemsPayload = returnItems.map(i => ({
        product: i.product._id,
        unit: i.unit,
        quantity: i.quantity
      }));

      createOrderReturnMutation.mutate({
        orderId: selectedOrderId,
        items: itemsPayload,
        totalRefundAmount: refundAmountStr !== '' ? Number(refundAmountStr) : undefined,
        reason: reason.trim() || (isDefective ? 'Brak vozvrat' : 'Tezkor vozvrat'),
        returnType
      }, {
        onSuccess: () => {
          toast.success(isDefective ? "Brak muvaffaqiyatli saqlandi!" : "Vozvrat muvaffaqiyatli saqlandi!");
          setReturnItems([]);
          setRefundAmountStr('');
          setReason('');
          setSelectedOrderId('');
          setConfirmSubmit(false);
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || "Xatolik yuz berdi");
          setConfirmSubmit(false);
        }
      });
      return;
    }

    // Otherwise unlinked Quick Return
    const primaryWarehouse = returnItems[0]?.product?.warehouse?._id || 
                             returnItems[0]?.product?.warehouse || 
                             undefined;

    const payload = {
      warehouse: primaryWarehouse,
      customerId: selectedCustomer?._id || null,
      items: returnItems.map(i => ({
        product: i.product._id,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      totalRefundAmount: Number(refundAmountStr) || 0,
      reason: reason.trim() || (isDefective ? 'Brak vozvrat' : 'Tezkor vozvrat'),
      returnType
    };

    createQuickReturnMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isDefective ? "Brak muvaffaqiyatli saqlandi!" : "Vozvrat muvaffaqiyatli saqlandi!");
        setReturnItems([]);
        setRefundAmountStr('');
        setReason('');
        setConfirmSubmit(false);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Xatolik yuz berdi");
        setConfirmSubmit(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-app">
      {/* Top Header */}
      <div className="px-4 py-3.5 border-b border-subtle bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isDefective 
              ? 'bg-state-danger-bg border-state-danger-border text-state-danger-text' 
              : 'bg-state-warning-bg border-state-warning-border text-state-warning-text'
          }`}>
            {isDefective ? (
              <AlertTriangle className="w-5 h-5" strokeWidth={2} />
            ) : (
              <RefreshCcw className="w-5 h-5" strokeWidth={2} />
            )}
          </div>
          <div>
            <h1 className="text-[17px] font-[800] text-primary tracking-tight">
              {isDefective ? 'Brak Vozvrat' : 'Tezkor Vozvrat'}
            </h1>
            <p className="text-[12px] text-tertiary">
              {isDefective ? 'Nuqsonli tovarlarni hisobdan chiqarish tizimi' : 'Mijozdan tovar qaytarib olish va hisob-kitob'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-subtle p-1 rounded-xl self-start sm:self-auto border border-subtle/40">
          <button
            type="button"
            onClick={() => setReturnType('standard')}
            className={`px-3.5 py-1.5 text-[13px] font-[600] rounded-lg transition-all flex items-center gap-1.5 ${
              !isDefective 
                ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            <CornerDownLeft className="w-3.5 h-3.5 text-state-warning-text" />
            Standard Vozvrat
          </button>
          <button
            type="button"
            onClick={() => setReturnType('defective')}
            className={`px-3.5 py-1.5 text-[13px] font-[600] rounded-lg transition-all flex items-center gap-1.5 ${
              isDefective 
                ? 'bg-state-danger-bg text-state-danger-text font-[700] shadow-sm ring-1 ring-state-danger-border' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-state-danger-text" />
            Brak Vozvrat
          </button>
        </div>
      </div>

      {/* Defective Warning Banner */}
      {isDefective && (
        <div className="mx-4 mt-3 p-3 bg-state-danger-bg/70 border border-state-danger-border rounded-2xl flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-state-danger-text shrink-0 mt-0.5" />
          <div className="text-[12px] text-state-danger-text leading-snug">
            <span className="font-[700]">Brak tovarlar kafolati: </span>
            Brak mahsulotlar omborga qaytmaydi — faqat hisobdan chiqariladi va buyurtmada hamda hisobotlarda brak deb qayd etiladi.
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 no-scrollbar pb-[120px]">

        {/* ── 1. Yuqori blok: Gibrid boshqaruv (Mijoz va Buyurtma tanlash) ── */}
        <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] text-tertiary uppercase tracking-wider">
              1. Mijoz va Buyurtma (Gibrid rejim)
            </span>
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedOrderId('');
                }}
                className="text-[11px] font-[600] text-accent hover:underline"
              >
                Mijozni tozalash
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Customer Selector */}
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-[12px] font-[600] text-secondary mb-1">Mijoz tanlash:</label>
              <div 
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="h-11 px-3.5 bg-app hover:bg-raised border border-subtle focus-within:border-focus rounded-xl flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-tertiary shrink-0" />
                  <span className="text-[13px] font-[600] text-primary truncate">
                    {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || 'Tel yo\'q'})` : '— Noma\'lum / Naqd xaridor (Erkin) —'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-tertiary shrink-0" />
              </div>

              {/* Customer Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute top-[72px] left-0 right-0 bg-surface border border-subtle rounded-xl shadow-2xl z-40 max-h-[260px] overflow-y-auto animate-fade-in p-1">
                  <div className="p-2 border-b border-subtle">
                    <input
                      type="text"
                      placeholder="Mijoz ismi yoki telefoni..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-9 px-3 bg-app border border-subtle rounded-lg text-[13px] outline-none focus:border-focus"
                    />
                  </div>
                  <div
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedOrderId('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="px-3 py-2.5 rounded-lg hover:bg-subtle cursor-pointer text-[13px] font-[600] text-secondary flex items-center justify-between"
                  >
                    <span>— Noma'lum / Naqd xaridor —</span>
                    {!selectedCustomer && <Check className="w-4 h-4 text-accent" />}
                  </div>
                  {customersList.map(c => (
                    <div
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSelectedOrderId('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="px-3 py-2.5 rounded-lg hover:bg-subtle cursor-pointer text-[13px] flex items-center justify-between border-t border-subtle/30"
                    >
                      <div>
                        <div className="font-[600] text-primary">{c.name}</div>
                        <div className="text-[11px] text-tertiary">{c.phone || '-'} • Qarz: {formatUZS(c.totalDebt || 0)}</div>
                      </div>
                      {selectedCustomer?._id === c._id && <Check className="w-4 h-4 text-accent" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Selector */}
            <div>
              <label className="block text-[12px] font-[600] text-secondary mb-1">Buyurtmaga bog'lash:</label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
                disabled={!selectedCustomer}
                className="w-full h-11 px-3.5 bg-app border border-subtle focus:border-focus rounded-xl text-[13px] font-[600] text-primary outline-none transition-all disabled:opacity-40 cursor-pointer"
              >
                <option value="">— Buyurtmasiz (Erkin vozvrat) —</option>
                {customerOrders.map(o => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} • {new Date(o.createdAt).toLocaleDateString()} • {formatUZS(o.totalAmount)}
                  </option>
                ))}
              </select>
              {!selectedCustomer && (
                <p className="text-[11px] text-tertiary mt-1">
                  Mijoz tanlanganda uning oxirgi buyurtmalari avtomatik chiqadi.
                </p>
              )}
            </div>
          </div>

          {/* Smart Order Items Block (agar buyurtma tanlangan bo'lsa) */}
          {selectedOrder && (
            <div className="mt-4 pt-3.5 border-t border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-[700] text-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-accent" />
                  Chekdagi mahsulotlar ({selectedOrder.orderNumber}):
                </span>
                <span className="text-[11px] font-[500] text-tertiary">
                  Chek bo'yicha limit asosida
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {selectedOrder.items?.map((item, idx) => {
                  const maxAvail = Math.max(0, item.quantity - (item.returnedQuantity || 0) - (item.defectQuantity || 0));
                  const isAlreadyInCart = returnItems.some(ri => ri.product._id === (item.product?._id || item.product));
                  const prodName = item.product?.brand || item.product?.artikul || 'Nomsiz';

                  return (
                    <div 
                      key={idx}
                      className="bg-app border border-subtle rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-[700] text-primary truncate">{prodName}</div>
                        <div className="text-[11px] text-tertiary mt-0.5">
                          Olingan: <span className="font-semibold text-secondary">{item.quantity} {item.unit}</span> • 
                          Qolgan: <span className={`font-bold ${maxAvail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{maxAvail} {item.unit}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addOrderItemToReturn(item)}
                        disabled={maxAvail <= 0}
                        className={`h-8 px-3 rounded-lg text-[12px] font-[700] flex items-center gap-1 shrink-0 transition-all active:scale-95 disabled:opacity-30 ${
                          isDefective
                            ? 'bg-state-danger-bg text-state-danger-text hover:bg-red-100'
                            : 'bg-accent text-inverse hover:bg-accent-hover'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isDefective ? 'Brakka olish' : 'Qo\'shish'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Umumiy tovar qidiruvi (Fallback) ── */}
        <div className="relative" ref={productSearchRef}>
          <div className="relative z-20">
            <Search className="w-5 h-5 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => setIsProductSearchFocused(true)}
              placeholder="Umumiy qidiruv: Artikul yoki nom yozing (Erkin qo'shish)..."
              className="w-full h-12 bg-surface hover:bg-raised border border-subtle focus:border-focus rounded-xl pl-10 pr-4 text-14 text-primary outline-none transition-all shadow-sm"
            />
          </div>

          {/* Fallback Search Dropdown */}
          {isProductSearchFocused && productSearch.length > 0 && (
            <div className="absolute top-[54px] left-0 right-0 bg-surface border border-subtle rounded-xl shadow-2xl z-30 max-h-[300px] overflow-y-auto animate-fade-in">
              {isProductsLoading ? (
                <div className="p-4 text-center text-13 text-tertiary">Qidirilmoqda...</div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map(p => (
                    <div 
                      key={p._id}
                      onClick={() => addGeneralProductToReturn(p)}
                      className="px-4 py-3 flex items-center justify-between border-b border-subtle/50 last:border-b-0 hover:bg-subtle active:bg-raised cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-14 font-[600] text-primary">{p.brand || p.artikul}</div>
                        <div className="text-12 text-tertiary font-mono">{p.artikul} • {formatUZS(p.pricePerRoll)}/{p.unit || 'rl'}</div>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center pointer-events-none">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-13 text-tertiary">Mahsulot topilmadi</div>
              )}
            </div>
          )}
        </div>

        {/* ── 3. Savatcha: Qaytarilayotgan mahsulotlar ro'yxati ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-12 font-[700] text-secondary uppercase tracking-wider">
              Qaytarilayotgan mahsulotlar ({returnItems.length})
            </h2>
            {returnItems.length > 0 && (
              <button
                type="button"
                onClick={() => setReturnItems([])}
                className="text-[11px] font-[600] text-red-500 hover:underline"
              >
                Barchasini tozalash
              </button>
            )}
          </div>
          
          {returnItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-subtle rounded-2xl bg-surface/50 text-tertiary">
              <Package className="w-12 h-12 mb-2 opacity-40" strokeWidth={1} />
              <p className="text-13 font-[500]">Hozircha mahsulot qo'shilmadi</p>
              <p className="text-11 text-tertiary mt-1">Buyurtmadan yoki yuqoridagi qidiruvdan tovar tanlang</p>
            </div>
          ) : (
            returnItems.map((item) => (
              <div 
                key={item.product._id} 
                className={`bg-surface border rounded-2xl p-3.5 flex justify-between items-center gap-3 shadow-sm ${
                  isDefective ? 'border-red-200/60' : 'border-subtle'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-[700] text-primary truncate text-14">{item.product.brand || item.product.artikul}</div>
                  <div className="text-12 text-tertiary font-mono mt-0.5">
                    {item.product.artikul} • {formatUZS(item.unitPrice)}/{item.unit}
                    {item.maxLimit && (
                      <span className="ml-2 text-amber-600 font-semibold">(Limit: {item.maxLimit})</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center bg-subtle/60 border border-subtle rounded-xl h-9 p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                      className="w-7 h-full rounded flex items-center justify-center text-secondary active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product._id, parseInt(e.target.value, 10) || 1)}
                      className="w-10 h-full text-center text-[13px] bg-transparent border-0 outline-none font-[700] font-mono text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                      className="w-7 h-full rounded flex items-center justify-center text-secondary active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(item.product._id)}
                    className="w-9 h-9 rounded-xl bg-state-danger-bg text-state-danger-text flex items-center justify-center active:scale-95 hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── 4. Sabab va Pul hisob-kitobi ── */}
        {returnItems.length > 0 && (
          <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-sm space-y-4">
            {/* Hisoblangan tavsiyaviy summa */}
            <div className="flex justify-between items-center text-13">
              <span className="text-secondary font-[500]">Tovarlarning umumiy qiymati:</span>
              <span className="font-mono font-[700] text-primary">{formatUZS(totalCalculatedRefund)}</span>
            </div>

            {/* Pul berish maydoni */}
            <div className="border-t border-subtle pt-3">
              <label className="block text-11 font-[700] text-secondary mb-1.5 uppercase">
                Mijozga qaytariladigan / Ayiriladigan summa (so'm)
              </label>
              <input 
                type="number"
                placeholder="0"
                value={refundAmountStr}
                onChange={(e) => setRefundAmountStr(e.target.value)}
                className="w-full h-11 bg-app border border-subtle rounded-xl px-4 font-mono text-14 text-primary focus:border-focus outline-none"
              />
              {selectedCustomer && (
                <p className="text-[11px] text-tertiary mt-1.5">
                  Mijozning qarzi bo'lsa ({formatUZS(selectedCustomer.totalDebt || 0)}), bu summa uning qarzidan avtomatik kamaytiriladi.
                </p>
              )}
            </div>

            {/* Sabab (Brakda majburiy) */}
            <div className="border-t border-subtle pt-3">
              <label className="block text-11 font-[700] text-secondary mb-1.5 uppercase">
                {isDefective ? (
                  <span>Brak sababi <span className="text-red-500 font-bold">* (Majburiy)</span></span>
                ) : (
                  <span>Qaytarish sababi <span className="text-tertiary font-normal">(ixtiyoriy)</span></span>
                )}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isDefective ? "Brak sababini aniq ko'rsating (yirtilgan, nuqsonli bo'yoq, teshik)..." : "Sababi (masalan: ortiqcha olingan)..."}
                rows={2}
                className={`w-full bg-app border rounded-xl px-4 py-2.5 text-13 text-primary outline-none transition-all resize-none ${
                  isDefective && !reason.trim() ? 'border-red-300 focus:border-red-500' : 'border-subtle focus:border-focus'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Sticky Action Button */}
      {returnItems.length > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-3 bg-surface border-t border-subtle z-30 pb-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:pb-3 md:bottom-0">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (isDefective && !reason.trim())}
              className={`w-full h-12 rounded-xl font-[700] text-15 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-40 ${
                isDefective
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-accent text-inverse hover:bg-accent-hover'
              }`}
            >
              {isSubmitting ? (
                'Saqlanmoqda...'
              ) : isDefective ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  Brakni tasdiqlash ({returnItems.length} ta mahsulot)
                </>
              ) : (
                <>
                  <CornerDownLeft className="w-5 h-5" />
                  Vozvratni tasdiqlash ({returnItems.length} ta mahsulot)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={confirmReturn}
        title={isDefective ? "Brak vozvratni tasdiqlash" : "Vozvratni tasdiqlash"}
        message={
          isDefective
            ? `DIQQAT: ${returnItems.length} xil nuqsonli tovar tizimdan brak sifatida hisobdan chiqariladi. Ular sotuv omboriga QAYTMAYDI. Tasdiqlaysizmi?`
            : `Rostdan ham ${returnItems.length} xil mahsulotni ${refundAmountStr ? formatUZS(Number(refundAmountStr)) : '0 so\'m'} evaziga qaytarib olmoqchimisiz? Tovarlar sotuv zaxirasiga qo'shiladi.`
        }
        confirmText={isDefective ? "Brak deb tasdiqlash" : "Vozvratni tasdiqlash"}
        isDanger={isDefective}
      />
    </div>
  );
};

export default QuickReturnPage;
