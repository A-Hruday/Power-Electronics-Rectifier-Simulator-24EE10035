import React from 'react';
import { SwitchType } from '../../types/powerElectronics';

interface SwitchSymbolProps {
  x: number;
  y: number;
  id: string;
  name: string;
  type: SwitchType;
  orientation?: 'up' | 'down' | 'right' | 'left';
  isConducting?: boolean;
  firingAngleDeg?: number;
  onToggleType: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  labelPosition?: 'right' | 'left' | 'top' | 'bottom';
  probedVoltage?: number;
}

export const SwitchSymbol: React.FC<SwitchSymbolProps> = ({
  x,
  y,
  id,
  name,
  type,
  orientation = 'up',
  isConducting = false,
  firingAngleDeg = 0,
  onToggleType,
  onSelect,
  isSelected = false,
  labelPosition = 'right',
  probedVoltage,
}) => {
  // Base symbol is defined pointing UP (Anode at bottom y=24, Cathode at top y=-24)
  let rotation = 0;
  if (orientation === 'down') rotation = 180;
  else if (orientation === 'right') rotation = 90;
  else if (orientation === 'left') rotation = -90;

  const isThyristor = type === 'thyristor';

  const strokeColor = isConducting
    ? '#10b981' // Vibrant Emerald when conducting
    : isSelected
    ? '#f43f5e' // Rose red when probed
    : '#94a3b8'; // Slate when blocking

  const fillColor = isConducting
    ? 'rgba(16, 185, 129, 0.3)'
    : isSelected
    ? 'rgba(244, 63, 94, 0.25)'
    : '#1e293b';

  let labelX = 24;
  let labelY = -14;
  if (labelPosition === 'left') {
    labelX = -75;
    labelY = -14;
  } else if (labelPosition === 'top') {
    labelX = -32;
    labelY = -48;
  } else if (labelPosition === 'bottom') {
    labelX = -32;
    labelY = 24;
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer group select-none"
      onClick={(e) => {
        e.stopPropagation();
        // Restore previous method: clicking switch toggles between Diode and Thyristor
        onToggleType(id);
      }}
    >
      {/* Click target bounding box */}
      <rect
        x="-32"
        y="-32"
        width="64"
        height="64"
        rx="8"
        fill="transparent"
        className="group-hover:fill-cyan-500/10 transition-colors"
      />

      {/* Switch label & badge */}
      <g transform={`translate(${labelX}, ${labelY})`}>
        <text
          x="0"
          y="0"
          fill={isSelected ? '#fb7185' : isConducting ? '#34d399' : '#e2e8f0'}
          fontSize="11"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          className="tracking-tight"
        >
          {name}
        </text>

        {/* Device type toggle button - Click toggles Diode vs Thyristor directly */}
        <g
          transform="translate(0, 4)"
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onToggleType(id);
          }}
        >
          <title>{`Click to switch between Diode and Thyristor (SCR)`}</title>
          <rect x="-2" y="2" width="62" height="13" rx="3" fill="#0f172a" stroke={isThyristor ? '#0284c7' : '#334155'} strokeWidth="1.2" />
          <text
            x="29"
            y="11"
            fill={isThyristor ? '#38bdf8' : '#a1a1aa'}
            fontSize="8"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            {isThyristor ? `SCR α=${firingAngleDeg}°` : 'DIODE'}
          </text>
        </g>

        {/* Conduction or Probe indicator */}
        {isSelected ? (
          <g
            transform="translate(0, 23)"
            className="cursor-pointer hover:brightness-125 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              // Clicking probed badge unselects / clears the probe
              if (onSelect) onSelect(id);
            }}
          >
            <title>Click to UNSELECT / REMOVE voltage probe</title>
            <rect x="-4" y="-1" width="70" height="15" rx="3" fill="#881337" stroke="#f43f5e" strokeWidth="1.4" />
            <text
              x="31"
              y="10"
              fill="#fecdd3"
              fontSize="8"
              fontWeight="bold"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              v_AK: {(probedVoltage ?? 0) >= 0 ? '+' : ''}{(probedVoltage ?? 0).toFixed(1)}V ✕
            </text>
          </g>
        ) : (
          <g transform="translate(0, 23)" className="flex items-center">
            {/* Status text (ON or OFF) */}
            <text
              x="0"
              y="9"
              fill={isConducting ? '#10b981' : '#64748b'}
              fontSize="8"
              fontWeight={isConducting ? '700' : '500'}
              fontFamily="ui-monospace, monospace"
            >
              {isConducting ? '● ON' : '○ OFF'}
            </text>
            {/* Dedicated Probe Pin Button to select for knowing block */}
            <g
              transform="translate(34, -1)"
              className="cursor-pointer hover:opacity-100 opacity-70 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(id);
              }}
            >
              <title>{`Probe ${name} (measure v_AK & examine blocking state)`}</title>
              <rect x="0" y="0" width="30" height="12" rx="2.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
              <text
                x="15"
                y="8.5"
                fill="#cbd5e1"
                fontSize="7.5"
                fontWeight="bold"
                fontFamily="ui-monospace, monospace"
                textAnchor="middle"
              >
                🔍v
              </text>
            </g>
          </g>
        )}
      </g>

      {/* Switch Symbol body rotated */}
      <g transform={`rotate(${rotation})`}>
        {/* Anode lead (at bottom) */}
        <line
          x1="0"
          y1="24"
          x2="0"
          y2="10"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Cathode lead (at top) */}
        <line
          x1="0"
          y1="-10"
          x2="0"
          y2="-24"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Diode Triangle (Anode base at bottom y=10, apex pointing UP to cathode at y=-10) */}
        <polygon
          points="-12,10 12,10 0,-10"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
          className="transition-all duration-150"
        />

        {/* Cathode Bar (horizontal at top y=-10) */}
        <line
          x1="-13"
          y1="-10"
          x2="13"
          y2="-10"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Thyristor Gate Lead (angled off side towards terminal) */}
        {isThyristor && (
          <g>
            <path
              d="M 6,-4 L 16,6 L 22,6"
              fill="none"
              stroke={isConducting ? '#34d399' : '#38bdf8'}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="22"
              cy="6"
              r="2.5"
              fill={isConducting ? '#34d399' : '#38bdf8'}
            />
            <text
              x="25"
              y="9"
              fill="#38bdf8"
              fontSize="8"
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
            >
              G
            </text>
          </g>
        )}
      </g>

      {/* Multimeter Probed indicator halo */}
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          r="22"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="1.8"
          strokeDasharray="4 2"
          className="animate-spin"
          style={{ animationDuration: '6s' }}
        />
      )}

      {/* Conducting glow aura */}
      {isConducting && (
        <circle
          cx="0"
          cy="0"
          r="18"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="animate-spin"
          style={{ animationDuration: '4s' }}
        />
      )}
    </g>
  );
};
