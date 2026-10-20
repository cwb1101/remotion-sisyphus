import React from 'react';

/** 3:4 竖版画布（1080×1440） */
export const Stage3x4: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1440} viewBox="0 0 1080 1440" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    {children}
  </svg>
);
