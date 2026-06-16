import { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { askCustomQuestion } from '../../services/aiService';
import { runAnomalyEngine } from '../../utils/anomalyEngine';

const isQuestionOnTopic = (q) => {
  const query = q.toLowerCase();
  const keywords = [
    'sales', 'revenue', 'profit', 'margin', 'diskon', 'discount', 'anomali', 'anomaly', 
    'wilayah', 'region', 'kategori', 'category', 'produk', 'product', 'performa', 
    'kinerja', 'grafik', 'chart', 'data', 'kpi', 'transaksi', 'order', 'tumbuh', 
    'turun', 'naik', 'rugi', 'loss', 'untung', 'gain', 'bulan', 'month', 'tahun', 'year',
    'mom', 'z-score', 'z-skor', 'skor', 'threshold', 'parameter', 'sensitivitas', 'wilayah',
    'kota', 'city', 'segmen', 'segment', 'tertinggi', 'terendah', 'terbesar', 'terkecil',
    'rata-rata', 'mean', 'average', 'analisis', 'summary', 'ringkasan', 'laporan', 'report',
    'mengapa', 'kenapa', 'bagaimana', 'apa', 'berapa'
  ];
  const hasKeyword = keywords.some(k => query.includes(k));
  if (hasKeyword) return true;

  const greetings = ['halo', 'hai', 'hello', 'hi', 'pagi', 'siang', 'sore', 'malam', 'tanya', 'bantu'];
  const isGreeting = greetings.some(g => query.trim() === g);
  if (isGreeting) return true;

  return false;
};

export default function CustomQuestionChat() {
  const { summaryStats, filteredData, rawData, regionFilter, zScoreThreshold, momThreshold } = useDashboard();
  
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Halo. Ada pertanyaan spesifik tentang data di atas? Tanyakan pada saya.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (messages.length > 1 && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const submitQuestion = async (questionText) => {
    if (!questionText.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: questionText }]);
    setLoading(true);

    if (!isQuestionOnTopic(questionText)) {
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);
      
      setTimeout(() => {
        const fullText = 'Maaf, sebagai analis data bisnis Anda, saya hanya dapat membantu menjawab pertanyaan terkait performa penjualan, profitabilitas, anomali, dan visualisasi data yang tertera pada dasbor ini. Silakan ajukan pertanyaan yang relevan.';
        let i = 0;
        const interval = setInterval(() => {
          const chunk = fullText.slice(i, i + 8);
          if (chunk) {
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].text = fullText.slice(0, i + chunk.length);
              return newMsgs;
            });
          }
          i += 8;
          if (i >= fullText.length) {
            clearInterval(interval);
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].isStreaming = false;
              return newMsgs;
            });
            setLoading(false);
          }
        }, 18);
      }, 600);
      return;
    }

    setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);

    const anomalies = runAnomalyEngine(filteredData, rawData, zScoreThreshold, momThreshold);
    const contextData = { summaryStats, anomalies, regionFilter };

    await askCustomQuestion(
      questionText,
      contextData,
      (chunk, full) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = full;
          return newMsgs;
        });
      },
      (full) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = full;
          newMsgs[newMsgs.length - 1].isStreaming = false;
          return newMsgs;
        });
        setLoading(false);
      },
      (errMsg) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = `Error: ${errMsg}`;
          newMsgs[newMsgs.length - 1].isStreaming = false;
          newMsgs[newMsgs.length - 1].isError = true;
          return newMsgs;
        });
        setLoading(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userQ = input.trim();
    setInput('');
    submitQuestion(userQ);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm h-[520px]">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
        <h2 className="text-sm font-semibold text-slate-900 m-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse"></span>
          Tanya Data (Chatbot)
        </h2>
      </div>

      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : msg.isError 
                    ? 'bg-red-50 text-red-600 rounded-bl-none border border-red-100'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
              } ${msg.isStreaming ? 'cursor-blink' : ''}`}
            >
              {msg.text ? msg.text : msg.isStreaming ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-xs text-slate-400 font-mono italic mr-1">Berpikir</span>
                  <span className="dot-bounce bg-blue-600" style={{ animationDelay: '0ms' }} />
                  <span className="dot-bounce bg-blue-600" style={{ animationDelay: '150ms' }} />
                  <span className="dot-bounce bg-blue-600" style={{ animationDelay: '300ms' }} />
                </div>
              ) : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/20 flex flex-col gap-2.5">
        {/* Pinned quick access bubbles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Cepat:</span>
          {[
            { label: 'Prioritas profit?', q: 'Kategori produk apa yang menjadi pilar utama profitabilitas?' },
            { label: 'Masalah region?', q: 'Wilayah mana yang memiliki profit margin terendah?' },
            { label: 'Tren MoM?', q: 'Bagaimana perbandingan performa MoM bulan terakhir?' },
            { label: 'Info anomali?', q: 'Apa saja anomali performa terbesar saat ini?' }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => submitQuestion(item.q)}
              disabled={loading}
              className="text-[11px] bg-white hover:bg-blue-50/50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-xl px-3 py-1.5 transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              💡 {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Tanya mengapa profit turun, anomali terbesar, dll..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
              !input.trim() || loading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm hover:shadow-md'
            }`}
          >
            <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
