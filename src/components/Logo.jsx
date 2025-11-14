import React from 'react';
import './Logo.css';

function Logo({ size = 24, showText = true, className = '' }) {
  return (
    <div className={`logo-container ${className}`}>
      <div className="logo-icon">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-layer-1"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-layer-2"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="#ff8c00"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-layer-3"
          />
        </svg>
      </div>
      {showText && <span className="logo-text">SnapSetup</span>}
    </div>
  );
}

export default Logo;