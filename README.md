# AI Augmented Sales Dashboard

AI Augmented Sales Dashboard adalah platform analisis penjualan interaktif yang dirancang untuk mengidentifikasi deviasi kinerja operasional, menyajikan narasi bisnis yang kontekstual, dan mengoptimalkan pengambilan keputusan berbasis data secara real-time. Dengan mengintegrasikan visualisasi semantik D3.js, mesin deteksi anomali lokal, dan kecerdasan buatan generatif, sistem ini menyajikan visualisasi data yang tidak hanya bersifat deskriptif, melainkan juga preskriptif.

## Fitur Utama

Sistem ini didesain dengan empat pilar arsitektur utama untuk memastikan performa yang efisien, penyajian data yang bermakna, dan interaksi pengguna yang intuitif:

### Mesin Deteksi Anomali Lokal (Math Anomaly Engine)
Sistem melakukan komputasi statistik anomali secara langsung pada sisi klien (*client-side*) menggunakan dua metode utama:
- **Analisis Z-Score**: Mendeteksi pencilan (*outliers*) performa penjualan atau profitabilitas per transaksi/agregasi wilayah berdasarkan deviasi standar dari rata-rata historis.
- **Perubahan Month-over-Month (MoM)**: Mengidentifikasi lonjakan atau penurunan pendapatan bulanan yang tidak wajar di mana bulan terakhir dibandingkan dengan bulan sebelumnya secara dinamis dengan mengabaikan bulan yang belum lengkap datanya secara otomatis.

### Integrasi Kecerdasan Buatan Generatif (Generative AI Integration)
Sistem menggunakan model bahasa besar (seperti Gemini melalui OpenAI SDK) untuk mengabstraksikan kompleksitas data numerik menjadi narasi bahasa alami formal dalam Bahasa Indonesia:
- **Dashboard Headline Dinamis**: Menghasilkan satu kalimat ringkasan tingkat eksekutif yang menyimpulkan performa bisnis saat ini pada judul utama halaman dasbor.
- **Ringkasan Eksekutif CFO**: Menyajikan tiga poin observasi terstruktur (Fakta utama, temuan anomali paling kritis, dan rekomendasi aksi taktis jangka pendek).
- **Insight Grafik Dinamis**: Menganalisis makna di balik visualisasi grafik D3.js tanpa mendeskripsikan ulang komponen visual melainkan menyimpulkan esensi operasionalnya.
- **Chatbot Interaktif**: Memungkinkan pengguna melakukan tanya-jawab analitik (*drill-down*) spesifik secara real-time berdasarkan data JSON terkompresi.

### Visualisasi Semantik D3.js (Semantic D3.js Visualizations)
Visualisasi dibangun menggunakan pustaka D3.js untuk kontrol estetika visual premium dan keresponsifan penuh:
- **Scatter Plot (Korelasi Profitabilitas)**: Memetakan relasi antara total penjualan dan keuntungan per sub-kategori produk untuk mengidentifikasi inefisiensi margin secara visual.
- **Revenue Trend Chart**: Grafik garis dinamis yang menggambarkan performa pendapatan bulanan.
- **Category Profit Chart & Region Margin Chart**: Grafik batang horisontal dan vertikal untuk membandingkan performa antar dimensi kategori produk dan wilayah distribusi.

### Mekanisme Caching Firebase Realtime Database
Untuk menghemat konsumsi token API AI dan mempercepat waktu muat halaman:
- Jawaban analisis AI yang pernah dihasilkan akan di-hash berdasarkan data masukan dan filter aktif pengguna menggunakan fungsi SHA-256 lokal.
- Hasil narasi AI disimpan di Firebase Realtime Database dengan masa kedaluwarsa (TTL) 7 hari, sehingga request serupa tidak memicu panggilan ulang ke model AI.
- Pengaturan filter pengguna disimpan secara otomatis di Firebase node `filter_config/current` agar preferensi visual tidak hilang saat halaman dimuat ulang (*refresh*).

## Tech Stack

Pengembangan aplikasi ini menggunakan kombinasi teknologi modern untuk menjamin performa tinggi dan skalabilitas:
- **Core Framework**: React (dengan Hooks & Context API)
- **Build Tool**: Vite (untuk HMR instan dan optimasi bundel)
- **Styling**: Tailwind CSS v4 (untuk sistem desain antarmuka responsif)
- **Visual Library**: D3.js (pembuatan visualisasi SVG semantik secara mandiri)
- **Backend & Database**: Firebase Realtime Database (untuk caching AI dan penyimpanan konfigurasi filter)
- **AI Integration**: OpenAI SDK (terhubung dengan model Gemini melalui rute proxy server-to-server untuk menghindari CORS)

## Panduan Instalasi

Ikuti langkah-langkah berikut untuk memasang dan menjalankan proyek ini di lingkungan lokal Anda:

### Prasyarat
Pastikan Anda telah memasang [Node.js](https://nodejs.org/) versi 18 atau yang lebih baru pada sistem Anda.

### Langkah-langkah
1. Kloning repositori ini ke komputer lokal Anda:
   ```bash
   git clone https://github.com/Hafidzrdwn/ai-augmented-dashboard.git
   cd ai-augmented-dashboard
   ```

2. Pasang semua dependensi proyek:
   ```bash
   npm install
   ```

3. Buat file `.env` di direktori akar proyek Anda. Anda dapat menyalin konfigurasi dari contoh berikut:
   ```env
   # Firebase Web Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id

   # AI Integration Configuration (Local Proxy to Avoid CORS)
   VITE_AI_BASE_URL=/api-ai
   VITE_AI_API_KEY=your_gemini_or_openai_api_key
   VITE_AI_MODEL=gemini-3-flash
   ```

4. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara otomatis di rute `http://localhost:5173`.

## Arsitektur Data Storytelling (SCR Framework)

Tata letak halaman dashboard ini disusun secara sistematis berdasarkan struktur jurnalisme data klasik **Situation-Complication-Resolution (SCR)** untuk menuntun alur kognitif pengguna secara bertahap:

- **Situation (Setup)**: Bagian atas dasbor menyajikan situasi bisnis terkini secara objektif. Ini diwakili oleh judul utama (headline) dasbor dinamis, bar kontrol filter, dan baris KPI Card (Total Revenue, Total Profit, Profit Margin, Rata-rata Diskon) untuk memberikan ringkasan status operasi bisnis.
- **Complication (Conflict)**: Bagian tengah menyajikan komplikasi operasional melalui panel deteksi anomali matematis dan empat visualisasi grafik D3.js. Di sini pengguna dihadapkan pada "konflik data" berupa tren penurunan performa regional, pencilan profit negatif produk, atau peningkatan rasio transaksi terdiskon.
- **Resolution (Solution)**: Bagian bawah dasbor menyediakan ruang resolusi. AI Executive Summary bertindak sebagai VP of Data Analytics yang memberikan rekomendasi aksi jangka pendek yang taktis, sementara chatbot interaktif di sisi kanan memandu eksplorasi resolusi yang mendalam melalui tanya-jawab berbasis konteks data terkompresi.

## Refleksi Konseptual

Komputasi deteksi anomali secara sengaja dilakukan pada data yang telah diagregasi di sisi klien (*client-side aggregated data*) alih-alih data mentah transaksi (*raw transaction data*). Hal ini didasari pada prinsip efisiensi komputasi dan relevansi operasional bisnis. Mengolah ribuan baris data transaksi mentah di sisi klien setiap kali pengguna menggeser slider ambang batas parameter (Z-Score/MoM) akan membebani memori browser dan menurunkan responsivitas interaksi. Dengan melakukan agregasi data terlebih dahulu berdasarkan dimensi waktu (bulan), kategori produk, atau wilayah, volume data yang perlu diproses secara matematis berkurang hingga 95%. Ini meminimalkan latensi eksekusi algoritma dan memastikan visualisasi grafik D3.js dapat dirender ulang secara instan pada frekuensi 60fps, sekaligus menyingkirkan derau (*noise*) transaksi individual yang tidak signifikan secara strategis bagi para pengambil keputusan tingkat eksekutif.

Di dalam arsitektur sistem ini, kecerdasan buatan (Generative AI) diposisikan secara ketat sebagai **lapisan interpretatif semantik (*semantic interpretive layer*)** dan bukan sebagai pemproses kalkulasi matematika mentah. Menyerahkan operasi aritmetika dasar atau kalkulasi statistik agregat langsung kepada model bahasa besar (LLM) merupakan kesalahan arsitektur karena kerentanan model terhadap halusinasi matematika dan tingginya biaya token API untuk memproses data berukuran besar. Oleh karena itu, semua kalkulasi angka nominal, persentase pertumbuhan, margin profitabilitas, dan deteksi anomali dihitung secara deterministik oleh kode Javascript lokal. AI kemudian menerima hasil komputasi yang telah terkompresi secara efisien untuk diterjemahkan menjadi narasi bisnis yang kontekstual, terarah, dan mudah dicerna oleh eksekutif. Pendekatan hibrida ini menjamin akurasi angka 100% karena berbasis perhitungan matematis presisi, sekaligus memangkas biaya token hingga 90% melalui teknik kompresi konteks data.
