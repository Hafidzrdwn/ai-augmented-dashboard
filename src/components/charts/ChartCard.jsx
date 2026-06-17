import { useState, useEffect } from 'react';
import { COLOR, FONT } from '../../styles/tokens';
import { getChartInsight, generateDynamicTitle } from '../../services/aiService';
import { useStreamingText } from '../../hooks/useStreamingText';
import { useDashboard } from '../../context/DashboardContext';
import { parseMarkdownToReact } from '../../utils/dataUtils';

export default function ChartCard({ title: fallbackTitle, subtitle, chartId, chartData, children }) {
  const { regionFilter, zScoreThreshold, momThreshold } = useDashboard();
  const activeFilters = { region: regionFilter, zScore: zScoreThreshold, mom: momThreshold };

  const [aiTitle, setAiTitle] = useState(null);

  const dataString = chartData ? JSON.stringify(chartData) : '';
  const filtersString = JSON.stringify(activeFilters);

  useEffect(() => {
    if (!chartData || !dataString) return;
    setAiTitle(null);
    generateDynamicTitle(
      chartData,
      chartId,
      activeFilters,
      function onComplete(generatedTitle) {
        const cleaned = generatedTitle.replace(/^["']+|["']+$/g, '').trim();
        if (cleaned.length > 5) {
          setAiTitle(cleaned);
        }
      },
    );
  }, [dataString, chartId, filtersString]);

  const displayTitle = aiTitle || fallbackTitle;

  const [showInsight, setShowInsight] = useState(false);
  const { text, isStreaming, error, startStream, onChunk, onComplete, onError, reset } = useStreamingText();

  async function handleAnalyze() {
    if (showInsight && text) {
      setShowInsight(false);
      reset();
      return;
    }
    setShowInsight(true);
    startStream();
    await getChartInsight(chartData, displayTitle, activeFilters, onChunk, onComplete, onError);
  }

  return (
    <div
      id={chartId}
      style={{
        background:    COLOR.surface,
        border:        '1px solid ' + COLOR.border,
        borderRadius:  '6px',
        display:       'flex',
        flexDirection: 'column',
        boxShadow:     '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        padding:        '14px 16px 10px',
        borderBottom:   '1px solid ' + COLOR.border,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        gap:            '12px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin:     0,
            fontSize:   '13px',
            fontWeight: 600,
            color:      COLOR.textPrimary,
            lineHeight: 1.4,
            fontFamily: FONT.sans,
          }}>
            {displayTitle}
          </h3>
          {subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: COLOR.textMuted }}>
              {subtitle}
            </p>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '8px',
            fontSize: '10px',
            fontWeight: 500,
            color: COLOR.textSecondary,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLOR.positive }} />
              <span>Positif / Tertinggi</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLOR.negative }} />
              <span>Negatif / Anomali</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLOR.neutral }} />
              <span>Normal</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          style={{
            flexShrink:   0,
            fontSize:     '11px',
            fontWeight:   500,
            color:        isStreaming ? COLOR.textMuted : COLOR.accent,
            border:       '1px solid ' + (isStreaming ? COLOR.border : COLOR.accent),
            borderRadius: '4px',
            padding:      '4px 10px',
            background:   showInsight ? COLOR.accentMuted : 'transparent',
            transition:   'all 0.15s ease',
            whiteSpace:   'nowrap',
            fontFamily:   FONT.sans,
          }}
          disabled={isStreaming}
        >
          {isStreaming ? 'Menganalisis...' : 'Analisis Chart Ini'}
        </button>
      </div>

      <div style={{ padding: '12px 8px 4px' }}>
        {children}
      </div>

      {showInsight && (
        <div style={{
          borderTop:  '1px solid ' + COLOR.border,
          padding:    '12px 16px',
          background: COLOR.accentMuted,
        }}>
          <div style={{
            fontSize:      '11px',
            fontWeight:    600,
            color:         COLOR.accent,
            marginBottom:  '6px',
            fontFamily:    FONT.mono,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Insight AI
          </div>
          {error ? (
            <p style={{ color: COLOR.negative, fontSize: '12px', margin: 0 }}>
              {error}
            </p>
          ) : text ? (
            <div
              style={{
                color:      COLOR.textSecondary,
                fontSize:   '12px',
                lineHeight: 1.7,
                margin:     0,
                fontFamily: FONT.sans,
              }}
              className={isStreaming ? 'cursor-blink' : ''}
            >
              {parseMarkdownToReact(text)}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
              <span style={{ fontSize: '11px', color: COLOR.textMuted, fontStyle: 'italic', fontFamily: FONT.sans }}>AI sedang menganalisis data grafik</span>
              <span className="dot-bounce" style={{ backgroundColor: COLOR.accent, animationDelay: '0ms' }} />
              <span className="dot-bounce" style={{ backgroundColor: COLOR.accent, animationDelay: '150ms' }} />
              <span className="dot-bounce" style={{ backgroundColor: COLOR.accent, animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
