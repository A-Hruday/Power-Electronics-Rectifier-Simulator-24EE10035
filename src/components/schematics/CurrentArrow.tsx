import React from 'react';

interface CurrentArrowProps {
  x: number;
  y: number;
  direction: 'right' | 'left' | 'up' | 'down';
  color?: string;
  size?: number;
  label?: string;
}

export const CurrentArrow: React.FC<CurrentArrowProps> = ({
  x,
  y,
  direction,
  color = '#10b981',
  size = 7.5,
  label,
}) => {
  let rotation = 0;
  if (direction === 'down') rotation = 90;
  else if (direction === 'left') rotation = 180;
  else if (direction === 'up') rotation = -90;

  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none select-none">
      {/* Background beacon glow */}
      <circle cx="0" cy="0" r={size * 1.5} fill={color} opacity="0.15" />
      
      {/* Arrow polygon */}
      <polygon
        points={`-${size},-${size * 0.75} ${size * 1.3},0 -${size},${size * 0.75}`}
        fill={color}
        transform={`rotate(${rotation})`}
        className="drop-shadow-[0_0_6px_rgba(16,185,129,0.95)]"
      />
      {label && (
        <text
          x={direction === 'down' || direction === 'up' ? 12 : 0}
          y={direction === 'right' || direction === 'left' ? -9 : 3.5}
          fill={color}
          fontSize="9"
          fontWeight="800"
          fontFamily="ui-monospace, monospace"
          textAnchor={direction === 'down' || direction === 'up' ? 'start' : 'middle'}
          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        >
          {label}
        </text>
      )}
    </g>
  );
};
