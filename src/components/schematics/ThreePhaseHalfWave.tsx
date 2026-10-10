import React from 'react';
import { CircuitParameters } from '../../types/powerElectronics';
import { LoadBranch } from './LoadBranch';
import { SwitchSymbol } from './SwitchSymbol';
import { CurrentArrow } from './CurrentArrow';

interface ThreePhaseHalfWaveProps {
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

export const ThreePhaseHalfWave: React.FC<ThreePhaseHalfWaveProps> = ({
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
  const isS3On = conductingSwitches.includes('S3');
  const isFwdOn = conductingSwitches.includes('FWD');
  const isLoadActive = instantaneousIo > 0.05;
  const isS1Active = isS1On && isLoadActive;
  const isS2Active = isS2On && isLoadActive;
  const isS3Active = isS3On && isLoadActive;
  const isAnySwitchOn = isS1Active || isS2Active || isS3Active;

  const wireColorDefault = '#475569';
  const wireColorActive = '#10b981';

  return (
    <div className="relative w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox="0 0 740 370"
        className="w-full max-w-[740px] h-auto select-none font-sans"
      >
        <pattern id="grid3phHw" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
        </pattern>
        <rect width="740" height="370" fill="url(#grid3phHw)" />

        {/* TITLE AND ANNOTATIONS */}
        <text
          x="30"
          y="24"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          3-PHASE HALF-WAVE (STAR / M3) RECTIFIER SCHEMATIC
        </text>
        <text
          x="30"
          y="38"
          fill="#64748b"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          Star-connected 3-phase AC source • 3-Pulse DC output with Neutral return path
        </text>
        <text
          x="710"
          y="26"
          textAnchor="end"
          fill="#38bdf8"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Click switches to toggle Diode ↔ Thyristor
        </text>

        {/* ============================================================== */}
        {/* 1. 3-PHASE STAR (Y) GENERATOR / AC SOURCE                      */}
        {/* ============================================================== */}
        <g id="star-source">
          {/* Neutral Star Point N */}
          <circle cx="60" cy="160" r="5" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
          <text x="46" y="164" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="end">
            N
          </text>

          {/* Phase A Winding (from N up-right to Va) */}
          <path
            d="M 60,160 L 60,90 L 100,90"
            fill="none"
            stroke={isS1Active ? '#ef4444' : '#991b1b'}
            strokeWidth="2"
          />
          <circle
            cx="116"
            cy="90"
            r="16"
            fill="#0f172a"
            stroke="#ef4444"
            strokeWidth={isS1Active ? '2.5' : '1.8'}
          />
          <path
            d="M 108,90 Q 112,83 116,90 Q 120,97 124,90"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.8"
          />
          <text x="116" y="118" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">
            V_a
          </text>

          {/* Phase B Winding (from N straight right to Vb) */}
          <line
            x1="60"
            y1="160"
            x2="100"
            y2="160"
            stroke={isS2Active ? '#eab308' : '#854d0e'}
            strokeWidth="2"
          />
          <circle
            cx="116"
            cy="160"
            r="16"
            fill="#0f172a"
            stroke="#eab308"
            strokeWidth={isS2Active ? '2.5' : '1.8'}
          />
          <path
            d="M 108,160 Q 112,153 116,160 Q 120,167 124,160"
            fill="none"
            stroke="#eab308"
            strokeWidth="1.8"
          />
          <text x="116" y="188" fill="#eab308" fontSize="9" fontWeight="bold" textAnchor="middle">
            V_b
          </text>

          {/* Phase C Winding (from N down-right to Vc) */}
          <path
            d="M 60,160 L 60,230 L 100,230"
            fill="none"
            stroke={isS3Active ? '#3b82f6' : '#1e40af'}
            strokeWidth="2"
          />
          <circle
            cx="116"
            cy="230"
            r="16"
            fill="#0f172a"
            stroke="#3b82f6"
            strokeWidth={isS3Active ? '2.5' : '1.8'}
          />
          <path
            d="M 108,230 Q 112,223 116,230 Q 120,237 124,230"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.8"
          />
          <text x="116" y="258" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">
            V_c
          </text>
        </g>

        {/* ============================================================== */}
        {/* 2. PHASE RAILS INTO SWITCHES S1, S2, S3                        */}
        {/* ============================================================== */}

        {/* --- PHASE A RAIL (y = 90) --- */}
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
          <CurrentArrow x={190} y={90} direction="right" label="i_a" color="#10b981" />
        )}

        <SwitchSymbol
          x={270}
          y={90}
          id="S1"
          name="S1 (Ph A)"
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

        {/* S1 cathode to common bus */}
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

        {/* --- PHASE B RAIL (y = 160) --- */}
        <line
          x1="132"
          y1="160"
          x2="246"
          y2="160"
          stroke={isS2Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS2Active ? '5 3' : undefined}
          className={isS2Active ? 'wire-animated' : undefined}
        />
        {isS2Active && (
          <CurrentArrow x={190} y={160} direction="right" label="i_b" color="#10b981" />
        )}

        <SwitchSymbol
          x={270}
          y={160}
          id="S2"
          name="S2 (Ph B)"
          type={params.switches.S2 || 'diode'}
          orientation="right"
          labelPosition="top"
          isConducting={isS2On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S2'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S2}
        />

        {/* S2 cathode to common bus */}
        <line
          x1="294"
          y1="160"
          x2="360"
          y2="160"
          stroke={isS2Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS2Active ? '5 3' : undefined}
          className={isS2Active ? 'wire-animated' : undefined}
        />

        {/* --- PHASE C RAIL (y = 230) --- */}
        <line
          x1="132"
          y1="230"
          x2="246"
          y2="230"
          stroke={isS3Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS3Active ? '5 3' : undefined}
          className={isS3Active ? 'wire-animated' : undefined}
        />
        {isS3Active && (
          <CurrentArrow x={190} y={230} direction="right" label="i_c" color="#10b981" />
        )}

        <SwitchSymbol
          x={270}
          y={230}
          id="S3"
          name="S3 (Ph C)"
          type={params.switches.S3 || 'diode'}
          orientation="right"
          labelPosition="bottom"
          isConducting={isS3On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S3'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S3}
        />

        {/* S3 cathode to common bus */}
        <line
          x1="294"
          y1="230"
          x2="360"
          y2="230"
          stroke={isS3Active ? wireColorActive : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isS3Active ? '5 3' : undefined}
          className={isS3Active ? 'wire-animated' : undefined}
        />

        {/* ============================================================== */}
        {/* 3. COMMON CATHODE DC+ COLLECTOR BUS (x = 360, y = 90 to 230)   */}
        {/* ============================================================== */}
        <line
          x1="360"
          y1="90"
          x2="360"
          y2="230"
          stroke={isAnySwitchOn ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          className={isAnySwitchOn ? 'wire-animated' : undefined}
        />
        <circle cx="360" cy="90" r="3.5" fill={isAnySwitchOn ? '#10b981' : '#cbd5e1'} />
        <circle cx="360" cy="160" r="3" fill={isS2Active ? '#10b981' : '#cbd5e1'} />
        <circle cx="360" cy="230" r="3" fill={isS3Active ? '#10b981' : '#cbd5e1'} />

        {/* ============================================================== */}
        {/* 4. DC+ POSITIVE RAIL: (360, 90) -> LOAD TOP (535, 90)         */}
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
          <CurrentArrow x={425} y={90} direction="right" label="i_dc" color="#10b981" />
        )}

        {/* ============================================================== */}
        {/* 5. NEUTRAL RETURN BUS: STAR POINT (60, 160) -> LOAD (535, 270) */}
        {/* ============================================================== */}
        <path
          d="M 60,165 L 60,290 L 535,290 L 535,270"
          fill="none"
          stroke={isAnySwitchOn ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isAnySwitchOn ? '5 3' : undefined}
          className={isAnySwitchOn ? 'wire-animated' : undefined}
        />
        {isAnySwitchOn && (
          <CurrentArrow x={300} y={290} direction="left" label="i_N" color="#10b981" />
        )}
        <circle cx="535" cy="270" r="3" fill={isAnySwitchOn ? '#10b981' : '#cbd5e1'} />

        {/* ============================================================== */}
        {/* 6. LOAD BRANCH                                                 */}
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
        {/* 7. LIVE METERS / READOUTS                                      */}
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
