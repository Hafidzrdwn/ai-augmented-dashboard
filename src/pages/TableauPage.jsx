import { Link } from 'react-router-dom'
import { COLOR } from '../styles/tokens'

const TABLEAU_URL = 'https://public.tableau.com/views/YOUR_VIZ_URL/Sheet1?:showVizHome=no&:embed=true'

export default function TableauPage() {
  return (
    <div style={{ minHeight: '100vh', background: COLOR.bg, padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link
          to="/"
          style={{
            color: COLOR.textSecondary,
            textDecoration: 'none',
            fontSize: '13px',
            border: `1px solid ${COLOR.border}`,
            padding: '4px 10px',
            borderRadius: '3px',
            transition: 'all 0.2s'
          }}
        >
          ← Kembali
        </Link>
        <h1 style={{ color: COLOR.textPrimary, fontSize: '15px', fontWeight: 600, margin: 0 }}>
          Tableau Public — Analisis Interaktif
        </h1>
      </div>
      <iframe
        title="Tableau Dashboard"
        src={TABLEAU_URL}
        width="100%"
        height="800px"
        style={{ border: `1px solid ${COLOR.border}`, borderRadius: '2px' }}
        allowFullScreen
      />
    </div>
  )
}
