import React from 'react';
import { CircuitParameters, SimulationSample, TopologyType } from '../../types/powerElectronics';
import { SinglePhaseHalfWave } from './SinglePhaseHalfWave';
import { SinglePhaseMidpoint } from './SinglePhaseMidpoint';
import { SinglePhaseBridge } from './SinglePhaseBridge';
import { ThreePhaseHalfWave } from './ThreePhaseHalfWave';
import { ThreePhaseBridge } from './ThreePhaseBridge';

interface SchematicViewerProps {
  params: CircuitParameters;
  currentSample?: SimulationSample;
  onUpdateParams: (newParams: Partial<CircuitParameters>) => void;
  onTopologyChange: (topology: TopologyType) => void;
  onResetToDefault: () => void;
  probedSwitchId?: string | null;
  onSelectProbeSwitch?: (switchId: string | null) => void;
}

export const SchematicViewer: React.FC<SchematicViewerProps> = ({
  params,
  currentSample,
  onUpdateParams,
  onTopologyChange,
  onResetToDefault,
  probedSwitchId = null,
  onSelectProbeSwitch,
}) => {
  const conducting = currentSample?.conductingSwitches || [];
  const vS = currentSample?.vSourceA ?? 0;
  const vO = currentSample?.vOutput ?? 0;
  const iO = currentSample?.iOutput ?? 0;
  const switchVoltages = currentSample?.switchVoltages;

  // Available switches for current circuit topology
  const availableSwitches = React.useMemo(() => {
    const list = Object.keys(params.switches);
    if (params.freewheelingDiode) list.push('FWD');
    return list;
  }, [params.switches, params.freewheelingDiode]);

  const activeProbedSwitch = probedSwitchId && availableSwitches.includes(probedSwitchId) ? probedSwitchId : null;
  const probedVoltage = activeProbedSwitch ? (switchVoltages?.[activeProbedSwitch] ?? 0) : 0;
  const isProbedConducting = activeProbedSwitch ? conducting.includes(activeProbedSwitch) : false;
  const probedSwitchType = activeProbedSwitch === 'FWD' ? 'Diode' : (activeProbedSwitch && params.switches[activeProbedSwitch] === 'thyristor' ? 'Thyristor' : 'Diode');

  const handleSelectProbe = (swId: string) => {
    if (onSelectProbeSwitch) {
      onSelectProbeSwitch(activeProbedSwitch === swId ? null : swId);
    }
  };

  const handleClearProbe = () => {
    if (onSelectProbeSwitch) {
      onSelectProbeSwitch(null);
    }
  };

  const isIdealModel =
    params.switchModel === 'ideal' ||
    (params.switchModel !== 'non-ideal' && params.forwardDrop === 0);

  const handleToggleSwitch = (switchId: string) => {
    const current = params.switches[switchId] || 'diode';
    const next = current === 'diode' ? 'thyristor' : 'diode';
    onUpdateParams({
      switches: {
        ...params.switches,
        [switchId]: next,
      },
    });
  };

  const handleSetAllSwitches = (type: 'diode' | 'thyristor') => {
    const updated: Record<string, 'diode' | 'thyristor'> = {};
    for (const key of Object.keys(params.switches)) {
      updated[key] = type;
    }
    onUpdateParams({ switches: updated });
  };

  const handleSetUpperDiodes = () => {
    if (params.topology === '1ph-bridge') {
      onUpdateParams({
        switches: {
          S1: 'diode',
          S3: 'diode',
          S4: 'thyristor',
          S2: 'thyristor',
        },
      });
    } else if (params.topology === '3ph-bridge') {
      onUpdateParams({
        switches: {
          S1: 'diode',
          S3: 'diode',
          S5: 'diode',
          S4: 'thyristor',
          S6: 'thyristor',
          S2: 'thyristor',
        },
      });
    }
  };

  const handleSetLowerDiodes = () => {
    if (params.topology === '1ph-bridge') {
      onUpdateParams({
        switches: {
          S1: 'thyristor',
          S3: 'thyristor',
          S4: 'diode',
          S2: 'diode',
        },
      });
    } else if (params.topology === '3ph-bridge') {
      onUpdateParams({
        switches: {
          S1: 'thyristor',
          S3: 'thyristor',
          S5: 'thyristor',
          S4: 'diode',
          S6: 'diode',
          S2: 'diode',
        },
      });
    }
  };

  const handleToggleIdealModel = () => {
    if (isIdealModel) {
      onUpdateParams({
        switchModel: 'non-ideal',
        forwardDrop: params.diodeForwardDrop ?? 0.7,
        diodeForwardDrop: params.diodeForwardDrop ?? 0.7,
        thyristorForwardDrop: params.thyristorForwardDrop ?? 1.4,
        switchResistance: params.switchResistance ?? 0.02,
      });
    } else {
      onUpdateParams({
        switchModel: 'ideal',
        forwardDrop: 0,
      });
    }
  };

  const handleToggleFwd = () => {
    onUpdateParams({
      freewheelingDiode: !params.freewheelingDiode,
    });
  };

  const isAllDiode = Object.values(params.switches).every((s) => s === 'diode');
  const isAllThyristor = Object.values(params.switches).every((s) => s === 'thyristor');
  const isUpperDiodesActive =
    params.topology === '1ph-bridge'
      ? params.switches.S1 === 'diode' &&
        params.switches.S3 === 'diode' &&
        params.switches.S4 === 'thyristor' &&
        params.switches.S2 === 'thyristor'
      : params.topology === '3ph-bridge'
      ? params.switches.S1 === 'diode' &&
        params.switches.S3 === 'diode' &&
        params.switches.S5 === 'diode' &&
        params.switches.S4 === 'thyristor' &&
        params.switches.S6 === 'thyristor' &&
        params.switches.S2 === 'thyristor'
      : false;

  const isLowerDiodesActive =
    params.topology === '1ph-bridge'
      ? params.switches.S1 === 'thyristor' &&
        params.switches.S3 === 'thyristor' &&
        params.switches.S4 === 'diode' &&
        params.switches.S2 === 'diode'
      : params.topology === '3ph-bridge'
      ? params.switches.S1 === 'thyristor' &&
        params.switches.S3 === 'thyristor' &&
        params.switches.S5 === 'thyristor' &&
        params.switches.S4 === 'diode' &&
        params.switches.S6 === 'diode' &&
        params.switches.S2 === 'diode'
      : false;

  // Compute detailed conducting device list specifying Diode vs Thyristor
  const conductingDetails = conducting.map((id) => {
    if (id === 'FWD') {
      return { id: 'FWD', name: 'FWD', type: 'Freewheeling Diode', role: 'Freewheeling Loop' };
    }
    const swType = params.switches[id] || 'diode';
    return {
      id,
      name: id,
      type: swType === 'thyristor' ? 'Thyristor (SCR)' : 'Diode (Uncontrolled)',
      role: swType === 'thyristor' ? `Firing Angle α=${params.firingAngleDeg}°` : 'Natural Forward Bias',
    };
  });

  const thetaDeg = currentSample?.thetaDeg ?? 0;
  const timeMs = (currentSample?.time ?? 0) * 1000;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* 1. TOP HEADER TOOLBAR: Signature + Schematic Model Selection Window right next to Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800">
        {/* Left: Circuit Schematic Title + Student Signature */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Circuit Schematic
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          {/* Prominent Student Signature */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-semibold text-white">Ambati Hruday</span>
            <span className="text-cyan-400/50">|</span>
            <span>Roll No. 24EE10035</span>
          </div>
        </div>

        {/* Right: Circuit Schematic Selection Window right next to Reset Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="schematic-model-select" className="text-xs text-slate-300 font-semibold whitespace-nowrap">
              Circuit Schematic:
            </label>
            <select
              id="schematic-model-select"
              value={params.topology}
              onChange={(e) => onTopologyChange(e.target.value as TopologyType)}
              className="bg-slate-900 border border-cyan-600/50 text-cyan-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none font-semibold cursor-pointer shadow-sm hover:border-cyan-500 transition-colors"
            >
              <option value="1ph-bridge">1φ Full-Wave Bridge (4 Switches)</option>
              <option value="1ph-half">1φ Half-Wave (1 Switch)</option>
              <option value="1ph-midpoint">1φ Center-Tapped Midpoint (2 Switches)</option>
              <option value="3ph-bridge">3φ 6-Pulse Bridge (6 Switches)</option>
              <option value="3ph-half">3φ Half-Wave Star (3 Switches)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onResetToDefault}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer border border-slate-700 shadow-sm"
            title="Reset circuit configuration to default"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 2. DEDICATED LIVE CONDUCTION STATUS STRIP: Stabilized layout with fixed tabular-nums and no wrapping jitter */}
      <div className="h-9 min-h-[36px] max-h-[36px] px-3 sm:px-4 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border-b border-slate-800/90 flex items-center justify-between gap-2.5 text-xs overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap shrink-0 max-w-[72%]">
          {/* Static Title Label */}
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Active:
          </span>

          {/* Jitter-free Timing Metric Pill with Fixed-width Tabular Numerals */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded shrink-0">
            <span className="text-slate-400">θ:</span>
            <span className="w-14 text-right inline-block tabular-nums font-bold text-cyan-300">
              {thetaDeg.toFixed(1)}°
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">t:</span>
            <span className="w-16 text-right inline-block tabular-nums font-bold text-white">
              {timeMs.toFixed(2)} ms
            </span>
          </div>

          {/* Conducting Devices List - strictly non-wrapping */}
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {conductingDetails.length > 0 ? (
              conductingDetails.map((device) => (
                <span
                  key={device.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_8px_rgba(16,185,129,0.25)] shrink-0 whitespace-nowrap"
                  title={`${device.name}: ${device.type} - ${device.role}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{device.name}</span>
                  <span className="text-emerald-400/70 font-sans font-medium text-[11px]">
                    ({device.type})
                  </span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400 font-mono text-xs shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Blocking (Off)
              </span>
            )}
          </div>
        </div>

        {/* Live probe readings with fixed tabular-nums width (prevents horizontal movement) */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded">
          <span className="text-amber-400 font-semibold">v_o:</span>
          <span className="w-16 text-right inline-block tabular-nums font-bold text-amber-300">
            {vO.toFixed(1)} V
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">i_o:</span>
          <span className="w-16 text-right inline-block tabular-nums font-bold text-emerald-300">
            {iO.toFixed(2)} A
          </span>
        </div>
      </div>

      {/* 3. SWITCH CONTROLS & CURRENT FLOW LEGEND STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Device Interchange:</span>
          <button
            type="button"
            onClick={() => handleSetAllSwitches('diode')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              isAllDiode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            All Diodes
          </button>
          <button
            type="button"
            onClick={() => handleSetAllSwitches('thyristor')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              isAllThyristor
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            All Thyristors
          </button>
          {params.topology.includes('bridge') && (
            <>
              <button
                type="button"
                onClick={handleSetUpperDiodes}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  isUpperDiodesActive
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 font-bold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title="Upper components diodes, lower components thyristors (Symmetrical Semi-Converter)"
              >
                Upper Diodes
              </button>
              <button
                type="button"
                onClick={handleSetLowerDiodes}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  isLowerDiodesActive
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 font-bold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title="Lower components diodes, upper components thyristors (Symmetrical Semi-Converter)"
              >
                Lower Diodes
              </button>
            </>
          )}

          {/* Model toggle: Ideal vs Non-Ideal */}
          <button
            type="button"
            onClick={handleToggleIdealModel}
            className={`px-2.5 py-0.5 text-[11px] font-mono font-bold rounded transition-colors whitespace-nowrap cursor-pointer ${
              isIdealModel
                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title="Toggle between ideal lossless switch model (0V drop) and practical non-ideal switches"
          >
            {isIdealModel ? '⚡ Switch Model: Ideal (0V)' : '🔬 Switch Model: Non-Ideal'}
          </button>
        </div>

        {/* Current Flow Indication Legend */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Green arrows & animated dashes indicate current flow direction
          </span>
          <button
            type="button"
            onClick={handleToggleFwd}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
              params.freewheelingDiode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {params.freewheelingDiode ? 'FWD Enabled' : 'Enable FWD'}
          </button>
        </div>
      </div>

      {/* 4. DEDICATED DEVICE VOLTAGE MULTIMETER PROBE STRIP */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-rose-400 font-bold flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Device Voltage Probe (v_AK):
          </span>

          {/* Quick Switch Selection Buttons with Clear/Unselect button */}
          <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-0.5 rounded-lg">
            {/* Clear / Unselect button */}
            <button
              type="button"
              onClick={handleClearProbe}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                activeProbedSwitch === null
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800'
              }`}
              title="Unselect probe (show normal schematic with no probed switch)"
            >
              None (Unselect)
            </button>

            {availableSwitches.map((swId) => {
              const isSelected = activeProbedSwitch === swId;
              const isSwThyristor = swId !== 'FWD' && params.switches[swId] === 'thyristor';
              return (
                <button
                  key={swId}
                  type="button"
                  onClick={() => handleSelectProbe(swId)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/20 border border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800'
                  }`}
                  title={`Measure voltage v_AK across ${swId} (${isSwThyristor ? 'Thyristor' : 'Diode'}) - Click to toggle probe`}
                >
                  {swId}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            (Click 🔍 on any switch or select above to probe; click again or &quot;None&quot; to unselect)
          </span>
        </div>

        {/* Live Multimeter Readout for Probed Device */}
        {activeProbedSwitch ? (
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-950 border border-rose-950/80 px-3 py-1 rounded-lg shadow-sm">
            <span className="text-slate-400">v_AK({activeProbedSwitch}):</span>
            <span className="w-16 text-right inline-block tabular-nums font-bold text-rose-400">
              {probedVoltage >= 0 ? '+' : ''}{probedVoltage.toFixed(1)} V
            </span>
            <span className="text-slate-600">|</span>
            <span
              className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                isProbedConducting
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                  : probedVoltage > 0.5
                  ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                  : 'bg-rose-950 text-rose-400 border border-rose-700/60'
              }`}
            >
              {isProbedConducting
                ? 'CONDUCTING (ON)'
                : probedVoltage > 0.5
                ? 'FORWARD BLOCKING'
                : 'REVERSE BLOCKING'}
            </span>
            <span className="text-slate-400 text-[10px] hidden sm:inline">
              ({isIdealModel ? 'Ideal' : 'Non-Ideal'} {probedSwitchType})
            </span>
            <button
              type="button"
              onClick={handleClearProbe}
              className="ml-1 text-slate-500 hover:text-rose-300 font-sans text-xs cursor-pointer px-1"
              title="Unselect probe"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>Probe Inactive</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-500 font-sans">
              All switches in normal view
            </span>
          </div>
        )}
      </div>

      {/* Schematic SVG canvas */}
      <div className="p-2 sm:p-4 bg-slate-950 flex justify-center items-center">
        {params.topology === '1ph-half' && (
          <SinglePhaseHalfWave
            params={params}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={handleToggleSwitch}
            onToggleFwd={handleToggleFwd}
            probedSwitchId={activeProbedSwitch || undefined}
            onSelectProbeSwitch={handleSelectProbe}
            switchVoltages={switchVoltages}
          />
        )}
        {params.topology === '1ph-midpoint' && (
          <SinglePhaseMidpoint
            params={params}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={handleToggleSwitch}
            onToggleFwd={handleToggleFwd}
            probedSwitchId={activeProbedSwitch || undefined}
            onSelectProbeSwitch={handleSelectProbe}
            switchVoltages={switchVoltages}
          />
        )}
        {params.topology === '1ph-bridge' && (
          <SinglePhaseBridge
            params={params}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            instantaneousIs={currentSample?.iSourceA ?? 0}
            onToggleSwitch={handleToggleSwitch}
            onToggleFwd={handleToggleFwd}
            probedSwitchId={activeProbedSwitch || undefined}
            onSelectProbeSwitch={handleSelectProbe}
            switchVoltages={switchVoltages}
          />
        )}
        {params.topology === '3ph-half' && (
          <ThreePhaseHalfWave
            params={params}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={handleToggleSwitch}
            onToggleFwd={handleToggleFwd}
            probedSwitchId={activeProbedSwitch || undefined}
            onSelectProbeSwitch={handleSelectProbe}
            switchVoltages={switchVoltages}
          />
        )}
        {params.topology === '3ph-bridge' && (
          <ThreePhaseBridge
            params={params}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            instantaneousIsA={currentSample?.iSourceA ?? 0}
            instantaneousIsB={currentSample?.iSourceB ?? 0}
            instantaneousIsC={currentSample?.iSourceC ?? 0}
            onToggleSwitch={handleToggleSwitch}
            onToggleFwd={handleToggleFwd}
            probedSwitchId={activeProbedSwitch || undefined}
            onSelectProbeSwitch={handleSelectProbe}
            switchVoltages={switchVoltages}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          Click any switch in the diagram to swap between Diode and Thyristor interactively.
        </span>
        <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">
          IIT Kharagpur Power Electronics Laboratory Standard
        </span>
      </div>
    </div>
  );
};
