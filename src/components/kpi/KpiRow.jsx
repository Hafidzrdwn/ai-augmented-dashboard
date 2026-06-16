import { useDashboard } from '../../context/DashboardContext';
import { formatRupiah, formatPct, pctChange } from '../../utils/dataUtils';
import KpiCard from './KpiCard';

export default function KpiRow() {
  var { filteredData, summaryStats, momStats } = useDashboard();

  if (!filteredData || !summaryStats) return null;

  var current = momStats.current;
  var previous = momStats.previous;

  var revChange    = pctChange(current?.totalRevenue, previous?.totalRevenue);
  var profitChange = pctChange(current?.totalProfit, previous?.totalProfit);
  var unitsChange  = pctChange(current?.totalUnits, previous?.totalUnits);
  
  var kpis = [
    {
      label:         'Total Sales',
      value:         'Rp ' + formatRupiah(summaryStats.totalRevenue),
      subValue:      filteredData.length.toLocaleString('id-ID') + ' transaksi terfilter',
      trend:         summaryStats.totalRevenue > 0 ? 'positive' : 'negative',
      changePercent: revChange,
    },
    {
      label:         'Total Profit',
      value:         'Rp ' + formatRupiah(summaryStats.totalProfit),
      subValue:      'Margin rata-rata ' + formatPct(summaryStats.profitMargin),
      trend:         summaryStats.totalProfit > 0 ? 'positive' : 'negative',
      changePercent: profitChange,
    },
    {
      label:         'Unit Terjual',
      value:         summaryStats.totalUnits.toLocaleString('id-ID'),
      subValue:      'Lalu lintas volume barang',
      trend:         'neutral',
      changePercent: unitsChange,
    },
    {
      label:         'Rata-rata Diskon',
      value:         formatPct(summaryStats.avgDiscount),
      subValue:      summaryStats.discountedRatio > 0
        ? 'Diterapkan pada ' + formatPct(summaryStats.discountedRatio) + ' transaksi'
        : 'Tidak ada diskon diberikan',
      trend:         summaryStats.avgDiscount > 0.20 ? 'negative' : 'neutral',
      changePercent: null, 
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(function(kpi) {
        return <KpiCard key={kpi.label} {...kpi} />;
      })}
    </div>
  );
}
