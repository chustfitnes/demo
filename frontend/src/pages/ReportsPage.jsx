import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Search, RefreshCw, ChevronLeft, ChevronRight, 
  TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import api from '../api';
import toast from 'react-hot-toast';
import { useBranding } from '../contexts/BrandingContext';

const PRESETS = [
  { label: 'Bugun', value: 'today' },
  { label: 'Kecha', value: 'yesterday' },
  { label: '7 kun', value: 'last7' },
  { label: '30 kun', value: 'last30' },
  { label: 'Shu oy', value: 'thisMonth' },
  { label: 'Barchasi', value: 'all' },
  { label: 'Maxsus', value: 'custom' }
];

const ReportsPage = () => {
  const { branding } = useBranding();
  const currencySymbol = branding?.currency || 'UZS';
  const accentColor = branding?.accentColor || '#2563eb';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [preset, setPreset] = useState('last30');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });

  useEffect(() => {
    if (preset === 'custom') return;
    if (preset === 'all') {
      setDateRange({ start: '', end: '' });
      return;
    }
    
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'last7') {
      start.setDate(today.getDate() - 6);
    } else if (preset === 'last30') {
      start.setDate(today.getDate() - 29);
    } else if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    const formatDate = (d) => {
       const tzOffset = d.getTimezoneOffset() * 60000;
       return new Date(d - tzOffset).toISOString().split('T')[0];
    };
    
    setDateRange({ start: formatDate(start), end: formatDate(end) });
  }, [preset]);

  useEffect(() => {
    if (preset === 'custom' && (!dateRange.start || !dateRange.end)) {
       return;
    }
    fetchReportData();
  }, [dateRange.start, dateRange.end, preset]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      const res = await api.get('/reports/sales', { params });
      if (res.data.success) {
        setData(res.data.data);
      } else {
        toast.error(res.data.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Reports error:', error);
      toast.error('Hisobotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      const res = await api.get('/reports/export-excel', { params, responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analitika_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Excel fayl muvaffaqiyatli yuklab olindi!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export qilishda xatolik');
    } finally {
      setExporting(false);
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val || 0).replace(/,/g, ' ') + ` ${currencySymbol}`;
  };
  
  const formatNumber = (val) => {
    return new Intl.NumberFormat('ru-RU').format(val || 0).replace(/,/g, ' ');
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1.5 text-primary" /> 
      : <ArrowDown className="w-3 h-3 ml-1.5 text-primary" />;
  };

  // Tooltip with isAnimationActive removed/set to false on Recharts elements to stop shaking
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-overlay border border-subtle p-3 rounded-lg shadow-xl z-50">
          <p className="text-[12px] font-[500] text-tertiary mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-[13px] font-[500] text-secondary">{entry.name}</span>
              </div>
              <p className="text-[14px] font-[700] text-primary">
                {formatMoney(entry.value)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const kpi = data?.kpi || { revenue: 0, profit: null, debt: null, orders: 0, quantity: 0 };
  const paymentStats = data?.paymentStats || null;
  const chartData = data?.chartData || [];
  const products = data?.products || [];

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const searchStr = (p.name + ' ' + p.artikul).toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
    
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [products, searchQuery, sortConfig]);

  const topProducts = useMemo(() => {
    return [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const totalFilteredQuantity = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalFilteredReturnedQuantity = filteredProducts.reduce((sum, p) => sum + (p.returnedQuantity || 0), 0);
  const totalFilteredNetQuantity = filteredProducts.reduce((sum, p) => sum + (p.netQuantity || 0), 0);
  const totalFilteredRevenue = filteredProducts.reduce((sum, p) => sum + p.revenue, 0);

  if (loading && !data) {
    return (
      <div className="flex flex-col h-full bg-app p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-subtle rounded animate-pulse"></div>
            <div className="h-3 w-40 bg-subtle rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-subtle rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-subtle rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="h-12 w-full md:w-[600px] bg-subtle rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-[120px] bg-subtle rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-[350px] bg-subtle rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-app overflow-auto">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 pb-24">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-[700] text-primary tracking-tight">Analitika va Hisobotlar</h1>
            <p className="text-[14px] text-tertiary mt-1">
              Moliyaviy ko'rsatkichlar va savdo tahlili
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReportData}
              className="px-4 h-[40px] rounded-lg bg-surface border border-subtle text-secondary text-[13px] font-[600] flex items-center gap-2 hover:bg-raised transition-colors active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || filteredProducts.length === 0}
              className="px-4 h-[40px] rounded-lg bg-primary text-inverse text-[13px] font-[600] flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel yuklab olish
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 p-1.5 bg-surface rounded-xl border border-subtle shadow-sm w-full md:w-max overflow-x-auto no-scrollbar">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-[13px] font-[600] transition-colors whitespace-nowrap ${
                preset === p.value 
                ? 'bg-app text-primary border border-default shadow-sm' 
                : 'text-secondary hover:text-primary hover:bg-raised border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 px-2 shrink-0 border-l border-subtle ml-1 pl-3">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                className="h-[32px] px-2 text-[13px] bg-app border border-default rounded-md outline-none text-primary focus:border-primary transition-colors font-mono"
              />
              <span className="text-tertiary">-</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                className="h-[32px] px-2 text-[13px] bg-app border border-default rounded-md outline-none text-primary focus:border-primary transition-colors font-mono"
              />
            </div>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 lg:gap-5">
          <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-2 lg:col-span-2">
            <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-tertiary" />
              Sof Tushum
            </h4>
            <div className="text-[24px] lg:text-[28px] font-[700] text-primary tracking-tight">
              {formatMoney(kpi.revenue)}
            </div>
          </div>

          {(kpi.returnsAmount > 0) && (
            <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-2 lg:col-span-2">
              <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Vozvrat Summasi
              </h4>
              <div className="text-[24px] lg:text-[28px] font-[700] text-rose-600 dark:text-rose-400 tracking-tight">
                {formatMoney(kpi.returnsAmount)}
              </div>
            </div>
          )}

          {kpi.profit !== null && (
            <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-2 lg:col-span-2">
              <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Sof Foyda
              </h4>
              <div className="text-[24px] lg:text-[28px] font-[700] text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatMoney(kpi.profit)}
              </div>
            </div>
          )}

          {kpi.debt !== null && (
            <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-2 lg:col-span-2">
              <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Jami Qarz / Nasiya
              </h4>
              <div className="text-[24px] lg:text-[28px] font-[700] text-rose-600 dark:text-rose-400 tracking-tight">
                {formatMoney(kpi.debt)}
              </div>
            </div>
          )}

          <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
            <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-tertiary" />
              Sof Sotilgan Miqdor
            </h4>
            <div className="text-[22px] lg:text-[24px] font-[700] text-primary tracking-tight">
              {formatNumber(kpi.netQuantity ?? kpi.quantity)}
            </div>
          </div>

          {(kpi.returnedQuantity > 0) && (
            <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
              <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-rose-500" />
                Qaytarilgan Miqdor
              </h4>
              <div className="text-[22px] lg:text-[24px] font-[700] text-rose-600 dark:text-rose-400 tracking-tight">
                {formatNumber(kpi.returnedQuantity)}
              </div>
            </div>
          )}

          <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
            <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-tertiary" />
              Buyurtmalar
            </h4>
            <div className="text-[22px] lg:text-[24px] font-[700] text-primary tracking-tight">
              {formatNumber(kpi.orders)}
            </div>
          </div>
          
          <div className="bg-surface rounded-xl p-4 border border-subtle shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
            <h4 className="text-[12px] font-[600] text-secondary tracking-wide flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-4 h-4 text-tertiary" />
              O'rtacha Chek
            </h4>
            <div className="text-[22px] lg:text-[24px] font-[700] text-primary tracking-tight">
              {kpi.orders > 0 ? formatMoney(kpi.revenue / kpi.orders) : formatMoney(0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Main Chart Section */}
          <div className="lg:col-span-2 xl:col-span-2 bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[16px] font-[700] text-primary">Tushum Dinamikasi</h2>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full mt-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTushum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFoyda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      dy={12}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickFormatter={(value) => value > 0 ? `${(value / 1000000).toFixed(1)}M` : '0'}
                      dx={-10}
                    />
                    {/* isAnimationActive={false} prevents trembling when moving mouse fast */}
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-default)', strokeWidth: 1, strokeDasharray: '4 4' }} isAnimationActive={false} />
                    
                    <Area 
                      type="monotone" 
                      dataKey="savdo" 
                      name="Tushum"
                      stroke={accentColor} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTushum)" 
                      activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--bg-surface)', fill: accentColor }}
                      isAnimationActive={false}
                    />
                    {kpi.profit !== null && (
                      <Area 
                        type="monotone" 
                        dataKey="foyda" 
                        name="Sof Foyda"
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorFoyda)" 
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--bg-surface)', fill: "#10b981" }}
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-70">
                   <TrendingDown className="w-8 h-8 text-tertiary mb-3" />
                   <p className="text-[14px] font-[600] text-secondary">Ma'lumot topilmadi</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products Bar Chart (Vertical) */}
          <div className="lg:col-span-1 xl:col-span-1 bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col">
            <div className="mb-6">
              <h2 className="text-[16px] font-[700] text-primary">Top 5 Mahsulot</h2>
            </div>
            
            <div className="flex-1 w-full min-h-[300px]">
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'var(--bg-subtle)' }}
                      isAnimationActive={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-overlay border border-subtle p-3 rounded-lg shadow-xl z-50">
                              <p className="text-[11px] font-[600] text-secondary mb-1">{payload[0].payload.name}</p>
                              <p className="text-[14px] font-[700] text-primary">
                                {formatNumber(payload[0].value)} <span className="text-[11px] text-tertiary font-[500]">{payload[0].payload.unit}</span>
                              </p>
                              <p className="text-[12px] font-[600] text-accent mt-0.5">
                                {formatMoney(payload[0].payload.revenue)}
                              </p>
                            </div>
                          )
                        }
                        return null;
                      }} 
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={false}>
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? accentColor : 'var(--border-default)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-70">
                   <Package className="w-8 h-8 text-tertiary mb-3" />
                   <p className="text-[14px] font-[600] text-secondary">Reyting bo'sh</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Payment Stats */}
          {paymentStats && (
            <div className="lg:col-span-1 xl:col-span-1 bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col">
              <div className="mb-6">
                <h2 className="text-[16px] font-[700] text-primary">To'lov Usullari</h2>
              </div>
              <div className="flex-1 w-full min-h-[300px] flex flex-col justify-center">
                {Object.entries(paymentStats).filter(([k, v]) => v > 0).length > 0 ? (
                  <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(paymentStats).filter(([k, v]) => v > 0).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                          stroke="none"
                        >
                          {Object.entries(paymentStats).filter(([k, v]) => v > 0).map((entry, index) => {
                             const colors = [accentColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                             return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          isAnimationActive={false}
                          formatter={(value) => formatMoney(value)}
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-[200px] flex flex-col items-center justify-center text-center opacity-70">
                     <p className="text-[14px] font-[600] text-secondary">Ma'lumot topilmadi</p>
                  </div>
                )}
                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {Object.entries(paymentStats).filter(([k, v]) => v > 0).map(([k, v], i) => {
                     const colors = [accentColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                     return (
                       <div key={k} className="flex flex-col gap-1">
                         <div className="flex items-center gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                           <span className="text-[12px] text-secondary font-[500] capitalize">{k}</span>
                         </div>
                         <span className="text-[13px] font-[700] text-primary">{formatMoney(v)}</span>
                       </div>
                     );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table Card */}
        <div className="bg-surface border border-subtle rounded-xl shadow-sm flex flex-col mt-6">
          <div className="p-5 border-b border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-[700] text-primary">Savdo Tahlili</h2>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Mahsulot yoki artikul izlash..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full h-[38px] pl-9 pr-4 rounded-lg bg-app border border-subtle text-[13px] text-primary outline-none focus:border-primary transition-colors placeholder:text-tertiary"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-app border-b border-subtle">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider w-12">#</th>
                  <th 
                    className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider cursor-pointer hover:bg-subtle/50 transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">Mahsulot nomi <SortIcon columnKey="name" /></div>
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider">
                    Artikul
                  </th>
                  <th 
                    className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-subtle/50 transition-colors group"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end">Sotildi <SortIcon columnKey="quantity" /></div>
                  </th>
                  <th 
                    className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-subtle/50 transition-colors group"
                    onClick={() => handleSort('returnedQuantity')}
                  >
                    <div className="flex items-center justify-end">Qaytdi <SortIcon columnKey="returnedQuantity" /></div>
                  </th>
                  <th 
                    className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-subtle/50 transition-colors group"
                    onClick={() => handleSort('netQuantity')}
                  >
                    <div className="flex items-center justify-end">Sof Sotuv <SortIcon columnKey="netQuantity" /></div>
                  </th>
                  <th 
                    className="px-5 py-3.5 text-[11px] font-[600] text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-subtle/50 transition-colors group"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center justify-end">Tushum <SortIcon columnKey="revenue" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle bg-surface">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <p className="text-[14px] font-[600] text-secondary">Ma'lumot topilmadi</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-raised transition-colors cursor-default">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-[13px] font-[500] text-tertiary">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <div className="w-8 h-8 rounded border border-subtle bg-app shrink-0 overflow-hidden">
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded border border-subtle bg-subtle flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-tertiary" />
                            </div>
                          )}
                          <span className="text-[13px] font-[600] text-primary">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-[12px] font-mono font-[500] text-secondary">
                          {p.artikul}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-end justify-end gap-1">
                          <span className="text-[14px] font-[600] text-primary">{formatNumber(p.quantity)}</span>
                          <span className="text-[11px] text-tertiary pb-0.5">{p.unit || 'dona'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-end justify-end gap-1">
                          <span className={`text-[14px] font-[600] ${p.returnedQuantity > 0 ? 'text-rose-500' : 'text-tertiary'}`}>
                            {formatNumber(p.returnedQuantity || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-end justify-end gap-1">
                          <span className="text-[14px] font-[600] text-primary">{formatNumber(p.netQuantity ?? p.quantity)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className={`text-[14px] font-[600] ${(p.revenue === 0 && p.returnedQuantity > 0) ? 'text-rose-500 line-through opacity-70' : 'text-primary'}`}>
                          {formatMoney(p.revenue)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredProducts.length > 0 && (
                <tfoot className="bg-app border-t border-subtle">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right text-[11px] font-[600] uppercase text-secondary">
                      Jami:
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[14px] font-[700] text-primary">{formatNumber(totalFilteredQuantity)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[14px] font-[700] text-rose-500">{formatNumber(totalFilteredReturnedQuantity)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[14px] font-[700] text-primary">{formatNumber(totalFilteredNetQuantity)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[14px] font-[700] text-primary">{formatMoney(totalFilteredRevenue)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-subtle bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[12px] text-tertiary font-[500]">
                Jami <strong className="text-primary">{filteredProducts.length}</strong> tadan <strong className="text-primary">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> ko'rsatilmoqda
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-subtle bg-surface text-secondary hover:bg-raised disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center px-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                       return (
                         <button
                           key={pageNum}
                           onClick={() => setCurrentPage(pageNum)}
                           className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-[600] transition-colors ${
                             currentPage === pageNum 
                               ? 'bg-primary text-inverse' 
                               : 'bg-transparent text-secondary hover:bg-raised'
                           }`}
                         >
                           {pageNum}
                         </button>
                       );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                       return <span key={`dots-${pageNum}`} className="text-tertiary px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-subtle bg-surface text-secondary hover:bg-raised disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportsPage;
