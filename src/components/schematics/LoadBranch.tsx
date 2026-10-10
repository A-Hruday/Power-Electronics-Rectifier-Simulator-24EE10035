import React from 'react';
import { LoadType } from '../../types/powerElectronics';
import { CurrentArrow } from './CurrentArrow';

interface LoadBranchProps {
  x: number;
  y: number;
  loadType: LoadType;
  resistance: number;
  inductance: number;
  backEmf: number;
  freewheelingDiode: boolean;
  isFwdConducting?: boolean;
  isLoadActive?: boolean;
  onToggleFwd?: () => void;
}

export const LoadBranch: React.FC<LoadBranchProps> = ({
  x,
  y,
  loadType,
  resistance,
  inductance,
  backEmf,
  freewheelingDiode,
  isFwdConducting = false,
  isLoadActive = false,
  onToggleFwd,
}) => {
  const wireColor = isLoadActive ? '#10b981' : '#475569';
  const fwdWireColor = isFwdConducting ? '#10b981' : freewheelingDiode ? '#475569' : '#334155';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Load box frame */}
      <rect
        x="0"
        y="0"
        width="110"
        height="180"
        rx="8"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <text
        x="55"
        y="18"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        LOAD ({loadType})
      </text>

      {/* Top terminal */}
      <circle cx="55" cy="0" r="3" fill="#cbd5e1" />
      <line
        x1="55"
        y1="0"
        x2="55"
        y2="28"
        stroke={wireColor}
        strokeWidth="2"
        className={isLoadActive ? 'wire-animated' : undefined}
      />

      {/* Load Current Flow Arrow Downwards */}
      {isLoadActive && (
        <CurrentArrow x={55} y={22} direction="down" label="i_o" color="#10b981" />
      )}

      {/* Resistor R (zigzag) */}
      <g transform="translate(55, 32)">
        <path
          d="M 0,0 L -8,4 L 8,10 L -8,16 L 8,22 L -8,28 L 8,34 L 0,38"
          fill="none"
          stroke={isLoadActive ? '#34d399' : '#cbd5e1'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <text
          x="14"
          y="22"
          fill="#e2e8f0"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          R={resistance}Ω
        </text>
      </g>

      {/* Inductor L (coils) if RL or RLE */}
      {loadType !== 'R' ? (
        <g transform="translate(55, 78)">
          <line
            x1="0"
            y1="-8"
            x2="0"
            y2="0"
            stroke={wireColor}
            strokeWidth="2"
            className={isLoadActive ? 'wire-animated' : undefined}
          />
          <path
            d="M 0,0 C 14,-4 14,10 0,10 C 14,6 14,20 0,20 C 14,16 14,30 0,30 C 14,26 14,40 0,40"
            fill="none"
            stroke={isLoadActive ? '#38bdf8' : '#94a3b8'}
            strokeWidth="2.2"
          />
          <text
            x="14"
            y="24"
            fill="#e2e8f0"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            L={inductance}mH
          </text>
        </g>
      ) : (
        <line
          x1="55"
          y1="70"
          x2="55"
          y2="120"
          stroke={wireColor}
          strokeWidth="2"
          className={isLoadActive ? 'wire-animated' : undefined}
        />
      )}

      {/* DC Back-EMF E if RLE */}
      {loadType === 'RLE' && (
        <g transform="translate(55, 126)">
          <line
            x1="0"
            y1="-8"
            x2="0"
            y2="0"
            stroke={wireColor}
            strokeWidth="2"
            className={isLoadActive ? 'wire-animated' : undefined}
          />
          {/* Long line (+) */}
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="-18" y="2" fill="#f59e0b" fontSize="9" fontWeight="bold">
            +
          </text>
          {/* Short line (-) */}
          <line x1="-7" y1="6" x2="7" y2="6" stroke="#94a3b8" strokeWidth="2" />
          <text x="-18" y="9" fill="#94a3b8" fontSize="9" fontWeight="bold">
            -
          </text>
          <line
            x1="0"
            y1="6"
            x2="0"
            y2="16"
            stroke={wireColor}
            strokeWidth="2"
            className={isLoadActive ? 'wire-animated' : undefined}
          />
          <text
            x="14"
            y="6"
            fill="#f59e0b"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            E={backEmf}V
          </text>
        </g>
      )}

      {/* Bottom terminal */}
      <line
        x1="55"
        y1={loadType === 'RLE' ? 142 : loadType === 'RL' ? 120 : 70}
        x2="55"
        y2="180"
        stroke={wireColor}
        strokeWidth="2"
        className={isLoadActive ? 'wire-animated' : undefined}
      />
      <circle cx="55" cy="180" r="3" fill="#cbd5e1" />

      {/* Free-Wheeling Diode (FWD) Branch on side */}
      <g
        transform="translate(-40, 20)"
        className="cursor-pointer group"
        onClick={onToggleFwd}
      >
        {/* Wire connection to top */}
        <line
          x1="0"
          y1="-20"
          x2="0"
          y2="30"
          stroke={fwdWireColor}
          strokeWidth="1.8"
          strokeDasharray={isFwdConducting ? '5 3' : freewheelingDiode ? undefined : '3 3'}
          className={isFwdConducting ? 'wire-animated' : undefined}
        />
        {/* Top junction line to main terminal */}
        <line
          x1="0"
          y1="-20"
          x2="95"
          y2="-20"
          stroke={fwdWireColor}
          strokeWidth="1.8"
          strokeDasharray={isFwdConducting ? '5 3' : freewheelingDiode ? undefined : '3 3'}
          className={isFwdConducting ? 'wire-animated' : undefined}
        />
        <circle cx="95" cy="-20" r="2.5" fill={isFwdConducting ? '#10b981' : freewheelingDiode ? '#cbd5e1' : '#475569'} />

        {/* Diode body pointing UP (anti-parallel across load) */}
        <g
          transform="translate(0, 70)"
          opacity={freewheelingDiode ? 1 : 0.35}
        >
          {/* Anode lead at bottom */}
          <line
            x1="0"
            y1="18"
            x2="0"
            y2="8"
            stroke={isFwdConducting ? '#10b981' : '#94a3b8'}
            strokeWidth="2"
            className={isFwdConducting ? 'wire-animated' : undefined}
          />
          {/* Diode Triangle base at y=8, apex pointing UP to y=-8 */}
          <polygon
            points="-10,8 10,8 0,-8"
            fill={isFwdConducting ? 'rgba(16, 185, 129, 0.3)' : '#1e293b'}
            stroke={isFwdConducting ? '#10b981' : '#94a3b8'}
            strokeWidth="1.8"
          />
          {/* Cathode Bar at top y=-8 */}
          <line
            x1="-10"
            y1="-8"
            x2="10"
            y2="-8"
            stroke={isFwdConducting ? '#10b981' : '#94a3b8'}
            strokeWidth="2"
          />
          {/* Cathode lead to top rail */}
          <line
            x1="0"
            y1="-8"
            x2="0"
            y2="-18"
            stroke={isFwdConducting ? '#10b981' : '#94a3b8'}
            strokeWidth="2"
            className={isFwdConducting ? 'wire-animated' : undefined}
          />
        </g>

        {/* Wire connection to bottom */}
        <line
          x1="0"
          y1="90"
          x2="0"
          y2="160"
          stroke={fwdWireColor}
          strokeWidth="1.8"
          strokeDasharray={isFwdConducting ? '5 3' : freewheelingDiode ? undefined : '3 3'}
          className={isFwdConducting ? 'wire-animated' : undefined}
        />

        {/* FWD Current Flow Direction Arrows */}
        {isFwdConducting && (
          <>
            <CurrentArrow x={0} y={40} direction="up" label="i_fwd" color="#34d399" />
            <CurrentArrow x={50} y={-20} direction="right" color="#34d399" />
            <CurrentArrow x={50} y={160} direction="left" color="#34d399" />
          </>
        )}

        {/* Bottom junction line to main terminal */}
        <line
          x1="0"
          y1="160"
          x2="95"
          y2="160"
          stroke={fwdWireColor}
          strokeWidth="1.8"
          strokeDasharray={isFwdConducting ? '5 3' : freewheelingDiode ? undefined : '3 3'}
          className={isFwdConducting ? 'wire-animated' : undefined}
        />
        <circle cx="95" cy="160" r="2.5" fill={isFwdConducting ? '#10b981' : freewheelingDiode ? '#cbd5e1' : '#475569'} />

        {/* FWD Label */}
        <text
          x="-6"
          y="68"
          textAnchor="end"
          fill={freewheelingDiode ? '#38bdf8' : '#64748b'}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          {freewheelingDiode ? 'FWD' : '(FWD off)'}
        </text>
        {isFwdConducting && (
          <text
            x="-6"
            y="80"
            textAnchor="end"
            fill="#10b981"
            fontSize="8"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            ● LOOP
          </text>
        )}
      </g>
    </g>
  );
};
