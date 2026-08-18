import React, { useState, useRef } from 'react';
import api from '../api';
import ReactMarkdown from 'react-markdown';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import { 
  Sparkles, 
  BrainCircuit, 
  AlertCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  TrendingUp, 
  PieChart as PieIcon, 
  Activity,
  Clock,
  Package
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import AiHistoryDrawer from '../components/AiHistoryDrawer';

const AIAnalyticsPage = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(null);
  const chartAreaRef = useRef(null);

  const parseReport = (reportText) => {
    if (!reportText) return { summary: '', inventory: '', sales: '', recommendations: '' };
    
    const summaryMatch = reportText.match(/\[SUMMARY\]([\s\S]*?)(?=\[(?:INVENTORY|SALES|RECOMMENDATIONS)\]|$)/i);
    const inventoryMatch = reportText.match(/\[INVENTORY\]([\s\S]*?)(?=\[(?:SUMMARY|SALES|RECOMMENDATIONS)\]|$)/i);
    const salesMatch = reportText.match(/\[SALES\]([\s\S]*?)(?=\[(?:SUMMARY|INVENTORY|RECOMMENDATIONS)\]|$)/i);
    const recommendationsMatch = reportText.match(/\[RECOMMENDATIONS\]([\s\S]*?)(?=\[(?:SUMMARY|INVENTORY|SALES)\]|$)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const inventory = inventoryMatch ? inventoryMatch[1].trim() : '';
    const sales = salesMatch ? salesMatch[1].trim() : '';
    const recommendations = recommendationsMatch ? recommendationsMatch[1].trim() : '';

    if (!summary && !inventory && !sales && !recommendations) {
      return {
        summary: reportText,
        inventory: 'Ma\'lumot topilmadi.',
        sales: 'Ma\'lumot topilmadi.',
        recommendations: 'Ma\'lumot topilmadi.'
      };
    }

    return { summary, inventory, sales, recommendations };
  };

  const reportSections = parseReport(data?.report);

  const fetchAIReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/ai/analytics');
      
      if (response.data.success) {
        setData(response.data.data);
        setHistoryDate(null);
      } else {
        setError('Tahlilni olishda xatolik yuz berdi');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Server xatosi yoki API kaliti noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setExporting(true);
    const toastId = toast.loading("Excel hisobot tayyorlanmoqda...");
    try {
      let imgData = null;
      if (chartAreaRef.current) {
        // Capture charts using html-to-image
        imgData = await toPng(chartAreaRef.current, {
          pixelRatio: 2 // Improve quality
        });
      }

      const response = await api.post('/export/excel', {
        chartImage: imgData
      }, {
        responseType: 'blob'
      });

      // Save file
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AI_Tahlil_Hisoboti_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Excel muvaffaqiyatli yuklab olindi!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Excel eksport qilishda xatolik yuz berdi", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 w-full min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-5 border-b border-subtle pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-[10px] bg-app border border-subtle flex items-center justify-center shadow-sm">
              <Sparkles className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl sm:text-[28px] font-[600] tracking-tight text-primary">
              AI Senior Analitik
            </h1>
          </div>
          <p className="text-secondary text-[14px] max-w-xl mt-2">
            Tizim Gemini modellari yordamida korxonangiz savdo va ombor ma'lumotlarini chuqur tahlil qiladi.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5 mt-4 lg:mt-0 w-full sm:w-auto">
          {data && (
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 h-[42px] bg-surface border border-subtle hover:bg-raised text-primary rounded-xl font-[500] text-[14px] transition-all disabled:opacity-50 shadow-sm active:scale-95"
            >
              {exporting ? (
                <RefreshCw className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
              ) : (
                <FileSpreadsheet className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
              Excel Eksport
            </button>
          )}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 h-[42px] bg-surface border border-subtle hover:bg-raised text-primary rounded-xl font-[500] text-[14px] transition-all shadow-sm active:scale-95"
          >
            <Clock className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Tarix
          </button>
          <button
            onClick={fetchAIReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-[42px] bg-accent text-inverse rounded-xl font-[500] text-[14px] hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
                <span>Tahlil qilinmoqda...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span>Tahlilni Boshlash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-state-danger-bg border border-state-danger-border text-state-danger-text p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-sm font-semibold">Tahlilda xatolik yuz berdi</h3>
            <p className="text-sm mt-1 opacity-90">{error}</p>
            <p className="text-[11px] mt-2 text-tertiary">
              Maslahat: Internet aloqasini va `.env` faylida `GROQ_API_KEY` to'g'ri sozlanganini tekshiring.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="bg-surface border border-subtle rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full"></div>
              <BrainCircuit className="w-16 h-16 text-accent animate-pulse relative z-10" />
            </div>
            <h3 className="text-lg font-medium text-primary mt-6 mb-2 animate-pulse">
              Ma'lumotlar tahlil qilinmoqda...
            </h3>
            <p className="text-secondary text-sm max-w-md mx-auto">
              Sun'iy intellekt (Llama 3) jami mahsulotlar qoldig'i, daromad, foyda va qarzlar tarixini o'rganib, professional hisobot tayyorlamoqda...
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-[100px] bg-subtle rounded-xl animate-pulse"></div>)}
          </div>
          <div className="h-[300px] w-full bg-subtle rounded-2xl animate-pulse"></div>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8">
          {/* Badges: Active Model & History Date */}
          <div className="flex flex-wrap gap-2">
            {data.modelUsed && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-semibold">
                <Activity className="w-3.5 h-3.5" />
                Muvaffaqiyatli model: {data.modelUsed}
              </div>
            )}
            {historyDate && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-full text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Tarixiy tahlil: {new Date(historyDate).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-secondary mb-1">Jami Mahsulotlar</p>
              <h4 className="text-2xl font-bold text-primary">{data.stats.totalProducts}</h4>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-green-600 mb-1">Sog'lom Qoldiq (&gt;20)</p>
              <h4 className="text-2xl font-bold text-green-600">{data.stats.inStock}</h4>
            </div>

            <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-yellow-600 mb-1">Kam Qolgan (&lt;=20)</p>
              <h4 className="text-2xl font-bold text-yellow-600">{data.stats.lowStock}</h4>
            </div>
            <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-red-600 mb-1">Tugagan Mahsulotlar</p>
              <h4 className="text-2xl font-bold text-red-600">{data.stats.outOfStock}</h4>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-surface border border-subtle rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-subtle/50 px-6 py-4 border-b border-subtle flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-[16px] font-[700] text-primary tracking-tight">Boshqaruv Xulosasi</h2>
            </div>
            <div className="p-6 sm:p-8 bg-app prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-primary prose-a:text-accent prose-strong:text-primary text-secondary leading-[1.8] tracking-[0.01em]">
              <ReactMarkdown>{reportSections.summary}</ReactMarkdown>
            </div>
          </div>

          {/* Graphical Diagrams Section for html2canvas capture */}
          <div 
            ref={chartAreaRef} 
            className="p-5 sm:p-6 bg-surface border border-subtle rounded-2xl shadow-sm space-y-6"
          >
            <h2 className="text-base font-[600] text-primary border-b border-subtle pb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Tahliliy Diagrammalar (Excelga Eksport)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sales Chart */}
              <div className="h-[250px] sm:h-[300px]">
                <h3 className="text-[13px] font-[500] text-secondary mb-3 text-center">Top 10 Ko'p Sotilgan Mahsulotlar</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={data.chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '...' : v} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip isAnimationActive={false} contentStyle={{ fontSize: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-raised)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                    <Bar dataKey="sotilgan_rulon" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Sotilgan (dona/rulon)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Inventory Pie Chart */}
              <div className="h-[250px] sm:h-[300px] flex flex-col items-center">
                <h3 className="text-[13px] font-[500] text-secondary mb-3 text-center">Mahsulot Qoldiqlari Nisbati</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={data.inventoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {data.inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip isAnimationActive={false} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Section */}
            <div className="bg-surface border border-subtle rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-subtle/50 px-6 py-4 border-b border-subtle flex items-center gap-3 shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="text-[16px] font-[700] text-primary tracking-tight">Sotuvlar va Talab</h2>
              </div>
              <div className="p-6 bg-app prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary prose-strong:text-primary text-secondary leading-[1.7] flex-1">
                <ReactMarkdown>{reportSections.sales}</ReactMarkdown>
              </div>
            </div>

            {/* Inventory Section */}
            <div className="bg-surface border border-subtle rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-subtle/50 px-6 py-4 border-b border-subtle flex items-center gap-3 shrink-0">
                <Package className="w-5 h-5 text-yellow-500" />
                <h2 className="text-[16px] font-[700] text-primary tracking-tight">Ombor Tahlili</h2>
              </div>
              <div className="p-6 bg-app prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary prose-strong:text-primary text-secondary leading-[1.7] flex-1">
                <ReactMarkdown>{reportSections.inventory}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-surface border border-emerald-500/20 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-emerald-500/10 px-6 py-4 border-b border-emerald-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-[16px] font-[700] text-emerald-700 dark:text-emerald-400 tracking-tight">Strategik Tavsiyalar</h2>
            </div>
            <div className="p-6 sm:p-8 bg-app prose prose-sm md:prose-base dark:prose-invert max-w-none prose-ul:list-disc prose-li:my-1 prose-headings:text-primary prose-strong:text-primary text-secondary leading-[1.8] tracking-[0.01em]">
              <ReactMarkdown>{reportSections.recommendations}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="bg-surface border border-subtle rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-app border border-subtle rounded-2xl flex items-center justify-center mb-5 shadow-sm">
            <BrainCircuit className="w-[28px] h-[28px] text-secondary" strokeWidth={1.5} />
          </div>
          
          <h3 className="text-[18px] font-[600] tracking-tight text-primary mb-2">
            Tahlil natijalari bu yerda ko'rinadi
          </h3>
          <p className="text-secondary text-[14px] max-w-md mx-auto leading-relaxed">
            "Tahlilni Boshlash" tugmasini bosing va biznesingiz holati bo'yicha aqlli tavsiyalarga ega bo'ling.
          </p>
        </div>
      )}

      <AiHistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onSelectReport={(reportData) => {
          setData(reportData);
          setHistoryDate(reportData.createdAt);
        }} 
      />
    </div>
  );
};

export default AIAnalyticsPage;
