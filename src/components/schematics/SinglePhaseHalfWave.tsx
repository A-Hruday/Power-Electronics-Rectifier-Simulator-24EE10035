import React from 'react';
import { CircuitParameters } from '../../types/powerElectronics';
import { LoadBranch } from './LoadBranch';
import { SwitchSymbol } from './SwitchSymbol';
import { CurrentArrow } from './CurrentArrow';

interface SinglePhaseHalfWaveProps {
  params: CircuitParameters;
  conductingSwitches: string[];
  instantaneousVs: number;
  instantaneousVo: number;
  instantaneousIo: number;
  onToggleSwitch: (switchId: string) => void;
  onToggleFwd: () => void;
  probedSwitchId?: string;
  onSelectProbeSwitch?: (switchId: string) => void;
  switchVoltages?: Record<string, number>;
}

export const SinglePhaseHalfWave: React.FC<SinglePhaseHalfWaveProps> = ({
  params,
  conductingSwitches,
  instantaneousVs,
  instantaneousVo,
  instantaneousIo,
  onToggleSwitch,
  onToggleFwd,
  probedSwitchId,
  onSelectProbeSwitch,
  switchVoltages,
}) => {
  const isS1On = conductingSwitches.includes('S1');
  const isFwdOn = conductingSwitches.includes('FWD');
  const isLoadActive = instantaneousIo > 0.05;
  const isSourceActive = isS1On && isLoadActive;

  const wireColorDefault = '#475569';
  const wireColorActive = '#10b981';

  return (
    <div className="relative w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox="0 0 660 320"
        className="w-full max-w-[660px] h-auto select-none font-sans"
      >
        <defs>
          <filter id="glowHalf" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <pattern id="gridHw" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
        </pattern>
        <rect width="660" height="320" fill="url(#gridHw)" />

        <text
          x="30"
          y="26"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          1-PHASE HALF-WAVE SCHEMATIC (INTERACTIVE)
        </text>
        <text
          x="630"
          y="26"
          textAnchor="end"
          fill="#38bdf8"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Click switch to toggle Diode ↔ Thyristor
        </text>

        {/* AC SOURCE */}
        <g transform="translate(80, 160)">
          <circle
            cx="0"
            cy="0"
            r="24"
            fill="#0f172a"
            stroke={instantaneousVs >= 0 ? '#38bdf8' : '#f59e0b'}
            strokeWidth="2.2"
          />
          <path
            d="M -12,0 Q -6,-10 0,0 Q 6,10 12,0"
            fill="none"
            stroke={instantaneousVs >= 0 ? '#38bdf8' : '#f59e0b'}
            strokeWidth="2"
          />
          <text
            x="-38"
            y="-6"
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="600"
            textAnchor="end"
          >
            v_s(t)
          </text>
          <text
            x="-38"
            y="10"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            textAnchor="end"
          >
            {instantaneousVs.toFixed(1)}V
          </text>
          <text
            x="-4"
            y="-30"
            fill={instantaneousVs >= 0 ? '#34d399' : '#f87171'}
            fontSize="12"
            fontWeight="bold"
          >
            {instantaneousVs >= 0 ? '+' : '−'}
          </text>
          <text
            x="-4"
            y="42"
            fill={instantaneousVs >= 0 ? '#f87171' : '#34d399'}
            fontSize="12"
            fontWeight="bold"
          >
            {instantaneousVs >= 0 ? '−' : '+'}
          </text>
        </g>

        {/* Source top wire to switch S1 anode (entering at bottom) */}
        <path
          d="M 80,136 L 80,160 L 250,160 L 250,154"
          fill="none"
          stroke={isSourceActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isSourceActive ? '5 3' : undefined}
          filter={isSourceActive ? 'url(#glowHalf)' : undefined}
          className={isSourceActive ? 'wire-animated' : undefined}
        />
        {isSourceActive && (
          <CurrentArrow x={160} y={160} direction="right" label="i_s" color="#10b981" />
        )}

        {/* Switch S1 in series pointing UP */}
        <SwitchSymbol
          x={250}
          y={130}
          id="S1"
          name="S1"
          type={params.switches.S1 || 'diode'}
          orientation="up"
          isConducting={isS1On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S1'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S1}
        />
        {isS1On && (
          <CurrentArrow x={250} y={150} direction="up" color="#10b981" />
        )}

        {/* Segment 1: From S1 cathode (at top) to FWD junction at x=410 */}
        <path
          d="M 250,106 L 250,80 L 410,80"
          fill="none"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isS1On ? '5 3' : undefined}
          filter={isS1On ? 'url(#glowHalf)' : undefined}
          className={isS1On ? 'wire-animated' : undefined}
        />
        {isS1On && (
          <CurrentArrow x={330} y={80} direction="right" label="i_s" color="#10b981" />
        )}

        {/* Segment 2: From FWD junction x=410 to Load top x=505 */}
        <path
          d="M 410,80 L 505,80"
          fill="none"
          stroke={isLoadActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isLoadActive ? '5 3' : undefined}
          filter={isLoadActive ? 'url(#glowHalf)' : undefined}
          className={isLoadActive ? 'wire-animated' : undefined}
        />
        {isLoadActive && (
          <CurrentArrow x={460} y={80} direction="right" label="i_o" color="#10b981" />
        )}

        {/* LOAD BRANCH */}
        <LoadBranch
          x={450}
          y={80}
          loadType={params.loadType}
          resistance={params.resistance}
          inductance={params.inductance}
          backEmf={params.backEmf}
          freewheelingDiode={params.freewheelingDiode}
          isFwdConducting={isFwdOn}
          isLoadActive={isLoadActive}
          onToggleFwd={onToggleFwd}
        />

        {/* Return wire Segment 1: from Load bottom (505, 260) to FWD junction (410, 260) */}
        <path
          d="M 505,260 L 410,260"
          fill="none"
          stroke={isLoadActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isLoadActive ? '5 3' : undefined}
          filter={isLoadActive ? 'url(#glowHalf)' : undefined}
          className={isLoadActive ? 'wire-animated' : undefined}
        />
        {isLoadActive && (
          <CurrentArrow x={460} y={260} direction="left" color="#10b981" />
        )}

        {/* Return wire Segment 2: from FWD junction (410, 260) to Source bottom (80, 260) -> (80, 184) */}
        <path
          d="M 410,260 L 80,260 L 80,184"
          fill="none"
          stroke={isSourceActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isSourceActive ? '5 3' : undefined}
          filter={isSourceActive ? 'url(#glowHalf)' : undefined}
          className={isSourceActive ? 'wire-animated' : undefined}
        />
        {isSourceActive && (
          <CurrentArrow x={240} y={260} direction="left" color="#10b981" />
        )}

        {/* Probe badges */}
        <g transform="translate(585, 130)">
          <rect x="0" y="0" width="65" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
          <text x="8" y="15" fill="#94a3b8" fontSize="8" fontWeight="600">
            PROBE V_o
          </text>
          <text
            x="8"
            y="31"
            fill="#34d399"
            fontSize="11"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            {instantaneousVo.toFixed(1)}V
          </text>
        </g>
        <g transform="translate(585, 185)">
          <rect x="0" y="0" width="65" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
          <text x="8" y="15" fill="#94a3b8" fontSize="8" fontWeight="600">
            LOAD I_o
          </text>
          <text
            x="8"
            y="31"
            fill="#38bdf8"
            fontSize="11"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            {instantaneousIo.toFixed(2)}A
          </text>
        </g>
      </svg>
    </div>
  );
};
