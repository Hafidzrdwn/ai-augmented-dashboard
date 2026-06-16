import { COLOR } from '../../styles/tokens';

export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        backgroundColor: COLOR.border, 
        borderRadius: '4px',
        ...style
      }}
    />
  );
}
