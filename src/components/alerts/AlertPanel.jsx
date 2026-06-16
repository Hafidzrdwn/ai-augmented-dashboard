import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { runAnomalyEngine } from '../../utils/anomalyEngine';
import { narrateAlert, summarizeAnomalies } from '../../services/aiService';

const TYPE_LABEL = {
  point:      'Z-SKOR',
  mom:        'MOM',
  contextual: 'WILAYAH',
};

const PREVIEW_COUNT = 12;

function AlertRow({ anomaly }) {
  const [expanded, setExpanded] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const handleToggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !narrative && !loading) {
      setLoading(true);
      setError(null);
      await narrateAlert(
        anomaly,
        function onChunk(delta, full) { setNarrative(full); },
        function onComplete(full) { setNarrative(full); setLoading(false); },
        function onError(msg) { setError(msg); setLoading(false); },
      );
    }
  }, [expanded, narrative, loading, anomaly]);

  const isHigh = anomaly.severity === 'high';
  const borderClass = isHigh ? 'border-l-4 border-red-500' : 'border-l-4 border-orange-500';
  const bgClass = expanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50';
  const directionColor = anomaly.direction === 'negative' ? 'text-red-500' : 'text-blue-600';

  return (
    <div className={`border-b border-slate-100 transition-all duration-150 ${borderClass} ${bgClass}`}>
      {/* Row Header — Clickable */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left transition-colors duration-150"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Severity Dot Indicator */}
          {isHigh ? (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.4)] animate-pulse" title="Kritis" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.4)]" title="Peringatan" />
          )}

          {/* Type badge */}
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 shrink-0">
            {TYPE_LABEL[anomaly.type] || anomaly.type.toUpperCase()}
          </span>

          {/* Label and details stacked */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-slate-800 truncate">
              {anomaly.label}
            </span>
            <span className="text-xs font-mono text-slate-500 block truncate mt-0.5">
              {anomaly.detail}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-mono font-bold ${directionColor}`}>
            {anomaly.direction === 'negative' ? '▼ Turun' : '▲ Naik'}
          </span>
          <span className={`text-sm text-slate-400 transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="alert-expand bg-slate-50/70 border-t border-slate-100/50 px-5 py-4">
          {/* AI Recommendation */}
          <div>
            <span className="text-[10px] font-bold font-mono text-blue-600 uppercase tracking-wider block mb-1.5">
              Rekomendasi Tindakan AI
            </span>
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : narrative ? (
              <p className={`text-sm text-slate-700 leading-relaxed font-sans ${loading ? 'cursor-blink' : ''}`}>
                {narrative}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <span className="text-xs text-slate-400 font-mono italic">AI sedang memformulasikan rekomendasi</span>
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '0ms' }} />
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '150ms' }} />
                <span className="dot-bounce bg-blue-600" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnomalySummaryPanel({ anomalies }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !anomalies.length) return;
    fetchedRef.current = true;

    setLoading(true);
    setError(null);
    summarizeAnomalies(
      anomalies,
      (chunk, full) => setSummary(full),
      (full) => { setSummary(full); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
  }, [anomalies]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
        <span>🤖</span>
        <span>Rangkuman Anomali Agregat oleh AI</span>
      </div>
      <div className="text-sm text-slate-700 leading-relaxed font-sans border-l-2 border-red-500 pl-4 py-1 bg-red-50/10">
        {error ? (
          <p className="text-red-500 font-medium">{error}</p>
        ) : (
          <div className={loading ? 'cursor-blink' : ''}>
              {summary ? (
                <p className="whitespace-pre-wrap">{summary}</p>
              ) : (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-xs text-slate-400 font-mono italic">AI sedang merangkum temuan anomali</span>
                  <span className="dot-bounce bg-red-600" style={{ animationDelay: '0ms' }} />
                  <span className="dot-bounce bg-red-600" style={{ animationDelay: '150ms' }} />
                  <span className="dot-bounce bg-red-600" style={{ animationDelay: '300ms' }} />
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertPanel() {
  const { filteredData, rawData, zScoreThreshold, momThreshold } = useDashboard();
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('data');

  const anomalies = useMemo(() => {
    if (!filteredData.length) return [];
    return runAnomalyEngine(filteredData, rawData, zScoreThreshold, momThreshold);
  }, [filteredData, rawData, zScoreThreshold, momThreshold]);

  const criticalCount = useMemo(() => anomalies.filter(a => a.severity === 'high').length, [anomalies]);
  const warningCount = useMemo(() => anomalies.filter(a => a.severity === 'medium').length, [anomalies]);

  const displayed = showAll ? anomalies : anomalies.slice(0, PREVIEW_COUNT);
  const hidden = anomalies.length - PREVIEW_COUNT;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-sm md:text-base font-bold text-slate-900">
            Anomali Terdeteksi
          </h2>
          
          {/* Counts */}
          {anomalies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-sm shadow-red-600/10">
                {criticalCount} Kritis
              </span>
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-sm shadow-orange-500/10">
                {warningCount} Peringatan
              </span>
            </div>
          )}
        </div>

        {/* AI Narrative Toggle Button */}
        {anomalies.length > 0 && (
          <button
            onClick={() => setActiveTab(activeTab === 'data' ? 'narasi' : 'data')}
            style={{ backgroundColor: '#991b1b', color: '#ffffff' }}
            className="flex items-center gap-1.5 hover:bg-red-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm shadow-red-950/10 shrink-0"
          >
            <span>🤖</span> Narasi AI
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      {anomalies.length > 0 && (
        <div className="flex border-b border-slate-100 px-5 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'border-red-500 text-slate-800 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Data Anomali
          </button>
          <button
            onClick={() => setActiveTab('narasi')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'narasi'
                ? 'border-red-500 text-slate-800 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Narasi AI
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div>
        {anomalies.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Tidak ada anomali terdeteksi pada pengaturan saat ini. Coba turunkan ambang batas parameter di panel atas.
          </div>
        ) : activeTab === 'narasi' ? (
          <AnomalySummaryPanel anomalies={anomalies} />
        ) : (
          /* Scrollable anomalies list container with max-height */
          <div className="flex flex-col">
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {displayed.map((a) => (
                <AlertRow key={a.id} anomaly={a} />
              ))}
            </div>

            {!showAll && hidden > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full text-center py-3 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-blue-600 border-t border-slate-100 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Lihat Semua {anomalies.length} Anomali Terdeteksi ↓
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
