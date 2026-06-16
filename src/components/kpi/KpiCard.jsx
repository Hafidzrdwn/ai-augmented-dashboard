import { COLOR } from '../../styles/tokens';

export default function KpiCard({
  label,           
  value,           
  subValue,       
  trend,           
  changePercent,   
}) {
  var trendColor = {
    positive: COLOR.positive,
    negative: COLOR.negative,
    neutral:  COLOR.border,
  }[trend || 'neutral'];

  return (
    <div
      className="bg-white border rounded-lg p-5 flex flex-col gap-2 relative overflow-hidden"
      style={{
        borderColor: COLOR.border,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-1" 
        style={{ background: trendColor }} 
      />

      <div className="flex justify-between items-start mt-1">
        <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
          {label}
        </span>
        
        {changePercent !== undefined && changePercent !== null && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${changePercent >= 0 ? 'text-green-700 bg-green-50 border border-green-200/50' : 'text-red-600 bg-red-50 border border-red-200/50'}`}>
            <span>{changePercent >= 0 ? '▲ +' : '▼ -'}</span>
            <span>{Math.abs(changePercent * 100).toFixed(1).replace('.', ',')}% vs Bulan Lalu</span>
          </span>
        )}
      </div>

      <span className="text-3xl font-semibold text-slate-900 font-mono leading-tight tracking-tight mt-1">
        {value}
      </span>

      {subValue && (
        <span className="text-xs text-slate-500 mt-1">
          {subValue}
        </span>
      )}
    </div>
  );
}
