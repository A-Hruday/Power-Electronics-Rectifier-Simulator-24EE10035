import React from 'react';
import { CircuitParameters } from '../../types/powerElectronics';
import { LoadBranch } from './LoadBranch';
import { SwitchSymbol } from './SwitchSymbol';
import { CurrentArrow } from './CurrentArrow';

interface SinglePhaseMidpointProps {
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

export const SinglePhaseMidpoint: React.FC<SinglePhaseMidpointProps> = ({
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
  const isS2On = conductingSwitches.includes('S2');
  const isFwdOn = conductingSwitches.includes('FWD');
  const isLoadActive = instantaneousIo > 0.05;
  const isS1Active = isS1On && isLoadActive;
  const isS2Active = isS2On && isLoadActive;
  const isSourceFeedActive = isS1Active || isS2Active;

  const wireColorDefault = '#475569';
  const wireColorActive = '#10b981';

  // Secondary voltages (equal and opposite wrt Center Tap)
  const vs1 = instantaneousVs;
  const vs2 = -instantaneousVs;

  return (
    <div className="relative w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox="0 0 720 360"
        className="w-full max-w-[720px] h-auto select-none font-sans"
      >
        <pattern id="gridMid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
        </pattern>
        <rect width="720" height="360" fill="url(#gridMid)" />

        {/* TITLE AND ANNOTATIONS */}
        <text
          x="30"
          y="24"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          1-PHASE FULL-WAVE CENTER-TAPPED (MID-POINT) RECTIFIER
        </text>
        <text
          x="30"
          y="38"
          fill="#64748b"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          Center-tapped secondary provides 180° inverted phase pair • Common Cathode DC+ bus
        </text>
        <text
          x="690"
          y="26"
          textAnchor="end"
          fill="#38bdf8"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Click switches to toggle Diode ↔ Thyristor
        </text>

        {/* ============================================================== */}
        {/* 1. PRIMARY AC SOURCE (v_s)                                     */}
        {/* ============================================================== */}
        <g transform="translate(50, 160)">
          {/* Source Circle */}
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="#0f172a"
            stroke={instantaneousVs >= 0 ? '#38bdf8' : '#f59e0b'}
            strokeWidth="2.2"
          />
          {/* Sine Wave */}
          <path
            d="M -11,0 Q -5.5,-9 0,0 Q 5.5,9 11,0"
            fill="none"
            stroke={instantaneousVs >= 0 ? '#38bdf8' : '#f59e0b'}
            strokeWidth="2"
          />
          <text
            x="-28"
            y="-4"
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="600"
            textAnchor="end"
          >
            v_s(t)
          </text>
          <text
            x="-28"
            y="12"
            fill="#94a3b8"
            fontSize="8.5"
            fontFamily="ui-monospace, monospace"
            textAnchor="end"
          >
            {instantaneousVs.toFixed(1)}V
          </text>

          {/* Instantaneous Polarities */}
          <text
            x="-4"
            y="-28"
            fill={instantaneousVs >= 0 ? '#34d399' : '#f87171'}
            fontSize="11"
            fontWeight="bold"
          >
            {instantaneousVs >= 0 ? '+' : '−'}
          </text>
          <text
            x="-4"
            y="38"
            fill={instantaneousVs >= 0 ? '#f87171' : '#34d399'}
            fontSize="11"
            fontWeight="bold"
          >
            {instantaneousVs >= 0 ? '−' : '+'}
          </text>
        </g>

        {/* Primary Input Wires */}
        {/* Top primary lead: Source (50, 138) -> (50, 90) -> (90, 90) */}
        <path
          d="M 50,138 L 50,90 L 90,90"
          fill="none"
          stroke={isSourceFeedActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isSourceFeedActive ? '5 3' : undefined}
          className={isSourceFeedActive ? 'wire-animated' : undefined}
        />
        {isSourceFeedActive && instantaneousVs >= 0 && (
          <CurrentArrow x={70} y={90} direction="right" label="i_pri" color="#10b981" />
        )}
        {isSourceFeedActive && instantaneousVs < 0 && (
          <CurrentArrow x={70} y={90} direction="left" label="i_pri" color="#10b981" />
        )}

        {/* Bottom primary lead: Source (50, 182) -> (50, 230) -> (90, 230) */}
        <path
          d="M 50,182 L 50,230 L 90,230"
          fill="none"
          stroke={isSourceFeedActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isSourceFeedActive ? '5 3' : undefined}
          className={isSourceFeedActive ? 'wire-animated' : undefined}
        />
        {isSourceFeedActive && instantaneousVs >= 0 && (
          <CurrentArrow x={70} y={230} direction="left" color="#10b981" />
        )}
        {isSourceFeedActive && instantaneousVs < 0 && (
          <CurrentArrow x={70} y={230} direction="right" color="#10b981" />
        )}

        {/* ============================================================== */}
        {/* 2. TRANSFORMER WITH CENTER-TAPPED SECONDARY                    */}
        {/* ============================================================== */}
        <g id="transformer">
          {/* Primary Winding Coils (x = 90, y = 90 to 230) */}
          <path
            d="M 90,90 C 104,95 104,115 90,120 C 104,125 104,145 90,150 C 104,155 104,175 90,180 C 104,185 104,205 90,210 C 104,215 104,225 90,230"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Dot convention on Primary top */}
          <circle cx="82" cy="98" r="3" fill="#38bdf8" />

          {/* Magnetic Core (2 parallel lines) */}
          <line x1="108" y1="80" x2="108" y2="240" stroke="#64748b" strokeWidth="2.5" />
          <line x1="114" y1="80" x2="114" y2="240" stroke="#64748b" strokeWidth="2.5" />

          {/* Secondary Upper Coil (x = 132, y = 90 to 150) */}
          <path
            d="M 132,90 C 118,97 118,113 132,120 C 118,127 118,143 132,150"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Dot convention on Secondary top */}
          <circle cx="140" cy="98" r="3" fill="#38bdf8" />

          {/* Secondary Lower Coil (x = 132, y = 170 to 230) */}
          <path
            d="M 132,170 C 118,177 118,193 132,200 C 118,207 118,223 132,230"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Dot convention on Secondary bottom (shows phase reversal relative to N) */}
          <circle cx="140" cy="222" r="3" fill="#f59e0b" />

          {/* Center-Tap Joint between the two windings */}
          <line x1="132" y1="150" x2="132" y2="170" stroke="#94a3b8" strokeWidth="2.5" />
          <circle cx="132" cy="160" r="4" fill={isSourceFeedActive ? '#10b981' : '#cbd5e1'} />

          {/* Terminal labels */}
          <text x="146" y="86" fill="#38bdf8" fontSize="9" fontWeight="bold">
            +v_s1 ({vs1 >= 0 ? '+' : ''}{vs1.toFixed(0)}V)
          </text>
          <text x="146" y="244" fill="#f59e0b" fontSize="9" fontWeight="bold">
            +v_s2 ({vs2 >= 0 ? '+' : ''}{vs2.toFixed(0)}V)
          </text>
          <text x="144" y="163" fill="#94a3b8" fontSize="8.5" fontWeight="600">
            CENTER TAP (0V)
          </text>
        </g>

        {/* ============================================================== */}
        {/* 3. UPPER BRANCH: SECONDARY TOP -> SWITCH S1 -> DC+ BUS         */}
        {/* ============================================================== */}
        {/* Wire from secondary 1 top (132, 90) to S1 anode (246, 90) */}
        <line
          x1="132"
          y1="90"
          x2="246"
          y2="90"
          stroke={isS1Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS1Active ? '5 3' : undefined}
          className={isS1Active ? 'wire-animated' : undefined}
        />
        {isS1Active && (
          <CurrentArrow x={190} y={90} direction="right" label="i_s1" color="#10b981" />
        )}

        <SwitchSymbol
          x={270}
          y={90}
          id="S1"
          name="S1"
          type={params.switches.S1 || 'diode'}
          orientation="right"
          labelPosition="top"
          isConducting={isS1On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S1'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S1}
        />

        {/* Cathode S1 (294, 90) to common cathode node (360, 90) */}
        <line
          x1="294"
          y1="90"
          x2="360"
          y2="90"
          stroke={isS1Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS1Active ? '5 3' : undefined}
          className={isS1Active ? 'wire-animated' : undefined}
        />

        {/* ============================================================== */}
        {/* 4. LOWER BRANCH: SECONDARY BOTTOM -> SWITCH S2 -> DC+ BUS      */}
        {/* ============================================================== */}
        {/* Wire from secondary 2 bottom (132, 230) to S2 anode (246, 230) */}
        <line
          x1="132"
          y1="230"
          x2="246"
          y2="230"
          stroke={isS2Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS2Active ? '5 3' : undefined}
          className={isS2Active ? 'wire-animated' : undefined}
        />
        {isS2Active && (
          <CurrentArrow x={190} y={230} direction="right" label="i_s2" color="#10b981" />
        )}

        <SwitchSymbol
          x={270}
          y={230}
          id="S2"
          name="S2"
          type={params.switches.S2 || 'diode'}
          orientation="right"
          labelPosition="bottom"
          isConducting={isS2On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S2'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S2}
        />

        {/* Cathode S2 (294, 230) -> (360, 230) then up to common node (360, 90) */}
        <path
          d="M 294,230 L 360,230 L 360,90"
          fill="none"
          stroke={isS2Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS2Active ? '5 3' : undefined}
          className={isS2Active ? 'wire-animated' : undefined}
        />
        {isS2Active && (
          <CurrentArrow x={360} y={160} direction="up" label="i_s2" color="#10b981" />
        )}

        {/* Common Cathode Junction Node */}
        <circle cx="360" cy="90" r="3.5" fill={isSourceFeedActive ? '#10b981' : '#cbd5e1'} />

        {/* ============================================================== */}
        {/* 5. DC+ POSITIVE RAIL: COMMON CATHODE (360, 90) -> LOAD (535, 90)*/}
        {/* ============================================================== */}
        <line
          x1="360"
          y1="90"
          x2="535"
          y2="90"
          stroke={isLoadActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isLoadActive ? '5 3' : undefined}
          className={isLoadActive ? 'wire-animated' : undefined}
        />
        {isLoadActive && (
          <CurrentArrow x={425} y={90} direction="right" label="i_o" color="#10b981" />
        )}

        {/* ============================================================== */}
        {/* 6. NEUTRAL / LOAD RETURN: CENTER-TAP (132, 160) -> LOAD (535, 270) */}
        {/* ============================================================== */}
        {/* Drops down cleanly to y = 280, running along the bottom rail */}
        <path
          d="M 132,160 L 118,160 L 118,280 L 535,280 L 535,270"
          fill="none"
          stroke={isSourceFeedActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isSourceFeedActive ? '5 3' : undefined}
          className={isSourceFeedActive ? 'wire-animated' : undefined}
        />
        {isSourceFeedActive && (
          <CurrentArrow x={300} y={280} direction="left" label="i_N" color="#10b981" />
        )}
        <circle cx="535" cy="270" r="3" fill={isSourceFeedActive ? '#10b981' : '#cbd5e1'} />

        {/* ============================================================== */}
        {/* 7. LOAD BRANCH                                                 */}
        {/* ============================================================== */}
        <LoadBranch
          x={480}
          y={90}
          loadType={params.loadType}
          resistance={params.resistance}
          inductance={params.inductance}
          backEmf={params.backEmf}
          freewheelingDiode={params.freewheelingDiode}
          isFwdConducting={isFwdOn}
          isLoadActive={isLoadActive}
          onToggleFwd={onToggleFwd}
        />

        {/* ============================================================== */}
        {/* 8. METERS / PROBE READOUTS                                     */}
        {/* ============================================================== */}
        <g transform="translate(620, 140)">
          <rect x="0" y="0" width="70" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
          <text x="8" y="15" fill="#94a3b8" fontSize="8" fontWeight="600">
            LOAD V_o
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
        <g transform="translate(620, 195)">
          <rect x="0" y="0" width="70" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
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
