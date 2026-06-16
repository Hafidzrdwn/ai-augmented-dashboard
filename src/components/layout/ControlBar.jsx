import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

function SliderField({ label, value, min, max, step, unit, onChange, formatValue, helperText }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[240px] flex-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-slate-900 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
          {formatValue ? formatValue(value) : (value + (unit || ''))}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
      />
      {helperText && (
        <span className="text-[10px] text-slate-400 leading-normal">
          {helperText}
        </span>
      )}
    </div>
  );
}

function DropdownField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[130px] flex-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 group-hover:border-slate-300 text-slate-800 font-sans text-xs rounded-lg py-2 pl-3 pr-8 outline-none cursor-pointer appearance-none transition-all duration-150"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'All' ? 'Semua ' + label : opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 text-[10px] transition-colors">
          ▼
        </div>
      </div>
    </div>
  );
}

export default function ControlBar() {
  const {
    regionFilter,       setRegionFilter,
    categoryFilter,     setCategoryFilter,
    subCategoryFilter,  setSubCategoryFilter,
    segmentFilter,      setSegmentFilter,
    cityFilter,         setCityFilter,
    zScoreThreshold,    setZScoreThreshold,
    momThreshold,       setMomThreshold,
    REGIONS,
    CATEGORIES,
    SUB_CATEGORIES,
    SEGMENTS,
    CITIES,
  } = useDashboard();

  const [localZScore, setLocalZScore] = useState(zScoreThreshold);
  const [localMom, setLocalMom] = useState(momThreshold);

  useEffect(() => {
    setLocalZScore(zScoreThreshold);
  }, [zScoreThreshold]);

  useEffect(() => {
    setLocalMom(momThreshold);
  }, [momThreshold]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setZScoreThreshold(localZScore);
    }, 600);
    return () => clearTimeout(handler);
  }, [localZScore, setZScoreThreshold]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setMomThreshold(localMom);
    }, 600);
    return () => clearTimeout(handler);
  }, [localMom, setMomThreshold]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-md shadow-slate-100/50 flex flex-col gap-5">
      <div className="flex flex-wrap gap-4 items-end">
        <DropdownField
          label="Wilayah"
          value={regionFilter}
          onChange={setRegionFilter}
          options={REGIONS}
        />
        <DropdownField
          label="Kategori"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORIES}
        />
        <DropdownField
          label="Sub-Kategori"
          value={subCategoryFilter}
          onChange={setSubCategoryFilter}
          options={SUB_CATEGORIES}
        />
        <DropdownField
          label="Segmen"
          value={segmentFilter}
          onChange={setSegmentFilter}
          options={SEGMENTS}
        />
        <DropdownField
          label="Kota"
          value={cityFilter}
          onChange={setCityFilter}
          options={CITIES}
        />
      </div>

      <div className="h-px bg-slate-100 w-full" />

      {/* Threshold sliders & status */}
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex flex-wrap gap-6 flex-1 min-w-[300px]">
          <SliderField
            label="Ambang Z-Score"
            value={localZScore}
            min={0.5} max={3.0} step={0.1}
            formatValue={v => v.toFixed(1) + 'σ'}
            onChange={setLocalZScore}
            helperText="σ (Standar Deviasi): Menyesuaikan sensitivitas deviasi profit bulanan kategori. Nilai lebih rendah mendeteksi lebih banyak anomali kecil."
          />
          <SliderField
            label="Ambang Penurunan MoM"
            value={localMom}
            min={5} max={50} step={5}
            unit="%"
            onChange={setLocalMom}
            helperText="MoM (Month-over-Month): Batas persentase penurunan pendapatan beruntun. Nilai lebih rendah mendeteksi penurunan bulanan yang lebih kecil."
          />
        </div>

        <div className="flex items-center gap-2.5 bg-blue-50/50 border border-blue-100/50 rounded-full px-3.5 py-1.5 shrink-0 self-center">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
          <span className="text-xs font-semibold text-blue-800">
            Analitik AI Aktif
          </span>
        </div>
      </div>
    </div>
  );
}
