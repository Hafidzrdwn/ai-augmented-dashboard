import { NavLink } from 'react-router-dom';
import { COLOR, FONT } from '../../styles/tokens';

export default function PageHeader() {
  function navStyle(isActive) {
    return {
      fontSize:       '12.5px',
      color:          isActive ? COLOR.accent : COLOR.textPrimary,
      textDecoration: 'none',
      fontWeight:     600,
      padding:        '6px 12px',
      borderRadius:   '6px',
      background:     isActive ? COLOR.accentMuted : 'transparent',
      border:         '1px solid ' + (isActive ? COLOR.accent : 'transparent'),
      display:        'flex',
      alignItems:     'center',
      gap:            '6px',
      transition:     'all 0.15s ease',
      fontFamily:     FONT.sans,
    };
  }

  return (
    <header style={{
      background:     COLOR.surface,
      borderBottom:   '1px solid ' + COLOR.border,
      padding:        '0 24px',
      height:         '56px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      position:       'sticky',
      top:            0,
      zIndex:         100,
      boxShadow:      '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width:        '22px',
          height:       '22px',
          background:   COLOR.accent,
          borderRadius: '5px',
          flexShrink:   0,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          color:        '#fff',
          fontSize:     '11px',
          fontWeight:   'bold',
          fontFamily:   FONT.mono,
        }}>
          AI
        </div>
        <span style={{
          fontFamily:    FONT.mono,
          fontSize:      '14px',
          fontWeight:    700,
          color:         COLOR.textPrimary,
          letterSpacing: '-0.02em',
        }}>
          AI Augmented Dashboard
        </span>
      </div>

      {/* Navigation & Developer Info wrapper */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Nav Links */}
        <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <NavLink to="/" end style={function(props) { return navStyle(props.isActive); }}>
            <span>📊</span> Dasbor Utama D3
          </NavLink>
          <NavLink to="/tableau" style={function(props) { return navStyle(props.isActive); }}>
            <span>📈</span> Tableau Board
          </NavLink>
        </nav>

        {/* Vertical divider */}
        <div style={{ width: '1px', height: '16px', background: COLOR.border }} />

        {/* Developer Credit Link */}
        <a 
          href="https://github.com/Hafidzrdwn" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: COLOR.textSecondary,
            textDecoration: 'none',
            border: '1px solid ' + COLOR.border,
            padding: '5px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fff',
            fontWeight: 500,
            fontFamily: FONT.sans,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={function(e) {
            e.currentTarget.style.borderColor = COLOR.accent;
            e.currentTarget.style.color = COLOR.accent;
          }}
          onMouseLeave={function(e) {
            e.currentTarget.style.borderColor = COLOR.border;
            e.currentTarget.style.color = COLOR.textSecondary;
          }}
        >
          <span>👤</span> Hafidz Ridwan Cahya
        </a>
      </div>
    </header>
  );
}
