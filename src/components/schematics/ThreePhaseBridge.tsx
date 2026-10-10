import React from 'react';
import { CircuitParameters } from '../../types/powerElectronics';
import { LoadBranch } from './LoadBranch';
import { SwitchSymbol } from './SwitchSymbol';
import { CurrentArrow } from './CurrentArrow';

interface ThreePhaseBridgeProps {
  params: CircuitParameters;
  conductingSwitches: string[];
  instantaneousVs: number;
  instantaneousVo: number;
  instantaneousIo: number;
  instantaneousIsA?: number;
  instantaneousIsB?: number;
  instantaneousIsC?: number;
  onToggleSwitch: (switchId: string) => void;
  onToggleFwd: () => void;
  probedSwitchId?: string;
  onSelectProbeSwitch?: (switchId: string) => void;
  switchVoltages?: Record<string, number>;
}

export const ThreePhaseBridge: React.FC<ThreePhaseBridgeProps> = ({
  params,
  conductingSwitches,
  instantaneousVs: _vs,
  instantaneousVo,
  instantaneousIo,
  instantaneousIsA = 0,
  instantaneousIsB = 0,
  instantaneousIsC = 0,
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
  const isS5On = conductingSwitches.includes('S5');
  const isS6On = conductingSwitches.includes('S6');
  const isFwdOn = conductingSwitches.includes('FWD');

  const isTopAnyOn = isS1On || isS3On || isS5On;
  const isBotAnyOn = isS4On || isS6On || isS2On;
  const isLoadActive = instantaneousIo > 0.05;

  // Real source phase conduction: A phase wire carries current only if a top switch and bottom switch in differing legs are active and load is drawing current
  const isPhaseAActive = isLoadActive && (Math.abs(instantaneousIsA) > 0.05 || (isTopAnyOn && isBotAnyOn)) && (isS1On || isS4On) && !(isS1On && isS4On && !isS2On && !isS3On && !isS5On && !isS6On);
  const isPhaseBActive = isLoadActive && (Math.abs(instantaneousIsB) > 0.05 || (isTopAnyOn && isBotAnyOn)) && (isS3On || isS6On) && !(isS3On && isS6On && !isS1On && !isS2On && !isS4On && !isS5On);
  const isPhaseCActive = isLoadActive && (Math.abs(instantaneousIsC) > 0.05 || (isTopAnyOn && isBotAnyOn)) && (isS5On || isS2On) && !(isS5On && isS2On && !isS1On && !isS3On && !isS4On && !isS6On);

  const wireColorDefault = '#475569';
  const wireColorActive = '#10b981';

  return (
    <div className="relative w-full overflow-x-auto flex justify-center py-2">
      <svg
        viewBox="0 0 760 360"
        className="w-full max-w-[760px] h-auto select-none font-sans"
      >
        <pattern id="grid3phBridge" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
        </pattern>
        <rect width="760" height="360" fill="url(#grid3phBridge)" />

        <text
          x="30"
          y="26"
          fill="#94a3b8"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          3-PHASE FULL-WAVE 6-PULSE BRIDGE CONVERTER
        </text>
        <text
          x="730"
          y="26"
          textAnchor="end"
          fill="#38bdf8"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          Click switches to toggle Diode ↔ Thyristor
        </text>

        {/* 3-PHASE AC INPUT TERMINALS */}
        <g transform="translate(60, 160)">
          {/* Phase A */}
          <circle cx="0" cy="-40" r="14" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
          <text x="0" y="-36" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">
            A
          </text>
          {/* Phase B */}
          <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#eab308" strokeWidth="2" />
          <text x="0" y="4" fill="#eab308" fontSize="9" fontWeight="bold" textAnchor="middle">
            B
          </text>
          {/* Phase C */}
          <circle cx="0" cy="40" r="14" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
          <text x="0" y="44" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">
            C
          </text>
        </g>

        {/* AC Input Distribution Wires into 3 legs */}
        {/* Phase A to Leg 1 (x = 190, y = 140) */}
        <path
          d="M 74,120 L 190,120"
          fill="none"
          stroke={isPhaseAActive ? '#ef4444' : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isPhaseAActive ? '5 3' : undefined}
          className={isPhaseAActive ? 'wire-animated' : undefined}
        />
        {isPhaseAActive && isS1On && (
          <CurrentArrow x={130} y={120} direction="right" label="i_a" color="#ef4444" />
        )}
        {isPhaseAActive && isS4On && !isS1On && (
          <CurrentArrow x={130} y={120} direction="left" label="i_a" color="#ef4444" />
        )}

        {/* Phase B to Leg 2 (x = 280, y = 160) */}
        <path
          d="M 74,160 L 280,160"
          fill="none"
          stroke={isPhaseBActive ? '#eab308' : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isPhaseBActive ? '5 3' : undefined}
          className={isPhaseBActive ? 'wire-animated' : undefined}
        />
        {isPhaseBActive && isS3On && (
          <CurrentArrow x={175} y={160} direction="right" label="i_b" color="#eab308" />
        )}
        {isPhaseBActive && isS6On && !isS3On && (
          <CurrentArrow x={175} y={160} direction="left" label="i_b" color="#eab308" />
        )}

        {/* Phase C to Leg 3 (x = 370, y = 200) */}
        <path
          d="M 74,200 L 370,200"
          fill="none"
          stroke={isPhaseCActive ? '#3b82f6' : wireColorDefault}
          strokeWidth="2.2"
          strokeDasharray={isPhaseCActive ? '5 3' : undefined}
          className={isPhaseCActive ? 'wire-animated' : undefined}
        />
        {isPhaseCActive && isS5On && (
          <CurrentArrow x={220} y={200} direction="right" label="i_c" color="#3b82f6" />
        )}
        {isPhaseCActive && isS2On && !isS5On && (
          <CurrentArrow x={220} y={200} direction="left" label="i_c" color="#3b82f6" />
        )}

        {/* LEG 1 (Phase A): S1 (top) and S4 (bottom) */}
        <circle cx="190" cy="120" r="3" fill={isS1On || isS4On ? '#10b981' : '#cbd5e1'} />
        {/* Upper branch: from node (190, 120) up to S1 anode (190, 109) */}
        <line
          x1="190"
          y1="120"
          x2="190"
          y2="109"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS1On ? 'wire-animated' : undefined}
        />
        {/* Upper branch lead: from S1 cathode (190, 61) up to DC+ bus (190, 44) */}
        <line
          x1="190"
          y1="61"
          x2="190"
          y2="44"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS1On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={190}
          y={85}
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
          <CurrentArrow x={190} y={105} direction="up" color="#10b981" />
        )}

        {/* Lower branch: from S4 cathode (190, 231) up to node (190, 120) */}
        <line
          x1="190"
          y1="231"
          x2="190"
          y2="120"
          stroke={isS4On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS4On ? 'wire-animated' : undefined}
        />
        {/* Lower branch lead: from DC- bus (190, 296) up to S4 anode (190, 279) */}
        <line
          x1="190"
          y1="296"
          x2="190"
          y2="279"
          stroke={isS4On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS4On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={190}
          y={255}
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
          <CurrentArrow x={190} y={275} direction="up" color="#10b981" />
        )}

        {/* LEG 2 (Phase B): S3 (top) and S6 (bottom) */}
        <circle cx="280" cy="160" r="3" fill={isS3On || isS6On ? '#10b981' : '#cbd5e1'} />
        {/* Upper branch: from node (280, 160) up to S3 anode (280, 109) */}
        <line
          x1="280"
          y1="160"
          x2="280"
          y2="109"
          stroke={isS3On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS3On ? 'wire-animated' : undefined}
        />
        {/* Upper branch lead: from S3 cathode (280, 61) up to DC+ bus (280, 44) */}
        <line
          x1="280"
          y1="61"
          x2="280"
          y2="44"
          stroke={isS3On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS3On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={280}
          y={85}
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
          <CurrentArrow x={280} y={105} direction="up" color="#10b981" />
        )}

        {/* Lower branch: from S6 cathode (280, 231) up to node (280, 160) */}
        <line
          x1="280"
          y1="231"
          x2="280"
          y2="160"
          stroke={isS6On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS6On ? 'wire-animated' : undefined}
        />
        {/* Lower branch lead: from DC- bus (280, 296) up to S6 anode (280, 279) */}
        <line
          x1="280"
          y1="296"
          x2="280"
          y2="279"
          stroke={isS6On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS6On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={280}
          y={255}
          id="S6"
          name="S6"
          type={params.switches.S6 || 'diode'}
          isConducting={isS6On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S6'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S6}
        />
        {isS6On && (
          <CurrentArrow x={280} y={275} direction="up" color="#10b981" />
        )}

        {/* LEG 3 (Phase C): S5 (top) and S2 (bottom) */}
        <circle cx="370" cy="200" r="3" fill={isS5On || isS2On ? '#10b981' : '#cbd5e1'} />
        {/* Upper branch: from node (370, 200) up to S5 anode (370, 109) */}
        <line
          x1="370"
          y1="200"
          x2="370"
          y2="109"
          stroke={isS5On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS5On ? 'wire-animated' : undefined}
        />
        {/* Upper branch lead: from S5 cathode (370, 61) up to DC+ bus (370, 44) */}
        <line
          x1="370"
          y1="61"
          x2="370"
          y2="44"
          stroke={isS5On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS5On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={370}
          y={85}
          id="S5"
          name="S5"
          type={params.switches.S5 || 'diode'}
          isConducting={isS5On}
          firingAngleDeg={params.firingAngleDeg}
          onToggleType={onToggleSwitch}
          isSelected={probedSwitchId === 'S5'}
          onSelect={onSelectProbeSwitch}
          probedVoltage={switchVoltages?.S5}
        />
        {isS5On && (
          <CurrentArrow x={370} y={105} direction="up" color="#10b981" />
        )}

        {/* Lower branch: from S2 cathode (370, 231) up to node (370, 200) */}
        <line
          x1="370"
          y1="231"
          x2="370"
          y2="200"
          stroke={isS2On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS2On ? 'wire-animated' : undefined}
        />
        {/* Lower branch lead: from DC- bus (370, 296) up to S2 anode (370, 279) */}
        <line
          x1="370"
          y1="296"
          x2="370"
          y2="279"
          stroke={isS2On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS2On ? 'wire-animated' : undefined}
        />
        <SwitchSymbol
          x={370}
          y={255}
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
          <CurrentArrow x={370} y={275} direction="up" color="#10b981" />
        )}

        {/* DC (+) TOP BUS (Cathodes of S1, S3, S5) */}
        {/* Segment 1: from S1 (190, 44) to S3 (280, 44) */}
        <line
          x1="190"
          y1="44"
          x2="280"
          y2="44"
          stroke={isS1On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS1On ? 'wire-animated' : undefined}
        />
        {/* Segment 2: from S3 (280, 44) to S5 (370, 44) */}
        <line
          x1="280"
          y1="44"
          x2="370"
          y2="44"
          stroke={isS1On || isS3On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS1On || isS3On ? 'wire-animated' : undefined}
        />
        {/* Segment 3: from S5 (370, 44) to FWD junction at x=500 */}
        <line
          x1="370"
          y1="44"
          x2="500"
          y2="44"
          stroke={isTopAnyOn ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          className={isTopAnyOn ? 'wire-animated' : undefined}
        />
        {isTopAnyOn && (
          <CurrentArrow x={435} y={44} direction="right" label="i_dc" color="#10b981" />
        )}

        {/* Segment 4: from FWD junction (500, 44) to Load (595, 44) -> (595, 80) */}
        <path
          d="M 500,44 L 595,44 L 595,80"
          fill="none"
          stroke={isLoadActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isLoadActive ? '5 3' : undefined}
          className={isLoadActive ? 'wire-animated' : undefined}
        />
        {isLoadActive && (
          <CurrentArrow x={550} y={44} direction="right" label="i_o" color="#10b981" />
        )}

        {/* DC (-) BOTTOM BUS (Anodes of S4, S6, S2) */}
        {/* Segment 1: from Load (595, 260) -> (595, 296) to FWD junction (500, 296) */}
        <path
          d="M 595,260 L 595,296 L 500,296"
          fill="none"
          stroke={isLoadActive ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          strokeDasharray={isLoadActive ? '5 3' : undefined}
          className={isLoadActive ? 'wire-animated' : undefined}
        />
        {isLoadActive && (
          <CurrentArrow x={550} y={296} direction="left" color="#10b981" />
        )}

        {/* Segment 2: from FWD junction (500, 296) to Leg 3 S2 (370, 296) */}
        <line
          x1="500"
          y1="296"
          x2="370"
          y2="296"
          stroke={isBotAnyOn ? wireColorActive : wireColorDefault}
          strokeWidth="2.5"
          className={isBotAnyOn ? 'wire-animated' : undefined}
        />
        {isBotAnyOn && (
          <CurrentArrow x={435} y={296} direction="left" label="i_dc" color="#10b981" />
        )}

        {/* Segment 3: from S2 (370, 296) to S6 (280, 296) */}
        <line
          x1="370"
          y1="296"
          x2="280"
          y2="296"
          stroke={isS4On || isS6On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS4On || isS6On ? 'wire-animated' : undefined}
        />

        {/* Segment 4: from S6 (280, 296) to S4 (190, 296) */}
        <line
          x1="280"
          y1="296"
          x2="190"
          y2="296"
          stroke={isS4On ? wireColorActive : wireColorDefault}
          strokeWidth="2"
          className={isS4On ? 'wire-animated' : undefined}
        />
        <circle cx="190" cy="44" r="3" fill={isS1On ? '#10b981' : '#cbd5e1'} />
        <circle cx="280" cy="44" r="3" fill={isS1On || isS3On ? '#10b981' : '#cbd5e1'} />
        <circle cx="370" cy="44" r="3" fill={isTopAnyOn ? '#10b981' : '#cbd5e1'} />
        <circle cx="370" cy="296" r="3" fill={isBotAnyOn ? '#10b981' : '#cbd5e1'} />
        <circle cx="280" cy="296" r="3" fill={isS4On || isS6On ? '#10b981' : '#cbd5e1'} />
        <circle cx="190" cy="296" r="3" fill={isS4On ? '#10b981' : '#cbd5e1'} />

        {/* LOAD BRANCH */}
        <LoadBranch
          x={540}
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

        {/* Probe badges */}
        <g transform="translate(675, 140)">
          <rect x="0" y="0" width="68" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
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
        <g transform="translate(675, 195)">
          <rect x="0" y="0" width="68" height="42" rx="6" fill="#0f172a" stroke="#1e293b" />
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
