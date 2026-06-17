import { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getDynamicDashboardTitle } from '../services/aiService';
import { formatRupiah, groupByCategory } from '../utils/dataUtils';
import { runAnomalyEngine } from '../utils/anomalyEngine';

import PageHeader from '../components/layout/PageHeader';
import ControlBar from '../components/layout/ControlBar';
import KpiRow from '../components/kpi/KpiRow';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import CategoryProfitChart from '../components/charts/CategoryProfitChart';
import ProfitScatterChart from '../components/charts/ProfitScatterChart';
import RegionMarginChart from '../components/charts/RegionMarginChart';
import AlertPanel from '../components/alerts/AlertPanel';
import AiExecutiveSummary from '../components/alerts/AiExecutiveSummary';
import CustomQuestionChat from '../components/alerts/CustomQuestionChat';
import { Skeleton } from '../components/ui/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary';

function CategoryPerformanceTable({ data }) {
  const categories = useMemo(() => {
    return groupByCategory(data).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md flex flex-col gap-4">
      <div>
        <h3 className="text-sm md:text-base font-bold text-slate-900 m-0">
          Ringkasan Performa Kategori
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Detail penjualan, profit bersih, dan margin real-time hasil filter.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-2.5 pr-2">Kategori</th>
              <th className="py-2.5 px-2 text-right">Sales</th>
              <th className="py-2.5 px-2 text-right">Profit</th>
              <th className="py-2.5 pl-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-medium">
            {categories.map((cat) => {
              const isLoss = cat.profit < 0;
              return (
                <tr key={cat.category} className="hover:bg-slate-50/50">
                  <td className="py-2.5 pr-2 text-slate-800 font-semibold">{cat.category}</td>
                  <td className="py-2.5 px-2 text-right text-slate-900 font-mono">Rp {formatRupiah(cat.revenue)}</td>
                  <td className={`py-2.5 px-2 text-right font-mono ${isLoss ? 'text-red-500 font-bold' : 'text-blue-600'}`}>
                    Rp {formatRupiah(cat.profit)}
                  </td>
                  <td className={`py-2.5 pl-2 text-right font-mono ${isLoss ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                    {(cat.profitMargin * 100).toFixed(1).replace('.', ',')}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { 
    isLoading, 
    error, 
    filteredData, 
    summaryStats, 
    rawData, 
    zScoreThreshold, 
    momThreshold,
    regionFilter
  } = useDashboard();
  const [headline, setHeadline] = useState('');

  const activeFilters = useMemo(() => ({
    region: regionFilter,
    zScore: zScoreThreshold,
    mom: momThreshold
  }), [regionFilter, zScoreThreshold, momThreshold]);

  useEffect(() => {
    if (!summaryStats) return;
    let isMounted = true;
    setHeadline(''); 
    getDynamicDashboardTitle(
      summaryStats,
      activeFilters,
      (text) => { if (isMounted) setHeadline(text.replace(/^["']+|["']+$/g, '')); },
      (err) => console.error('Headline generation failed:', err)
    );
    return () => { isMounted = false; };
  }, [summaryStats, activeFilters]);


  const fallbackTitle = useMemo(() => {
    if (!summaryStats || summaryStats.totalRevenue === 0) {
      return 'Laporan Analisis Performa Bisnis: Tidak Ada Data Transaksi';
    }
    const marginPct = (summaryStats.profitMargin * 100).toFixed(1).replace('.', ',');
    const profitVal = formatRupiah(summaryStats.totalProfit);
    const revenueVal = formatRupiah(summaryStats.totalRevenue);
    const profitText = summaryStats.totalProfit >= 0 ? `Profit Rp ${profitVal}` : `Kerugian Rp ${profitVal}`;
    
    let anomalyCount = 0;
    try {
      if (filteredData && filteredData.length) {
        anomalyCount = runAnomalyEngine(filteredData, rawData, zScoreThreshold, momThreshold).length;
      }
    } catch (e) {
      console.error(e);
    }
    
    const anomalyText = anomalyCount > 0 ? `dengan ${anomalyCount} Anomali Terdeteksi` : 'tanpa Anomali';
    return `Laporan Analisis Performa Bisnis: Pendapatan Rp ${revenueVal} (${profitText}, Margin ${marginPct}%) ${anomalyText}`;
  }, [summaryStats, filteredData, rawData, zScoreThreshold, momThreshold]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader />
        <div className="p-8 text-red-600 font-medium">
          Error loading data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <PageHeader />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[72px] w-full rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[380px] rounded-lg lg:col-span-2" />
              <Skeleton className="h-[380px] rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            
            <section className="space-y-6">
              <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono">
                    Situation
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Konteks Performa Bisnis
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-1">
                  {headline || fallbackTitle}
                </h1>
              </div>

              <ControlBar />

              <KpiRow />
            </section>


            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono">
                  Complication
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Deteksi Anomali & Visualisasi Konflik Data
                </span>
              </div>

              <div className="space-y-6">
                <ErrorBoundary>
                  <AlertPanel />
                </ErrorBoundary>

                {/* D3 Charts - Spacious 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ErrorBoundary>
                    <RevenueTrendChart data={filteredData} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <ProfitScatterChart data={filteredData} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <CategoryProfitChart data={filteredData} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <RegionMarginChart data={filteredData} />
                  </ErrorBoundary>
                </div>
              </div>
            </section>


            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono">
                  Resolution
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Rekomendasi Aksi & Solusi Berbasis AI
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <AiExecutiveSummary />
                  
                  <CategoryPerformanceTable data={filteredData} />
                </div>

                <div className="lg:col-span-1">
                  <CustomQuestionChat />
                </div>
                
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 font-sans mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} AI Augmented Dashboard. All rights reserved.</p>
          <p>
            Developed by{' '}
            <a 
              href="https://github.com/Hafidzrdwn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              Hafidz Ridwan Cahya
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
