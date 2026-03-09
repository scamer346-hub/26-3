
import React from 'react';

const AIIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ai-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" /> 
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <g fill="url(#ai-icon-gradient)">
      <path d="M12 2 Q 12 12, 2 12 Q 12 12, 12 22 Q 12 12, 22 12 Q 12 12, 12 2 Z" />
      <path d="M19 4 L19 6 L21 6 L21 7 L19 7 L19 9 L18 9 L18 7 L16 7 L16 6 L18 6 L18 4 Z" />
      <circle cx="6" cy="19" r="1.5" />
    </g>
  </svg>
);

export default AIIcon;
