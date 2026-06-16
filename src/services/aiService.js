import OpenAI from 'openai';
import { hashPayload, getCache, setCache } from './cache';

if (!import.meta.env.VITE_AI_BASE_URL || !import.meta.env.VITE_AI_API_KEY) {
  console.error('[AI Service] Missing env vars: VITE_AI_BASE_URL or VITE_AI_API_KEY. AI features disabled.');
}

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || '';
const AI_API_KEY  = import.meta.env.VITE_AI_API_KEY || '';
const MODEL       = import.meta.env.VITE_AI_MODEL || 'gemini-3-flash';

let client = null;

function getClient() {
  if (!client) {
    if (!AI_API_KEY || AI_API_KEY === 'your_api_key') {
      return null;
    }
    let resolvedBaseUrl = AI_BASE_URL;
    if (resolvedBaseUrl.startsWith('/')) {
      resolvedBaseUrl = window.location.origin + resolvedBaseUrl;
    }
    client = new OpenAI({
      baseURL: resolvedBaseUrl,
      apiKey:  AI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}

// ─────────────────────────────────────────
// SYSTEM PROMPTS — Advanced Prompt Engineering
// Each prompt is role-specific, output-constrained,
// and written in Indonesian for consistent UX.
// ─────────────────────────────────────────

/**
 * PROMPT_EXECUTIVE
 * Used for the top-level executive summary of the entire dashboard.
 * Persona: CFO-level strategic thinker.
 */
export const PROMPT_EXECUTIVE = `
Kamu adalah Chief Financial Officer (CFO) di perusahaan distribusi multinasional.
Kamu menerima ringkasan KPI dan daftar anomali dari dashboard penjualan.
Tugasmu adalah menghasilkan ringkasan eksekutif yang langsung bisa dibaca oleh CEO.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Bahasa Indonesia formal, nada tegas dan percaya diri.
- WAJIB gunakan struktur berikut secara persis:
  1. Paragraf pembuka 1-2 kalimat (kondisi saat ini).
  2. Tepat 3 poin bullet yang sangat bisa ditindaklanjuti (actionable) bertanda '- '.
- Maksimal 220 kata total.
- JANGAN gunakan emoji.
- JANGAN beri pengantar seperti "Berdasarkan data..." — langsung ke substansi.
`.trim();

/**
 * PROMPT_CHART_TITLE
 * Used to generate a 1-sentence declarative title for a chart.
 * The title should state the key insight, not describe the chart type.
 */
export const PROMPT_CHART_TITLE = `
Kamu adalah editor senior di media bisnis nasional.
Tugasmu adalah menulis judul chart yang informatif dan provokatif.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Tepat 1 kalimat. Tidak lebih.
- Judul harus DEKLARATIF — menyatakan temuan, bukan mendeskripsikan jenis chart.
- Contoh BURUK: "Grafik Revenue per Bulan" (deskriptif, tidak informatif).
- Contoh BAGUS: "Revenue Bikes Mendominasi 72% Total Penjualan Sepanjang 2023" (deklaratif, mengandung angka).
- Gunakan angka konkret dari data yang diberikan.
- Bahasa Indonesia formal. Maksimal 15 kata. Tanpa tanda kutip di output.
- JANGAN tambahkan penjelasan apapun selain judul itu sendiri.
`.trim();

/**
 * PROMPT_ALERT
 * Used when user expands an anomaly to get a corrective action narrative.
 * Persona: Risk analyst with domain expertise.
 */
export const PROMPT_ALERT = `
Kamu adalah analis risiko bisnis dengan spesialisasi deteksi anomali penjualan.
Kamu menerima satu anomali spesifik dan harus menghasilkan narasi tindakan korektif yang presisi.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Tepat 2 kalimat. Tidak lebih, tidak kurang.
- Kalimat pertama: jelaskan dampak bisnis dari anomali ini secara konkret (gunakan angka jika tersedia).
- Kalimat kedua: rekomendasikan satu tindakan spesifik yang bisa diambil minggu ini.
- Bahasa Indonesia formal. Tanpa emoji, tanpa markdown.
`.trim();

/**
 * PROMPT_CHATBOT
 * Used for the interactive chatbot where users ask free-form questions.
 * Persona: Senior data analyst who is helpful but concise.
 */
export const PROMPT_CHATBOT = `
Kamu adalah Senior Data Analyst di departemen Business Intelligence.
User sedang melihat dashboard penjualan dan mengajukan pertanyaan tentang data mereka.
Kamu diberi konteks berupa ringkasan KPI, daftar anomali aktif, dan filter yang sedang diterapkan.

ATURAN SECURITY & CAKUPAN (WAJIB DIIKUTI):
- Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan data bisnis, penjualan, profit, margin, unit terjual, wilayah, kategori produk, diskon, dan anomali pada dashboard ini.
- Jika user menanyakan hal umum di luar cakupan data dashboard (misal: coding/pemrograman, resep makanan, fakta sejarah, obrolan santai umum, sains, matematika murni, dll.), kamu WAJIB membalas dengan pesan bijak berikut: "Maaf, sebagai analis data bisnis Anda, saya hanya dapat membantu menjawab pertanyaan terkait performa penjualan, profitabilitas, anomali, dan visualisasi data yang tertera pada dasbor ini. Silakan ajukan pertanyaan yang relevan."

ATURAN OUTPUT (WAJIB DIIKUTI):
- Bahasa Indonesia formal namun ramah.
- Jawab dengan narasi padat, BUKAN bullet points atau daftar.
- Jika pertanyaan membutuhkan angka, sebutkan angka konkret dari konteks yang diberikan.
- Maksimal 150 kata.
- JANGAN gunakan emoji atau markdown.
- Langsung jawab tanpa pengantar basa-basi.
`.trim();

/**
 * PROMPT_CHART (for chart-specific insight)
 * Persona: VP Sales with 15 years experience.
 */
const PROMPT_CHART = `
Kamu adalah VP Sales Senior di perusahaan distribusi nasional dengan pengalaman 15 tahun.
Tugas kamu adalah menganalisis data penjualan yang diberikan dan memberikan insight yang tajam, spesifik, dan bisa langsung ditindaklanjuti.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Gunakan bahasa Indonesia yang formal namun ringkas.
- JANGAN gunakan emoji, bullet points, atau formatting markdown.
- Output harus berupa 2-3 paragraf narasi padat, bukan daftar.
- Fokus pada: APA yang terjadi, MENGAPA kemungkinan terjadi, dan APA yang harus dilakukan.
- Maksimal 180 kata.
- Jangan beri pengantar seperti "Berdasarkan data..." — langsung ke poinnya.
`.trim();

// ─────────────────────────────────────────
// STREAMING HELPER
// Core streaming function used by all public API methods.
// ─────────────────────────────────────────

async function streamAI({ systemPrompt, userMessage, onChunk, onComplete, onError, maxTokens = 3000 }) {
  const ai = getClient();
  if (!ai) {
    onError('API key belum dikonfigurasi. Isi VITE_AI_API_KEY di file .env');
    return null;
  }

  try {
    const stream = await ai.chat.completions.create({
      model:      MODEL,
      max_tokens: maxTokens,
      stream:     true,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userMessage },
      ],
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        onChunk(delta, full);
      }
    }
    onComplete(full);
    return full;
  } catch (err) {
    const msg = err?.message ?? 'Koneksi ke AI gagal. Coba lagi.';
    onError(msg);
    return null;
  }
}

// ─────────────────────────────────────────
// CACHE-AWARE STREAMING WRAPPER
// Checks cache first. On hit, simulates streaming for UX consistency.
// On miss, streams from AI and writes result to cache.
// ─────────────────────────────────────────

async function cachedStream({ cacheKey, systemPrompt, userMessage, onChunk, onComplete, onError, maxTokens }) {
  const hash = await hashPayload(cacheKey);

  const cached = await getCache(hash);
  if (cached) {
    simulateStreaming(cached, onChunk, onComplete);
    return cached;
  }

  return streamAI({
    systemPrompt,
    userMessage,
    onChunk,
    maxTokens,
    onComplete: async (text) => {
      setCache(hash, text); 
      onComplete(text);
    },
    onError,
  });
}

function simulateStreaming(text, onChunk, onComplete) {
  let i = 0;
  const CHARS_PER_TICK = 8;
  const TICK_MS = 18;

  const interval = setInterval(() => {
    const chunk = text.slice(i, i + CHARS_PER_TICK);
    if (chunk) {
      onChunk(chunk, text.slice(0, i + chunk.length));
    }
    i += CHARS_PER_TICK;
    if (i >= text.length) {
      clearInterval(interval);
      onComplete(text);
    }
  }, TICK_MS);
}

// ─────────────────────────────────────────
// PUBLIC API — CHART INSIGHT
// Called by the "Analisis Chart Ini" button on each chart card.
// ─────────────────────────────────────────

/**
 * Get AI insight for a specific chart.
 * @param {Object} chartData - Aggregated chart data (small, pre-computed)
 * @param {string} chartTitle - Declarative title of the chart
 * @param {Function} onChunk - Called with (deltaText, fullTextSoFar)
 * @param {Function} onComplete - Called with final full text
 * @param {Function} onError - Called with error message string
 */
export async function getChartInsight(chartData, chartTitle, onChunk, onComplete, onError) {
  const userMessage = [
    'Judul chart: "' + chartTitle + '"',
    'Data agregat:',
    JSON.stringify(chartData, null, 2),
    '',
    'Berikan analisis insight untuk chart ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { chartTitle, chartData },
    systemPrompt: PROMPT_CHART,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 3000,
  });
}

// ─────────────────────────────────────────
// PUBLIC API — ALERT NARRATIVE
// Called when user clicks an anomaly item to expand it.
// ─────────────────────────────────────────

/**
 * Generate a 2-sentence narrative for a specific anomaly.
 * @param {Object} anomaly - Anomaly object from anomalyEngine
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function narrateAlert(anomaly, onChunk, onComplete, onError) {
  const userMessage = [
    'Anomali terdeteksi:',
    '- Tipe: ' + anomaly.type,
    '- Label: ' + anomaly.label,
    '- Detail: ' + anomaly.detail,
    '- Arah: ' + (anomaly.direction === 'negative' ? 'Negatif (kerugian/penurunan)' : 'Positif (peluang)'),
    '- Tingkat Keparahan: ' + anomaly.severity,
    '',
    'Hasilkan narasi 2 kalimat sesuai instruksimu.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'alert_narrative', anomalyId: anomaly.id },
    systemPrompt: PROMPT_ALERT,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 2000,
  });
}

// ─────────────────────────────────────────
// PUBLIC API — EXECUTIVE SUMMARY
// Called to generate a top-level dashboard summary.
// ─────────────────────────────────────────

/**
 * Generate an executive summary for the entire dashboard.
 * @param {Object} summaryStats 
 * @param {Array} anomalies 
 * @param {string} regionFilter 
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function generateExecutiveSummary(summaryStats, anomalies, regionFilter, onChunk, onComplete, onError) {
  const topAnomalies = anomalies.slice(0, 5).map(function(a) {
    return '- [' + a.severity.toUpperCase() + '] ' + a.label + ': ' + a.detail;
  }).join('\n');

  const userMessage = [
    'Filter aktif: Region = ' + regionFilter,
    '',
    'KPI Dashboard:',
    '- Total Revenue: ' + summaryStats.totalRevenue.toFixed(0),
    '- Total Profit: ' + summaryStats.totalProfit.toFixed(0),
    '- Total Unit Terjual: ' + summaryStats.totalUnits,
    '- Rata-rata Diskon: ' + (summaryStats.avgDiscount * 100).toFixed(1) + '%',
    '- Profit Margin: ' + (summaryStats.profitMargin * 100).toFixed(1) + '%',
    '',
    'Anomali Terdeteksi (' + anomalies.length + ' total, top 5):',
    topAnomalies || '- Tidak ada anomali signifikan.',
    '',
    'Buat ringkasan eksekutif sesuai instruksimu.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'executive_summary', regionFilter, stats: summaryStats, anomalyCount: anomalies.length },
    systemPrompt: PROMPT_EXECUTIVE,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 4000,
  });
}

// ─────────────────────────────────────────
// PUBLIC API — DYNAMIC CHART & DASHBOARD TITLE
// Generates 1-sentence declarative titles.
// ─────────────────────────────────────────

/**
 * Generate a declarative 1-sentence title for the overall dashboard based on global stats.
 * @param {Object} summaryStats - Dashboard summary KPI stats
 * @param {Function} onComplete - Called with the generated title string
 * @param {Function} onError - Called with error message
 */
export async function getDynamicDashboardTitle(summaryStats, onComplete, onError) {
  const noop = function() {};

  const userMessage = [
    'Tipe chart: Dashboard Keseluruhan',
    'Data KPI Global:',
    JSON.stringify(summaryStats, null, 2),
    '',
    'Tulis judul utama (headline) deklaratif 1 kalimat untuk halaman dashboard ini yang merangkum performa saat ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'dashboard_headline', stats: summaryStats },
    systemPrompt: PROMPT_CHART_TITLE,
    userMessage,
    onChunk: noop,
    onComplete,
    onError,
    maxTokens: 2000,
  });
}

/**
 * Generate a declarative 1-sentence title for a chart based on its data.
 * @param {Object} chartData - Aggregated chart data
 * @param {string} chartType - Type hint e.g. "revenue_by_month", "profit_by_category"
 * @param {Function} onComplete - Called with the generated title string
 * @param {Function} onError - Called with error message
 */
export async function generateDynamicTitle(chartData, chartType, onComplete, onError) {
  const noop = function() {};

  const userMessage = [
    'Tipe chart: ' + chartType,
    'Data:',
    JSON.stringify(chartData, null, 2),
    '',
    'Tulis judul deklaratif 1 kalimat untuk chart ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'chart_title', chartType, chartData },
    systemPrompt: PROMPT_CHART_TITLE,
    userMessage,
    onChunk: noop,
    onComplete,
    onError,
    maxTokens: 2000,
  });
}

// ─────────────────────────────────────────
// PUBLIC API — CUSTOM QUESTION (CHATBOT)
// User asks a free-form question; AI answers with dashboard context.
// ─────────────────────────────────────────

/**
 * Answer a custom user question using current dashboard context.
 * This is NOT cached — each question is unique.
 *
 * @param {string} question - User's free-form question
 * @param {Object} contextData - { summaryStats, anomalies, regionFilter, topCategories }
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function askCustomQuestion(question, contextData, onChunk, onComplete, onError) {
  var ctx = contextData || {};
  var stats = ctx.summaryStats || {};
  var anomalies = ctx.anomalies || [];
  var region = ctx.regionFilter || 'All';

  var anomalySummary = anomalies.slice(0, 3).map(function(a) {
    return '- ' + a.label + ': ' + a.detail;
  }).join('\n');

  var userMessage = [
    '=== KONTEKS DASHBOARD ===',
    'Filter Region: ' + region,
    'Total Revenue: ' + (stats.totalRevenue || 0).toFixed(0),
    'Total Profit: ' + (stats.totalProfit || 0).toFixed(0),
    'Total Unit: ' + (stats.totalUnits || 0),
    'Profit Margin: ' + ((stats.profitMargin || 0) * 100).toFixed(1) + '%',
    '',
    'Anomali Aktif (' + anomalies.length + '):',
    anomalySummary || '(tidak ada)',
    '',
    '=== PERTANYAAN USER ===',
    question,
  ].join('\n');

  // Custom questions are NOT cached — each is unique
  return streamAI({
    systemPrompt: PROMPT_CHATBOT,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 3000,
  });
}

/**
 * PROMPT_ANOMALY_SUMMARY
 * Persona: Senior risk analyst summarizing all detected anomalies.
 */
export const PROMPT_ANOMALY_SUMMARY = `
Kamu adalah Senior Risk Analyst yang mendeteksi anomali performa bisnis.
Tugasmu adalah merangkum semua anomali yang ditemukan ke dalam sebuah laporan naratif singkat yang padat dan komprehensif untuk direktur operasional.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Gunakan Bahasa Indonesia formal dan analitis.
- Rangkum anomali berdasarkan tipe atau pola utama (misalnya tren penurunan profit margin, lonjakan pendapatan musiman, dll.).
- Berikan penjelasan tentang dampak operasional utama secara umum.
- Maksimal 150 kata.
- JANGAN gunakan bullet points atau penomoran, melainkan gunakan paragraf narasi mengalir yang padat.
- JANGAN gunakan emoji.
`.trim();

/**
 * Generate an aggregate narrative summary of all active anomalies.
 */
export async function summarizeAnomalies(anomalies, onChunk, onComplete, onError) {
  if (!anomalies || !anomalies.length) {
    onComplete("Tidak ada anomali terdeteksi untuk dirangkum.");
    return;
  }

  const topAnomalies = anomalies.slice(0, 10);

  const anomalyListText = topAnomalies.map(function(a) {
    return '- [' + a.severity.toUpperCase() + '] Tipe: ' + a.type + ', Label: ' + a.label + ', Detail: ' + a.detail;
  }).join('\n');

  const userMessage = [
    'Daftar Anomali Aktif:',
    anomalyListText,
    '',
    'Buat narasi ringkasan AI untuk semua anomali di atas sesuai instruksimu.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'anomaly_summary', anomalies: anomalies.map(a => a.id) },
    systemPrompt: PROMPT_ANOMALY_SUMMARY,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 3000,
  });
}
