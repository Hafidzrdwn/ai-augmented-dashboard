import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { generateExecutiveSummary } from '../../services/aiService';
import { runAnomalyEngine } from '../../utils/anomalyEngine';

export default function AiExecutiveSummary() {
  const { summaryStats, filteredData, rawData, regionFilter, zScoreThreshold, momThreshold } = useDashboard();
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!summaryStats || !filteredData.length) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSummary('');

    const anomalies = runAnomalyEngine(filteredData, rawData, zScoreThreshold, momThreshold);

    generateExecutiveSummary(
      summaryStats,
      anomalies,
      regionFilter,
      (chunk, full) => { if (isMounted) setSummary(full); },
      (full) => { if (isMounted) { setSummary(full); setLoading(false); } },
      (errMsg) => { if (isMounted) { setError(errMsg); setLoading(false); } }
    );

    return () => { isMounted = false; };
  }, [summaryStats, filteredData, rawData, regionFilter, zScoreThreshold, momThreshold]);

  const formattedSummary = summary.split('\n').map((line, i) => {
    if (line.trim().startsWith('- ')) {
      return (
        <li key={i} className="mb-2 pl-1 relative">
          <span className="absolute left-[-16px] text-blue-600 font-bold">•</span>
          {line.replace(/^- /, '')}
        </li>
      );
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="mb-2">{line}</p>;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-slate-900 m-0">Ringkasan Eksekutif AI</h2>
      </div>

      <div className="text-sm text-slate-600 leading-relaxed min-h-[100px]">
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className={loading ? 'cursor-blink' : ''}>
            {summary ? (
              <ul className="list-none ml-4 m-0 p-0">
                {formattedSummary}
              </ul>
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <span className="text-xs text-slate-400 font-mono italic">AI sedang menganalisis performa bisnis</span>
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '0ms' }} />
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '150ms' }} />
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
