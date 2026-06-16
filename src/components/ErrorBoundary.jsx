import { Component } from 'react';
import { COLOR } from '../styles/tokens';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: COLOR.surface,
          border: `1px solid ${COLOR.negative}`,
          borderLeft: `3px solid ${COLOR.negative}`,
          borderRadius: '2px',
          padding: '16px',
          color: COLOR.textSecondary,
          fontSize: '12px',
        }}>
          <strong style={{ color: COLOR.negative, display: 'block', marginBottom: '4px' }}>
            Komponen gagal dimuat
          </strong>
          {this.state.error?.message ?? 'Terjadi kesalahan tak terduga.'}
        </div>
      );
    }
    return this.props.children;
  }
}
