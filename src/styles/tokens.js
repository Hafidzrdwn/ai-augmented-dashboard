// src/styles/tokens.js

export const COLOR = {
  // Semantic data colors — the ONLY colors used in D3 charts
  neutral:   '#9CA3AF',  // Gray  — normal, baseline data
  negative:  '#EF4444',  // Red   — anomaly, loss, risk
  positive:  '#2563EB',  // Blue  — opportunity, highlight

  // UI Shell (Light Mode)
  bg:        '#F9FAFB',  // light gray, near-white
  surface:   '#FFFFFF',  // card backgrounds
  border:    '#E5E7EB',  // dividers, card outlines
  textPrimary:   '#111827', // dark text
  textSecondary: '#4B5563', // secondary text
  textMuted:     '#9CA3AF', // muted text

  // Accent — used ONLY for interactive elements (buttons, active states)
  accent:    '#2563EB',
  accentMuted: 'rgba(37,99,235,0.12)',
};

export const FONT = {
  sans: "'Poppins', system-ui, sans-serif",
};

export const CHART = {
  height: 260,
  marginTop: 24,
  marginRight: 16,
  marginBottom: 40,
  marginLeft: 52,
};
