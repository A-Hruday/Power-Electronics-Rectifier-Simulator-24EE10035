import React from 'react';
import { CircuitParameters, TopologyType, LoadType } from '../types/powerElectronics';
import { PRESETS } from '../simulation/presets';
import { getDefaultSwitches } from '../simulation/engine';

interface ControlDeckProps {
  params: CircuitParameters;
  onChange: (updated: Partial<CircuitParameters>) => void;
  onApplyPreset: (presetId: string) => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  params,
  onChange,
  onApplyPreset,
}) => {
  const handleTopologyChange = (newTopology: TopologyType) => {
    // Preserve switches as much as possible or reset to defaults
    const newSwitches = getDefaultSwitches(newTopology, 'diode');
    onChange({
      topology: newTopology,
      switches: newSwitches,
    });
  };

  const hasAnyThyristor = Object.values(params.switches).some((s) => s === 'thyristor');
  const vRms = (params.peakVoltage / Math.SQRT2).toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header with Preset Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Circuit Configuration & Electrical Parameters
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure AC source, thyristor firing angle α, switches, and load impedance.
          </p>
        </div>

        {/* Textbook Presets */}
        <div className="flex items-center gap-2">
          <label htmlFor="preset-select" className="text-xs text-slate-400">
            Quick Preset:
          </label>
          <select
            id="preset-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
          >
            <option value="" disabled>
              Select textbook example...
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* COL 1: Topology & AC Source */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300">1. Topology & Grid</div>

          {/* Topology Select */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Rectifier Model</label>
            <select
              value={params.topology}
              onChange={(e) => handleTopologyChange(e.target.value as TopologyType)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-cyan-500 focus:outline-none"
            >
              <option value="1ph-half">1-Phase Half-Wave (1 Switch)</option>
              <option value="1ph-midpoint">1-Phase Mid-Point Center-Tap (2 Switches)</option>
              <option value="1ph-bridge">1-Phase Full-Wave Bridge (4 Switches)</option>
              <option value="3ph-half">3-Phase Half-Wave Star (3 Switches)</option>
              <option value="3ph-bridge">3-Phase 6-Pulse Full Bridge (6 Switches)</option>
            </select>
          </div>

          {/* Peak Source Voltage */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Peak Voltage (Vm):</span>
              <span className="font-mono text-cyan-400 font-bold">
                {params.peakVoltage} V <span className="text-slate-500 font-normal">({vRms} Vrms)</span>
              </span>
            </div>
            <input
              type="range"
              min="24"
              max="600"
              step="1"
              value={params.peakVoltage}
              onChange={(e) => onChange({ peakVoltage: Number(e.target.value) })}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Source Frequency */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Frequency:</span>
            <div className="flex gap-1.5">
              {[50, 60].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onChange({ frequency: freq })}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                    params.frequency === freq
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {freq} Hz
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COL 2: Thyristor Firing Angle α */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">2. Firing Angle (α)</span>
            {!hasAnyThyristor && (
              <span className="text-[10px] text-amber-400/90 font-mono">Diode Mode</span>
            )}
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Trigger Delay:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">
                {params.firingAngleDeg}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={params.topology.startsWith('3ph') ? 150 : 170}
              step="1"
              value={params.firingAngleDeg}
              disabled={!hasAnyThyristor}
              onChange={(e) => onChange({ firingAngleDeg: Number(e.target.value) })}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Quick Alpha Buttons */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            {[0, 30, 60, 90].map((ang) => (
              <button
                key={ang}
                type="button"
                disabled={!hasAnyThyristor}
                onClick={() => onChange({ firingAngleDeg: ang })}
                className={`py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer disabled:opacity-40 ${
                  params.firingAngleDeg === ang
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ang}°
              </button>
            ))}
          </div>

          {/* Component Model: Ideal vs Non-Ideal switches */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                Component Model
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  params.switchModel === 'ideal' || (params.switchModel !== 'non-ideal' && params.forwardDrop === 0)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {params.switchModel === 'ideal' || (params.switchModel !== 'non-ideal' && params.forwardDrop === 0)
                  ? '⚡ Ideal Switches'
                  : '🔬 Practical (Non-Ideal)'}
              </span>
            </div>

            {/* Toggle: Ideal vs Non-Ideal */}
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    switchModel: 'ideal',
                    forwardDrop: 0,
                  })
                }
                className={`py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  params.switchModel === 'ideal' || (params.switchModel !== 'non-ideal' && params.forwardDrop === 0)
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Ideal (0V Drop)
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    switchModel: 'non-ideal',
                    forwardDrop: params.diodeForwardDrop ?? (params.forwardDrop > 0 ? params.forwardDrop : 0.7),
                    diodeForwardDrop: params.diodeForwardDrop ?? (params.forwardDrop > 0 ? params.forwardDrop : 0.7),
                    thyristorForwardDrop: params.thyristorForwardDrop ?? 1.4,
                    switchResistance: params.switchResistance ?? 0.02,
                  })
                }
                className={`py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  params.switchModel === 'non-ideal' || (params.switchModel !== 'ideal' && params.forwardDrop > 0)
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/60 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔬 Non-Ideal (Real)
              </button>
            </div>

            {/* If Ideal Model Active */}
            {(params.switchModel === 'ideal' || (params.switchModel !== 'non-ideal' && params.forwardDrop === 0)) ? (
              <div className="p-2 rounded bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-200/90 leading-tight space-y-1">
                <div className="flex items-center gap-1 font-semibold text-amber-300">
                  <span>Zero Forward Voltage Drop (Vf = 0V)</span>
                </div>
                <p className="text-slate-400">
                  Lossless instantaneous switching. Theoretical textbook behavior with zero Ron.
                </p>
              </div>
            ) : (
              /* If Non-Ideal Model Active */
              <div className="space-y-2.5 pt-1">
                {/* Diode Forward Drop */}
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-300 mb-1">
                    <span className="font-semibold text-cyan-300">Diode Drop (Vf_diode):</span>
                    <span className="font-mono font-bold text-white">
                      {(params.diodeForwardDrop ?? (params.forwardDrop > 0 ? params.forwardDrop : 0.7)).toFixed(2)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={params.diodeForwardDrop ?? (params.forwardDrop > 0 ? params.forwardDrop : 0.7)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onChange({
                        switchModel: 'non-ideal',
                        diodeForwardDrop: val,
                        forwardDrop: val,
                      });
                    }}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex gap-1 mt-1">
                    {[
                      { label: '0.3V (Schottky)', val: 0.3 },
                      { label: '0.7V (Silicon)', val: 0.7 },
                      { label: '1.0V (Power)', val: 1.0 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          onChange({
                            switchModel: 'non-ideal',
                            diodeForwardDrop: item.val,
                            forwardDrop: item.val,
                          })
                        }
                        className={`flex-1 py-0.5 text-[9px] rounded font-mono transition-colors cursor-pointer ${
                          (params.diodeForwardDrop ?? 0.7) === item.val
                            ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thyristor Forward Drop */}
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-300 mb-1">
                    <span className="font-semibold text-amber-300">SCR Drop (Vf_thyristor):</span>
                    <span className="font-mono font-bold text-white">
                      {(params.thyristorForwardDrop ?? 1.4).toFixed(2)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="3.0"
                    step="0.05"
                    value={params.thyristorForwardDrop ?? 1.4}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onChange({
                        switchModel: 'non-ideal',
                        thyristorForwardDrop: val,
                      });
                    }}
                    className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex gap-1 mt-1">
                    {[
                      { label: '1.2V (Low-V)', val: 1.2 },
                      { label: '1.4V (Std SCR)', val: 1.4 },
                      { label: '1.8V (HV SCR)', val: 1.8 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          onChange({
                            switchModel: 'non-ideal',
                            thyristorForwardDrop: item.val,
                          })
                        }
                        className={`flex-1 py-0.5 text-[9px] rounded font-mono transition-colors cursor-pointer ${
                          (params.thyristorForwardDrop ?? 1.4) === item.val
                            ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch On-Resistance (Ron) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-850">
                  <span>Switch Resistance (R_on):</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="range"
                      min="0.00"
                      max="0.20"
                      step="0.01"
                      value={params.switchResistance ?? 0.02}
                      onChange={(e) =>
                        onChange({
                          switchModel: 'non-ideal',
                          switchResistance: Number(e.target.value),
                        })
                      }
                      className="w-16 accent-emerald-400 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                    <span className="text-emerald-300 font-bold w-12 text-right">
                      {(params.switchResistance ?? 0.02).toFixed(2)} Ω
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COL 3: Load Configuration */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300">3. Load Type</div>

          <div className="grid grid-cols-3 gap-1">
            {[
              { type: 'R', label: 'Resistive' },
              { type: 'RL', label: 'R-L Inductive' },
              { type: 'RLE', label: 'R-L-E (Motor)' },
            ].map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => onChange({ loadType: opt.type as LoadType })}
                className={`py-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer text-center ${
                  params.loadType === opt.type
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Resistance R */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Resistance (R):</span>
              <span className="font-mono text-cyan-400 font-bold">{params.resistance} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={params.resistance}
              onChange={(e) => onChange({ resistance: Number(e.target.value) })}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Inductance L (if RL or RLE) */}
          {params.loadType !== 'R' && (
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Inductance (L):</span>
                <span className="font-mono text-cyan-400 font-bold">{params.inductance} mH</span>
              </div>
              <input
                type="range"
                min="1"
                max="300"
                step="2"
                value={params.inductance}
                onChange={(e) => onChange({ inductance: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* COL 4: Motor Back-EMF & Free-Wheeling Diode */}
        <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300">4. DC Source & Freewheeling</div>

          {/* Back EMF if RLE */}
          {params.loadType === 'RLE' ? (
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>DC Back-EMF (E):</span>
                <span className="font-mono text-amber-400 font-bold">{params.backEmf} V</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(250, params.peakVoltage - 10)}
                step="5"
                value={params.backEmf}
                onChange={(e) => onChange({ backEmf: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 italic p-2 bg-slate-900/60 rounded border border-slate-900">
              Select &quot;R-L-E&quot; load to model a DC motor armature or battery charger back-EMF.
            </div>
          )}

          {/* Free-Wheeling Diode Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onChange({ freewheelingDiode: !params.freewheelingDiode })}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                params.freewheelingDiode
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="text-left">
                <div className="font-semibold">Free-Wheeling Diode (FWD)</div>
                <div className="text-[10px] text-slate-400">
                  Clamps negative voltage & dissipates energy
                </div>
              </div>
              <span className="font-mono font-bold text-xs">
                {params.freewheelingDiode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
