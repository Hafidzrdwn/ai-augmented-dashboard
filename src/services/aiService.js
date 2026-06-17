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

export const SYSTEM_PROMPTS = {
  TITLE: `Kamu adalah Copywriter Data Senior. Buat 1 kalimat headline deklaratif (maks 12 kata) yang menyimpulkan performa utama dari data agregat yang diberikan. Jika profit negatif, gunakan nada waspada. Jika positif, gunakan nada pencapaian. Dilarang menggunakan titik di akhir kalimat. Bahasa Indonesia formal.
ATURAN FORMAT ANGKA (WAJIB DIIKUTI):
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
ATURAN OUTPUT BERSIH (WAJIB DIIKUTI):
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa teks headline final.`,
  
  EXECUTIVE: `Kamu adalah VP of Data Analytics. Berdasarkan ringkasan data agregat dan status filter saat ini, berikan 3 poin Ringkasan Eksekutif. 
ATURAN:
1. Poin 1: Observasi utama (Fakta).
2. Poin 2: Temuan anomali/risiko paling kritis.
3. Poin 3: Rekomendasi aksi taktis jangka pendek.
Gunakan bullet points tanpa awalan kata pengantar. Dilarang keras berhalusinasi atau menyebut metrik yang tidak ada dalam data.
ATURAN FORMAT ANGKA (WAJIB DIIKUTI):
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
ATURAN OUTPUT BERSIH (WAJIB DIIKUTI):
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa 3 poin ringkasan eksekutif.`,
  
  CHART: `Kamu adalah Analis Data Eksekutif. Diberikan data spesifik untuk satu grafik dan filter aktif.
Tugas: Buat 1 paragraf singkat (maks 2 kalimat) berisi insight paling tajam, dan 1 kalimat rekomendasi spesifik. Jangan mendeskripsikan ulang chart-nya, berikan makna (SO WHAT) dari chart tersebut.
ATURAN FORMAT ANGKA (WAJIB DIIKUTI):
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
ATURAN OUTPUT BERSIH (WAJIB DIIKUTI):
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa paragraf insight dan rekomendasi.`,

  CHATBOT: `Kamu adalah AI Assistant eksklusif untuk Dashboard Penjualan Superstore. 
TUGAS UTAMA: Menjawab pertanyaan user HANYA berdasarkan konteks data JSON terkompresi yang dilampirkan.
ATURAN WAJIB:
1. Jika ditanya spesifik (contoh: "Provinsi mana profit terendah?"), cari di bagian data region/provinsi dari konteks JSON dan jawab spesifik angkanya.
2. Jika informasi tidak ada di konteks JSON, jawab: "Maaf, data tersebut tidak tersedia pada cakupan filter saat ini." DILARANG MENGARANG JAWABAN.
3. Format jawaban: Gunakan paragraf sangat pendek (maks 2 kalimat) atau bullet points agar mudah dibaca di UI yang kecil. Jangan berikan "wall of text".
ATURAN FORMAT ANGKA (WAJIB DIIKUTI):
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
ATURAN OUTPUT BERSIH (WAJIB DIIKUTI):
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa teks jawaban final.`
};

export const PROMPT_ALERT = `
Kamu adalah analis risiko bisnis dengan spesialisasi deteksi anomali penjualan.
Kamu menerima satu anomali spesifik dan harus menghasilkan narasi tindakan korektif yang presisi.

ATURAN OUTPUT (WAJIB DIIKUTI):
- Tepat 2 kalimat. Tidak lebih, tidak kurang.
- Kalimat pertama: jelaskan dampak bisnis dari anomali ini secara konkret (gunakan angka jika tersedia).
- Kalimat kedua: rekomendasikan satu tindakan spesifik yang bisa diambil minggu ini.
- Bahasa Indonesia formal. Tanpa emoji, tanpa markdown.
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa teks narasi rekomendasi 2 kalimat saja.
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
// FILTER STATUS HELPER
// ─────────────────────────────────────────
function getFilterHeader(activeFilters) {
  var filters = activeFilters || { region: 'All', zScore: 1.5, mom: 25 };
  var region = filters.region || 'All';
  var zScore = filters.zScore !== undefined ? filters.zScore : 1.5;
  var mom = filters.mom !== undefined ? filters.mom : 25;
  return "STATUS FILTER SAAT INI: Wilayah = " + region + ", Ambang Z-Score = " + zScore + ", Ambang MoM = " + mom + "%. JANGAN membahas data di luar filter ini.";
}

// ─────────────────────────────────────────
// PUBLIC API — CHART INSIGHT
// Called by the "Analisis Chart Ini" button on each chart card.
// ─────────────────────────────────────────

/**
 * Get AI insight for a specific chart.
 * @param {Object} chartData - Aggregated chart data (small, pre-computed)
 * @param {string} chartTitle - Declarative title of the chart
 * @param {Object} activeFilters - Current active filters
 * @param {Function} onChunk - Called with (deltaText, fullTextSoFar)
 * @param {Function} onComplete - Called with final full text
 * @param {Function} onError - Called with error message string
 */
export async function getChartInsight(chartData, chartTitle, activeFilters, onChunk, onComplete, onError) {
  var filterText = getFilterHeader(activeFilters);
  const userMessage = [
    filterText,
    'Judul chart: "' + chartTitle + '"',
    'Data agregat:',
    JSON.stringify(chartData, null, 2),
    '',
    'Berikan analisis insight untuk chart ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { chartTitle, chartData, activeFilters },
    systemPrompt: SYSTEM_PROMPTS.CHART,
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
 * @param {Object} activeFilters - Current active filters
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function narrateAlert(anomaly, activeFilters, onChunk, onComplete, onError) {
  var filterText = getFilterHeader(activeFilters);
  const userMessage = [
    filterText,
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
    cacheKey: { type: 'alert_narrative', anomalyId: anomaly.id, activeFilters },
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
 * @param {Object} activeFilters 
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function generateExecutiveSummary(summaryStats, anomalies, activeFilters, onChunk, onComplete, onError) {
  var filterText = getFilterHeader(activeFilters);
  var regionFilter = (activeFilters && activeFilters.region) || 'All';
  const topAnomalies = anomalies.slice(0, 5).map(function(a) {
    return '- [' + a.severity.toUpperCase() + '] ' + a.label + ': ' + a.detail;
  }).join('\n');

  const userMessage = [
    filterText,
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
    cacheKey: { type: 'executive_summary', stats: summaryStats, anomalyCount: anomalies.length, activeFilters },
    systemPrompt: SYSTEM_PROMPTS.EXECUTIVE,
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
 * @param {Object} activeFilters - Current active filters
 * @param {Function} onComplete - Called with the generated title string
 * @param {Function} onError - Called with error message
 */
export async function getDynamicDashboardTitle(summaryStats, activeFilters, onComplete, onError) {
  const noop = function() {};
  var filterText = getFilterHeader(activeFilters);

  const userMessage = [
    filterText,
    'Tipe chart: Dashboard Keseluruhan',
    'Data KPI Global:',
    JSON.stringify(summaryStats, null, 2),
    '',
    'Tulis judul utama (headline) deklaratif 1 kalimat untuk halaman dashboard ini yang merangkum performa saat ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'dashboard_headline', stats: summaryStats, activeFilters },
    systemPrompt: SYSTEM_PROMPTS.TITLE,
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
 * @param {Object} activeFilters - Current active filters
 * @param {Function} onComplete - Called with the generated title string
 * @param {Function} onError - Called with error message
 */
export async function generateDynamicTitle(chartData, chartType, activeFilters, onComplete, onError) {
  const noop = function() {};
  var filterText = getFilterHeader(activeFilters);

  const userMessage = [
    filterText,
    'Tipe chart: ' + chartType,
    'Data:',
    JSON.stringify(chartData, null, 2),
    '',
    'Tulis judul deklaratif 1 kalimat untuk chart ini.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'chart_title', chartType, chartData, activeFilters },
    systemPrompt: SYSTEM_PROMPTS.TITLE,
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
 * @param {Object} contextData - Compressed context data
 * @param {Object} activeFilters - Current active filters
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function askCustomQuestion(question, contextData, activeFilters, onChunk, onComplete, onError) {
  var filterText = getFilterHeader(activeFilters);

  var userMessage = [
    filterText,
    '=== KONTEKS DATA (JSON TERKOMPRESI) ===',
    JSON.stringify(contextData, null, 2),
    '',
    '=== PERTANYAAN USER ===',
    question,
  ].join('\n');

  return streamAI({
    systemPrompt: SYSTEM_PROMPTS.CHATBOT,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 3000,
  });
}

// ─────────────────────────────────────────
// PUBLIC API — ANOMALY SUMMARY
// ─────────────────────────────────────────

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
- WAJIB menuliskan angka nominal uang, persentase, dan statistik dalam bentuk angka digital/kuantitatif (contoh: "Rp 1,3 Jt", "Rp 450 Rb", "12,5%", "100 unit").
- DILARANG keras mengeja angka menjadi kata-kata (contoh: JANGAN menulis "satu koma tiga juta rupiah" atau "dua belas persen").
- DILARANG keras menampilkan proses berpikir (thinking process), catatan pengecekan aturan (rule checklist), teks draf internal, atau kata-kata transisi evaluasi (seperti "Checked:", "Final Polish:", "Step:", dll.). Hasil output yang Anda berikan harus LANGSUNG berupa teks laporan naratif final.
`.trim();

/**
 * Generate an aggregate narrative summary of all active anomalies.
 * @param {Array} anomalies
 * @param {Object} activeFilters
 * @param {Function} onChunk
 * @param {Function} onComplete
 * @param {Function} onError
 */
export async function summarizeAnomalies(anomalies, activeFilters, onChunk, onComplete, onError) {
  if (!anomalies || !anomalies.length) {
    onComplete("Tidak ada anomali terdeteksi untuk dirangkum.");
    return;
  }
  var filterText = getFilterHeader(activeFilters);

  const topAnomalies = anomalies.slice(0, 10);

  const anomalyListText = topAnomalies.map(function(a) {
    return '- [' + a.severity.toUpperCase() + '] Tipe: ' + a.type + ', Label: ' + a.label + ', Detail: ' + a.detail;
  }).join('\n');

  const userMessage = [
    filterText,
    'Daftar Anomali Aktif:',
    anomalyListText,
    '',
    'Buat narasi ringkasan AI untuk semua anomali di atas sesuai instruksimu.',
  ].join('\n');

  return cachedStream({
    cacheKey: { type: 'anomaly_summary', anomalies: anomalies.map(a => a.id), activeFilters },
    systemPrompt: PROMPT_ANOMALY_SUMMARY,
    userMessage,
    onChunk,
    onComplete,
    onError,
    maxTokens: 3000,
  });
}

