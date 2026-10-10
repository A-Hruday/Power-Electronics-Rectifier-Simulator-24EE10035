import React from 'react';
import { CircuitParameters } from '../../types/powerElectronics';
import { LoadBranch } from './LoadBranch';
import { SwitchSymbol } from './SwitchSymbol';
import { CurrentArrow } from './CurrentArrow';

interface SinglePhaseBridgeProps {
  params: CircuitParameters;
  conductingSwitches: string[];
  instantaneousVs: number;
  instantaneousVo: number;
  instantaneousIo: number;
  instantaneousIs?: number;
  onToggleSwitch: (switchId: string) => void;
  onToggleFwd: () => void;
  probedSwitchId?: string;
  onSelectProbeSwitch?: (switchId: string) => void;
  switchVoltages?: Record<string, number>;
}

export const SinglePhaseBridge: React.FC<SinglePhaseBridgeProps> = ({
  params,
  conductingSwitches,
  instantaneousVs,
  instantaneousVo,
  instantaneousIo,
  instantaneousIs = 0,
  onToggleSwitch,
  onToggleFwd,
  probedSwitchId,
  onSelectProbeSwitch,
  switchVoltages,
}) => {
  const isS1On = conductingSwitches.includes('S1');
  const isS2On = conductingSwitches.includes('S2');
  const isS3On = conductingSwitches.includes('S3');
  const isS4On = conductingSwitches.includes('S4');
  const isFwdOn = conductingSwitches.includes('FWD');

  // Complete AC source conduction loop:
  // Current through source exists ONLY during positive conduction (S1 & S2) or negative conduction (S3 & S4).
  // During freewheeling (S1 & S4 in Leg 1, or S3 & S2 in Leg 2, or FWD), source current is ZERO!
  const isAcCircuitComplete = (isS1On && isS2On) || (isS3On && isS4On);
  const isSourceCarryingCurrent = isAcCircuitComplete && Math.abs(instantaneousIs) > 0.05 && instantaneousIo > 0.05;

  const isAcTopActive = isSourceCarryingCurrent;
  const isAcBottomActive = isSourceCarryingCurrent;

  // Bridge arms carry current ONLY if closed path exists:
  // Arm 1 Upper (Node AC1 to S1 anode): S1 conducts through S2 (from AC source) or through S4 (freewheel loop)
  const isArm1UpperActive = isS1On && instantaneousIo > 0.05 && (isS2On || isS4On);
  // Arm 1 Lower (S4 cathode to Node AC1): S4 conducts through S3 (from AC source) or through S1 (freewheel loop)
  const isArm1LowerActive = isS4On && instantaneousIo > 0.05 && (isS3On || isS1On);
  // Arm 2 Upper (Node AC2 to S3 anode): S3 conducts through S4 (from AC source) or through S2 (freewheel loop)
  const isArm2UpperActive = isS3On && instantaneousIo > 0.05 && (isS4On || isS2On);
  // Arm 2 Lower (S2 cathode to Node AC2): S2 conducts through S1 (from AC source) or through S3 (freewheel loop)
  const isArm2LowerActive = isS2On && instantaneousIo > 0.05 && (isS1On || isS3On);

  const isBridgeFeedActive = (isS1On && isArm1UpperActive) || (isS3On && isArm2UpperActive);
  const isBridgeReturnActive = (isS2On && isArm2LowerActive) || (isS4On && isArm1LowerActive);

  const wireColorDefault = '#475569';
  const wireColorActive = '#10b981';

  return (
    <div className="relative w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox="0 0 680 340"
        className="w-full max-w-[680px] h-auto select-none font-sans"
      >
        <defs>
          <linearGradient id="activeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
        </pattern>
        <rect width="680" height="340" fill="url(#grid)" />

        {/* Title & Instant status banner */}
        <text
          x="30"
          y="26"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.05em"
          fontFamily="system-ui, sans-serif"
        >
          1-PHASE FULL-WAVE BRIDGE SCHEMATIC (INTERACTIVE)
        </text>
        <text
          x="650"
          y="26"
          textAnchor="end"
          fill="#38bdf8"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Click any switch to toggle Diode ↔ Thyristor
        </text>

        {/* AC SOURCE SECTION */}
        <g transform="translate(60, 160)">
          {/* Source Circle */}
          <circle
            cx="0"
            cy="0"
            r="24"
            fill="#0f172a"
            stroke={instantaneousVs >= 0 ? '#38bdf8' : '#f59e0b'}
            strokeWidth="2.2"
          />
          {/* Sine Wave inside source */}
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

          {/* Source Instantaneous Polarity Indicators */}
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

        {/* Source wires into Bridge AC terminals */}
        {/* Top AC line: Source -> node AC1 between S1 & S4 */}
        <path
          d="M 60,136 L 60,120 L 220,120"
          fill="none"
          stroke={isAcTopActive ? wireColorActive : wireColorDefault}
          strokeWidth={isAcTopActive ? '2.5' : '1.8'}
          strokeDasharray={isAcTopActive ? '5 3' : undefined}
          filter={isAcTopActive ? 'url(#glowEffect)' : undefined}
          className={isAcTopActive ? 'wire-animated' : undefined}
        />
        {/* Top AC line Current Flow Arrow */}
        {isAcTopActive && isS1On && isS2On && (
          <CurrentArrow x={130} y={120} direction="right" label="i_s" color="#10b981" />
        )}
        {isAcTopActive && isS3On && isS4On && (
          <CurrentArrow x={130} y={120} direction="left" label="i_s" color="#10b981" />
        )}

        {/* Bottom AC line: Source -> node AC2 between S3 & S2 */}
        <path
          d="M 60,184 L 60,200 L 320,200"
          fill="none"
          stroke={isAcBottomActive ? wireColorActive : wireColorDefault}
          strokeWidth={isAcBottomActive ? '2.5' : '1.8'}
          strokeDasharray={isAcBottomActive ? '5 3' : undefined}
          filter={isAcBottomActive ? 'url(#glowEffect)' : undefined}
          className={isAcBottomActive ? 'wire-animated' : undefined}
        />
        {/* Bottom AC line Current Flow Arrow */}
        {isAcBottomActive && isS3On && isS4On && (
          <CurrentArrow x={160} y={200} direction="right" label="i_s" color="#10b981" />
        )}
        {isAcBottomActive && isS1On && isS2On && (
          <CurrentArrow x={160} y={200} direction="left" label="i_s" color="#10b981" />
        )}

        {/* BRIDGE ARMS: Accurately split by upper and lower branch */}
        {/* Node AC1 at (220, 120) */}
        <circle cx="220" cy="120" r="3.5" fill={isAcTopActive || (isArm1UpperActive && isArm1LowerActive) ? '#10b981' : '#cbd5e1'} />
        {/* Arm 1 Upper: from Node AC1 up to S1 anode */}
        <line
          x1="220"
          y1="120"
          x2="220"
          y2="104"
          stroke={isArm1UpperActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isArm1UpperActive ? 'wire-animated' : undefined}
        />
        {/* Arm 1 Lower: from S4 cathode up into Node AC1 */}
        <line
          x1="220"
          y1="120"
          x2="220"
          y2="216"
          stroke={isArm1LowerActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isArm1LowerActive ? 'wire-animated' : undefined}
        />

        {/* Node AC2 at (320, 200) */}
        <circle cx="320" cy="200" r="3.5" fill={isAcBottomActive || (isArm2UpperActive && isArm2LowerActive) ? '#10b981' : '#cbd5e1'} />
        {/* Arm 2 Upper: from Node AC2 up to S3 anode */}
        <line
          x1="320"
          y1="200"
          x2="320"
          y2="104"
          stroke={isArm2UpperActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isArm2UpperActive ? 'wire-animated' : undefined}
        />
        {/* Arm 2 Lower: from S2 cathode up into Node AC2 */}
        <line
          x1="320"
          y1="200"
          x2="320"
          y2="216"
          stroke={isArm2LowerActive ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isArm2LowerActive ? 'wire-animated' : undefined}
        />

        {/* Left Arm Switches: S1 (top) and S4 (bottom) */}
        <SwitchSymbol
          x={220}
          y={80}
          id="S1"
          name="S1"
          type={params.switches.S1 || 'diode'}
          isConducting={isS1On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S1'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S1}
        />
        {isS1On && (
          <CurrentArrow x={220} y={112} direction="up" color="#10b981" />
        )}

        <SwitchSymbol
          x={220}
          y={240}
          id="S4"
          name="S4"
          type={params.switches.S4 || 'diode'}
          isConducting={isS4On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S4'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S4}
        />
        {isS4On && (
          <CurrentArrow x={220} y={270} direction="up" color="#10b981" />
        )}

        {/* Right Arm Switches: S3 (top) and S2 (bottom) */}
        <SwitchSymbol
          x={320}
          y={80}
          id="S3"
          name="S3"
          type={params.switches.S3 || 'diode'}
          isConducting={isS3On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S3'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S3}
        />
        {isS3On && (
          <CurrentArrow x={320} y={112} direction="up" color="#10b981" />
        )}

        <SwitchSymbol
          x={320}
          y={240}
          id="S2"
          name="S2"
          type={params.switches.S2 || 'diode'}
          isConducting={isS2On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S2'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S2}
        />
        {isS2On && (
          <CurrentArrow x={320} y={270} direction="up" color="#10b981" />
        )}

        {/* DC POSITIVE BUS (TOP) - Segmented by current flow */}
        {/* S1 cathode vertical lead */}
        <line
          x1="220"
          y1="56"
          x2="220"
          y2="44"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS1On ? 'wire-animated' : undefined}
        />
        {/* S3 cathode vertical lead */}
        <line
          x1="320"
          y1="56"
          x2="320"
          y2="44"
          stroke={isS3On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS3On ? 'wire-animated' : undefined}
        />
        {/* S1 to S3 horizontal segment (only conducts when S1 is on) */}
        <line
          x1="220"
          y1="44"
          x2="320"
          y2="44"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isS1On ? '5 3' : undefined}
          className={isS1On ? 'wire-animated' : undefined}
        />
        {isS1On && (
          <CurrentArrow x={270} y={44} direction="right" color="#10b981" />
        )}
        <circle cx="220" cy="44" r="3" fill={isS1On ? '#10b981' : '#cbd5e1'} />
        <circle cx="320" cy="44" r="3" fill={isBridgeFeedActive ? '#10b981' : '#cbd5e1'} />

        {/* S3 to FWD/Load branch segment (carries bridge feed current) */}
        <line
          x1="320"
          y1="44"
          x2="430"
          y2="44"
          stroke={isBridgeFeedActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isBridgeFeedActive ? '5 3' : undefined}
          filter={isBridgeFeedActive ? 'url(#glowEffect)' : undefined}
          className={isBridgeFeedActive ? 'wire-animated' : undefined}
        />
        {isBridgeFeedActive && (
          <CurrentArrow x={375} y={44} direction="right" label="i_dc" color="#10b981" />
        )}

        {/* Top rail segment entering load: carries load current io */}
        <path
          d="M 430,44 L 525,44 L 525,80"
          fill="none"
          stroke={instantaneousIo > 0.05 ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={instantaneousIo > 0.05 ? '5 3' : undefined}
          filter={instantaneousIo > 0.05 ? 'url(#glowEffect)' : undefined}
          className={instantaneousIo > 0.05 ? 'wire-animated' : undefined}
        />

        {/* DC + Indicator */}
        <rect x="360" y="24" width="46" height="18" rx="4" fill="#0f172a" stroke="#334155" />
        <text
          x="383"
          y="37"
          fill="#ef4444"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          DC (+)
        </text>

        {/* DC NEGATIVE BUS (BOTTOM) - Segmented by current flow */}
        {/* S4 anode vertical lead */}
        <line
          x1="220"
          y1="264"
          x2="220"
          y2="276"
          stroke={isS4On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS4On ? 'wire-animated' : undefined}
        />
        {/* S2 anode vertical lead */}
        <line
          x1="320"
          y1="264"
          x2="320"
          y2="276"
          stroke={isS2On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS2On ? 'wire-animated' : undefined}
        />
        {/* S4 to S2 horizontal segment (only conducts when S4 is on) */}
        <line
          x1="220"
          y1="276"
          x2="320"
          y2="276"
          stroke={isS4On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          strokeDasharray={isS4On ? '5 3' : undefined}
          className={isS4On ? 'wire-animated' : undefined}
        />
        {isS4On && (
          <CurrentArrow x={270} y={276} direction="left" color="#10b981" />
        )}
        <circle cx="220" cy="276" r="3" fill={isS4On ? '#10b981' : '#cbd5e1'} />
        <circle cx="320" cy="276" r="3" fill={isBridgeReturnActive ? '#10b981' : '#cbd5e1'} />

        {/* Load return to FWD junction: carries load current */}
        <path
          d="M 525,260 L 525,276 L 430,276"
          fill="none"
          stroke={instantaneousIo > 0.05 ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={instantaneousIo > 0.05 ? '5 3' : undefined}
          filter={instantaneousIo > 0.05 ? 'url(#glowEffect)' : undefined}
          className={instantaneousIo > 0.05 ? 'wire-animated' : undefined}
        />

        {/* FWD junction back to S2: carries bridge return current */}
        <line
          x1="430"
          y1="276"
          x2="320"
          y2="276"
          stroke={isBridgeReturnActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isBridgeReturnActive ? '5 3' : undefined}
          filter={isBridgeReturnActive ? 'url(#glowEffect)' : undefined}
          className={isBridgeReturnActive ? 'wire-animated' : undefined}
        />
        {isBridgeReturnActive && (
          <CurrentArrow x={375} y={276} direction="left" color="#10b981" />
        )}

        {/* DC - Indicator */}
        <rect x="360" y="282" width="46" height="18" rx="4" fill="#0f172a" stroke="#334155" />
        <text
          x="383"
          y="295"
          fill="#38bdf8"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          DC (−)
        </text>

        {/* LOAD BRANCH COMPONENT */}
        <LoadBranch
          x={470}
          y={80}
          loadType={params.loadType}
          resistance={params.resistance}
          inductance={params.inductance}
          backEmf={params.backEmf}
          freewheelingDiode={params.freewheelingDiode}
          isFwdConducting={isFwdOn}
          isLoadActive={instantaneousIo > 0.05}
          onToggleFwd={onToggleFwd}
        />

        {/* Instantaneous Load Voltage & Current Probe Badges */}
        <g transform="translate(605, 150)">
          <rect
            x="0"
            y="0"
            width="65"
            height="44"
            rx="6"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.2"
          />
          <text x="8" y="16" fill="#94a3b8" fontSize="8" fontWeight="600">
            PROBE V_o
          </text>
          <text
            x="8"
            y="32"
            fill="#34d399"
            fontSize="11"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
          >
            {instantaneousVo.toFixed(1)}V
          </text>
        </g>
        <g transform="translate(605, 205)">
          <rect
            x="0"
            y="0"
            width="65"
            height="44"
            rx="6"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.2"
          />
          <text x="8" y="16" fill="#94a3b8" fontSize="8" fontWeight="600">
            LOAD I_o
          </text>
          <text
            x="8"
            y="32"
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
