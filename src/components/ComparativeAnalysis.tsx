import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sliders, Layers, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { CircuitParameters, SimulationResult, TopologyType, LoadType } from '../types/powerElectronics';
import { COMPARISON_PAIRS, ComparisonPair } from '../simulation/presets';
import { simulateRectifier, getDefaultSwitches } from '../simulation/engine';
import { SinglePhaseBridge } from './schematics/SinglePhaseBridge';
import { SinglePhaseHalfWave } from './schematics/SinglePhaseHalfWave';
import { SinglePhaseMidpoint } from './schematics/SinglePhaseMidpoint';
import { ThreePhaseHalfWave } from './schematics/ThreePhaseHalfWave';
import { ThreePhaseBridge } from './schematics/ThreePhaseBridge';

interface ComparativeAnalysisProps {
  currentModel: CircuitParameters;
  onApplyModelToMain: (model: CircuitParameters) => void;
}

export const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({
  currentModel,
  onApplyModelToMain,
}) => {
  const [selectedPairId, setSelectedPairId] = useState<string>(COMPARISON_PAIRS[0].id);
  const [modelA, setModelA] = useState<CircuitParameters>({ ...COMPARISON_PAIRS[0].modelA });
  const [modelB, setModelB] = useState<CircuitParameters>({ ...COMPARISON_PAIRS[0].modelB });
  const [activeSignal, setActiveSignal] = useState<'vo' | 'io' | 'is' | 'vt'>('vo');
  const [showSchematics, setShowSchematics] = useState<boolean>(true);
  const [cursorIdx, setCursorIdx] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // When benchmark preset changes
  const handleSelectPair = (pair: ComparisonPair) => {
    setSelectedPairId(pair.id);
    setModelA({ ...pair.modelA });
    setModelB({ ...pair.modelB });
    setCursorIdx(0);
  };

  const handleCopyCurrentToA = () => {
    setModelA({ ...currentModel });
  };

  const handleCopyCurrentToB = () => {
    setModelB({ ...currentModel });
  };

  // Run simulations for both models
  const resultA: SimulationResult = React.useMemo(() => simulateRectifier(modelA), [modelA]);
  const resultB: SimulationResult = React.useMemo(() => simulateRectifier(modelB), [modelB]);

  const sampleA = resultA.samples[cursorIdx] || resultA.samples[0];
  const sampleB = resultB.samples[cursorIdx] || resultB.samples[0];

  // Helper parameter updaters for Model A
  const updateModelA = (partial: Partial<CircuitParameters>) => {
    setModelA((prev) => ({ ...prev, ...partial }));
  };

  // Helper parameter updaters for Model B
  const updateModelB = (partial: Partial<CircuitParameters>) => {
    setModelB((prev) => ({ ...prev, ...partial }));
  };

  const handleTopologyChangeA = (newTop: TopologyType) => {
    setModelA((prev) => ({
      ...prev,
      topology: newTop,
      switches: getDefaultSwitches(newTop, 'diode'),
    }));
  };

  const handleTopologyChangeB = (newTop: TopologyType) => {
    setModelB((prev) => ({
      ...prev,
      topology: newTop,
      switches: getDefaultSwitches(newTop, 'diode'),
    }));
  };

  const setSwitchMode = (
    modelSetter: React.Dispatch<React.SetStateAction<CircuitParameters>>,
    mode: 'all-diode' | 'all-thyristor' | 'upper-diode' | 'lower-diode'
  ) => {
    modelSetter((prev) => {
      const updated = { ...prev.switches };
      if (mode === 'all-diode') {
        Object.keys(updated).forEach((k) => (updated[k] = 'diode'));
      } else if (mode === 'all-thyristor') {
        Object.keys(updated).forEach((k) => (updated[k] = 'thyristor'));
      } else if (mode === 'upper-diode') {
        // Upper diodes, lower thyristors
        if (prev.topology === '1ph-bridge') {
          updated.S1 = 'diode';
          updated.S3 = 'diode';
          updated.S4 = 'thyristor';
          updated.S2 = 'thyristor';
        } else if (prev.topology === '3ph-bridge') {
          updated.S1 = 'diode';
          updated.S3 = 'diode';
          updated.S5 = 'diode';
          updated.S4 = 'thyristor';
          updated.S6 = 'thyristor';
          updated.S2 = 'thyristor';
        }
      } else if (mode === 'lower-diode') {
        // Lower diodes, upper thyristors
        if (prev.topology === '1ph-bridge') {
          updated.S1 = 'thyristor';
          updated.S3 = 'thyristor';
          updated.S4 = 'diode';
          updated.S2 = 'diode';
        } else if (prev.topology === '3ph-bridge') {
          updated.S1 = 'thyristor';
          updated.S3 = 'thyristor';
          updated.S5 = 'thyristor';
          updated.S4 = 'diode';
          updated.S6 = 'diode';
          updated.S2 = 'diode';
        }
      }
      return { ...prev, switches: updated };
    });
  };

  // Render Dual Overlaid Waveforms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const padL = 55;
    const padR = 20;
    const padT = 20;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const samplesA = resultA.samples;
    const samplesB = resultB.samples;
    const len = Math.min(samplesA.length, samplesB.length);

    let maxVal = -Infinity;
    let minVal = Infinity;

    const getVal = (s: typeof samplesA[0], sig: 'vo' | 'io' | 'is' | 'vt') => {
      if (sig === 'vo') return s.vOutput;
      if (sig === 'io') return s.iOutput;
      if (sig === 'is') return s.iSourceA;
      return s.vSwitch1;
    };

    for (let i = 0; i < len; i++) {
      const vA = getVal(samplesA[i], activeSignal);
      const vB = getVal(samplesB[i], activeSignal);
      if (vA > maxVal) maxVal = vA;
      if (vB > maxVal) maxVal = vB;
      if (vA < minVal) minVal = vA;
      if (vB < minVal) minVal = vB;
    }

    if (maxVal === minVal) {
      maxVal += 1;
      minVal -= 1;
    }
    const padRange = (maxVal - minVal) * 0.12;
    maxVal += padRange;
    minVal -= padRange;

    const getX = (i: number) => padL + (i / (len - 1)) * plotW;
    const getY = (v: number) => padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    for (let s = 0; s <= 4; s++) {
      const val = minVal + (s / 4) * (maxVal - minVal);
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), padL - 8, y + 3);
    }

    // Zero reference line
    const y0 = getY(0);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, y0);
    ctx.lineTo(padL + plotW, y0);
    ctx.stroke();

    // Circuit A curve (Cyan Solid)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = getX(i);
      const y = getY(getVal(samplesA[i], activeSignal));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Circuit B curve (Amber Dashed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = getX(i);
      const y = getY(getVal(samplesB[i], activeSignal));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Scrubber line at cursorIdx
    if (cursorIdx >= 0 && cursorIdx < len) {
      const curX = getX(cursorIdx);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curX, padT);
      ctx.lineTo(curX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight point A
      const curYA = getY(getVal(samplesA[cursorIdx], activeSignal));
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(curX, curYA, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Highlight point B
      const curYB = getY(getVal(samplesB[cursorIdx], activeSignal));
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(curX, curYB, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }, [resultA, resultB, activeSignal, cursorIdx]);

  const mA = resultA.metrics;
  const mB = resultB.metrics;

  const diffVDc = mB.vDc - mA.vDc;
  const diffRF = (mB.rippleFactorV - mA.rippleFactorV) * 100;
  const diffTHD = mB.thdCurrent - mA.thdCurrent;
  const diffPF = mB.powerFactor - mA.powerFactor;

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    if (!canvas || resultA.samples.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padL = 55;
    const padR = 20;
    const plotW = rect.width - padL - padR;

    const clampedX = Math.max(0, Math.min(plotW, x - padL));
    const ratio = clampedX / plotW;
    const len = Math.min(resultA.samples.length, resultB.samples.length);
    const newIdx = Math.min(len - 1, Math.max(0, Math.round(ratio * (len - 1))));
    setCursorIdx(newIdx);
  };

  const renderSchematicFor = (
    model: CircuitParameters,
    result: SimulationResult,
    onToggleSw: (swId: string) => void,
    onToggleFwd: () => void
  ) => {
    const sample = result.samples[cursorIdx] || result.samples[0];
    const conducting = sample.conductingSwitches || [];
    const vS = sample.vSourceA ?? 0;
    const vO = sample.vOutput ?? 0;
    const iO = sample.iOutput ?? 0;

    switch (model.topology) {
      case '1ph-half':
        return (
          <SinglePhaseHalfWave
            params={model}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={onToggleSw}
            onToggleFwd={onToggleFwd}
            switchVoltages={sample.switchVoltages}
          />
        );
      case '1ph-midpoint':
        return (
          <SinglePhaseMidpoint
            params={model}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={onToggleSw}
            onToggleFwd={onToggleFwd}
            switchVoltages={sample.switchVoltages}
          />
        );
      case '1ph-bridge':
        return (
          <SinglePhaseBridge
            params={model}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={onToggleSw}
            onToggleFwd={onToggleFwd}
            switchVoltages={sample.switchVoltages}
          />
        );
      case '3ph-half':
        return (
          <ThreePhaseHalfWave
            params={model}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={onToggleSw}
            onToggleFwd={onToggleFwd}
            switchVoltages={sample.switchVoltages}
          />
        );
      case '3ph-bridge':
        return (
          <ThreePhaseBridge
            params={model}
            conductingSwitches={conducting}
            instantaneousVs={vS}
            instantaneousVo={vO}
            instantaneousIo={iO}
            onToggleSwitch={onToggleSw}
            onToggleFwd={onToggleFwd}
            switchVoltages={sample.switchVoltages}
          />
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl space-y-6">
      {/* 1. Master Header with Preset Benchmarks and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Comparative Circuit Analysis Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare two distinct rectifier circuits side-by-side with interactive schematics, real-time parameter tuning, and overlaid oscilloscope waveforms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSchematics(!showSchematics)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {showSchematics ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{showSchematics ? 'Hide Schematics' : 'Show Schematics'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCurrentToA}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-800 transition-colors cursor-pointer"
            title="Load the simulator's current configuration into Circuit A"
          >
            Copy to Circuit A
          </button>
          <button
            type="button"
            onClick={handleCopyCurrentToB}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 transition-colors cursor-pointer"
            title="Load the simulator's current configuration into Circuit B"
          >
            Copy to Circuit B
          </button>
        </div>
      </div>

      {/* Preset tabs */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
          One-Click Benchmark Experiments:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {COMPARISON_PAIRS.map((pair) => (
            <button
              key={pair.id}
              type="button"
              onClick={() => handleSelectPair(pair)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedPairId === pair.id
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-bold">{pair.title}</div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pair.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Side-by-Side Circuit Workbench: Circuit A vs Circuit B */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* =========================================
            CIRCUIT A CARD (Sky Theme)
           ========================================= */}
        <div className="bg-slate-950/90 border-2 border-sky-600/40 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-sky-950/80 to-slate-900 border-b border-sky-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                <h3 className="text-sm font-bold text-sky-200 tracking-wide uppercase">
                  Circuit Model A
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 font-semibold border border-sky-700/60">
                  {modelA.topology}
                </span>
              </div>
              <div className="text-xs font-mono text-sky-300">
                α = {modelA.firingAngleDeg}° | {modelA.loadType} Load
              </div>
            </div>

            {/* Parameter Tuning Controls Panel */}
            <div className="p-3.5 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Topology Select */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Topology:
                  </label>
                  <select
                    value={modelA.topology}
                    onChange={(e) => handleTopologyChangeA(e.target.value as TopologyType)}
                    className="w-full bg-slate-950 border border-sky-700/50 text-sky-200 text-xs rounded-lg px-2 py-1.5 focus:border-sky-400 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="1ph-bridge">1φ Full-Wave Bridge (4 Switches)</option>
                    <option value="1ph-half">1φ Half-Wave (1 Switch)</option>
                    <option value="1ph-midpoint">1φ Mid-Point Center-Tap (2 Switches)</option>
                    <option value="3ph-bridge">3φ 6-Pulse Full Bridge (6 Switches)</option>
                    <option value="3ph-half">3φ Half-Wave Star (3 Switches)</option>
                  </select>
                </div>

                {/* Firing Angle Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>Firing Angle α:</span>
                    <span className="font-mono text-sky-400 font-bold">{modelA.firingAngleDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="1"
                    value={modelA.firingAngleDeg}
                    onChange={(e) => updateModelA({ firingAngleDeg: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Load Configuration Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                {/* Load Type */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Load Type:</label>
                  <div className="flex rounded-md overflow-hidden border border-slate-800">
                    {(['R', 'RL', 'RLE'] as LoadType[]).map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => updateModelA({ loadType: lt })}
                        className={`flex-1 py-1 text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                          modelA.loadType === lt
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {lt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resistance R */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">R (Ω):</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={modelA.resistance}
                    onChange={(e) => updateModelA({ resistance: Math.max(0.1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>

                {/* Inductance L */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">L (mH):</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    disabled={modelA.loadType === 'R'}
                    value={modelA.loadType === 'R' ? 0 : modelA.inductance}
                    onChange={(e) => updateModelA({ inductance: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                  />
                </div>

                {/* Back EMF E */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">EMF E (V):</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    disabled={modelA.loadType !== 'RLE'}
                    value={modelA.loadType === 'RLE' ? modelA.backEmf : 0}
                    onChange={(e) => updateModelA({ backEmf: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Quick switch configuration buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Switches:</span>
                  <button
                    type="button"
                    onClick={() => setSwitchMode(setModelA, 'all-diode')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    All Diodes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwitchMode(setModelA, 'all-thyristor')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    All SCRs
                  </button>
                  {modelA.topology.includes('bridge') && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSwitchMode(setModelA, 'upper-diode')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 cursor-pointer"
                        title="Top switches diodes, bottom switches thyristors"
                      >
                        Upper Diodes
                      </button>
                      <button
                        type="button"
                        onClick={() => setSwitchMode(setModelA, 'lower-diode')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 cursor-pointer"
                        title="Bottom switches diodes, top switches thyristors"
                      >
                        Lower Diodes
                      </button>
                    </>
                  )}
                  {/* Ideal vs Non-Ideal Toggle for Model A */}
                  <button
                    type="button"
                    onClick={() => {
                      const isIdeal =
                        modelA.switchModel === 'ideal' ||
                        (modelA.switchModel !== 'non-ideal' && modelA.forwardDrop === 0);
                      updateModelA({
                        switchModel: isIdeal ? 'non-ideal' : 'ideal',
                        forwardDrop: isIdeal ? (modelA.diodeForwardDrop ?? 0.7) : 0,
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      modelA.switchModel === 'ideal' ||
                      (modelA.switchModel !== 'non-ideal' && modelA.forwardDrop === 0)
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                    title="Toggle between ideal lossless switches and practical non-ideal switches"
                  >
                    {modelA.switchModel === 'ideal' ||
                    (modelA.switchModel !== 'non-ideal' && modelA.forwardDrop === 0)
                      ? '⚡ Ideal (0V)'
                      : '🔬 Practical'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => updateModelA({ freewheelingDiode: !modelA.freewheelingDiode })}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                    modelA.freewheelingDiode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {modelA.freewheelingDiode ? 'FWD Active' : 'Enable FWD'}
                </button>
              </div>
            </div>

            {/* Live Schematic Display */}
            {showSchematics && (
              <div className="bg-slate-950 p-2 overflow-x-auto border-b border-slate-800/80">
                {renderSchematicFor(
                  modelA,
                  resultA,
                  (swId) => {
                    const next = modelA.switches[swId] === 'diode' ? 'thyristor' : 'diode';
                    updateModelA({ switches: { ...modelA.switches, [swId]: next } });
                  },
                  () => updateModelA({ freewheelingDiode: !modelA.freewheelingDiode })
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Footer for Circuit A */}
          <div className="p-3 bg-sky-950/40 border-t border-sky-800/40 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">V_dc</span>
              <strong className="text-sky-300 font-bold">{mA.vDc.toFixed(1)}V</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">V_rms</span>
              <strong className="text-slate-200">{mA.vRms.toFixed(1)}V</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">I_dc</span>
              <strong className="text-emerald-400">{mA.iDc.toFixed(2)}A</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Ripple</span>
              <strong className="text-amber-300">{(mA.rippleFactorV * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">THD_i</span>
              <strong className="text-purple-300">{mA.thdCurrent.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">PF</span>
              <strong className="text-cyan-300">{mA.powerFactor.toFixed(3)}</strong>
            </div>
          </div>
        </div>

        {/* =========================================
            CIRCUIT B CARD (Amber Theme)
           ========================================= */}
        <div className="bg-slate-950/90 border-2 border-amber-600/40 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-sm font-bold text-amber-200 tracking-wide uppercase">
                  Circuit Model B
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-semibold border border-amber-700/60">
                  {modelB.topology}
                </span>
              </div>
              <div className="text-xs font-mono text-amber-300">
                α = {modelB.firingAngleDeg}° | {modelB.loadType} Load
              </div>
            </div>

            {/* Parameter Tuning Controls Panel */}
            <div className="p-3.5 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Topology Select */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Topology:
                  </label>
                  <select
                    value={modelB.topology}
                    onChange={(e) => handleTopologyChangeB(e.target.value as TopologyType)}
                    className="w-full bg-slate-950 border border-amber-700/50 text-amber-200 text-xs rounded-lg px-2 py-1.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="1ph-bridge">1φ Full-Wave Bridge (4 Switches)</option>
                    <option value="1ph-half">1φ Half-Wave (1 Switch)</option>
                    <option value="1ph-midpoint">1φ Mid-Point Center-Tap (2 Switches)</option>
                    <option value="3ph-bridge">3φ 6-Pulse Full Bridge (6 Switches)</option>
                    <option value="3ph-half">3φ Half-Wave Star (3 Switches)</option>
                  </select>
                </div>

                {/* Firing Angle Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>Firing Angle α:</span>
                    <span className="font-mono text-amber-400 font-bold">{modelB.firingAngleDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="1"
                    value={modelB.firingAngleDeg}
                    onChange={(e) => updateModelB({ firingAngleDeg: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Load Configuration Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                {/* Load Type */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Load Type:</label>
                  <div className="flex rounded-md overflow-hidden border border-slate-800">
                    {(['R', 'RL', 'RLE'] as LoadType[]).map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => updateModelB({ loadType: lt })}
                        className={`flex-1 py-1 text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                          modelB.loadType === lt
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {lt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resistance R */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">R (Ω):</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={modelB.resistance}
                    onChange={(e) => updateModelB({ resistance: Math.max(0.1, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>

                {/* Inductance L */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">L (mH):</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    disabled={modelB.loadType === 'R'}
                    value={modelB.loadType === 'R' ? 0 : modelB.inductance}
                    onChange={(e) => updateModelB({ inductance: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                  />
                </div>

                {/* Back EMF E */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">EMF E (V):</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    disabled={modelB.loadType !== 'RLE'}
                    value={modelB.loadType === 'RLE' ? modelB.backEmf : 0}
                    onChange={(e) => updateModelB({ backEmf: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Quick switch configuration buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Switches:</span>
                  <button
                    type="button"
                    onClick={() => setSwitchMode(setModelB, 'all-diode')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    All Diodes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwitchMode(setModelB, 'all-thyristor')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  >
                    All SCRs
                  </button>
                  {modelB.topology.includes('bridge') && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSwitchMode(setModelB, 'upper-diode')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                        title="Top switches diodes, bottom switches thyristors"
                      >
                        Upper Diodes
                      </button>
                      <button
                        type="button"
                        onClick={() => setSwitchMode(setModelB, 'lower-diode')}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                        title="Bottom switches diodes, top switches thyristors"
                      >
                        Lower Diodes
                      </button>
                    </>
                  )}
                  {/* Ideal vs Non-Ideal Toggle for Model B */}
                  <button
                    type="button"
                    onClick={() => {
                      const isIdeal =
                        modelB.switchModel === 'ideal' ||
                        (modelB.switchModel !== 'non-ideal' && modelB.forwardDrop === 0);
                      updateModelB({
                        switchModel: isIdeal ? 'non-ideal' : 'ideal',
                        forwardDrop: isIdeal ? (modelB.diodeForwardDrop ?? 0.7) : 0,
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      modelB.switchModel === 'ideal' ||
                      (modelB.switchModel !== 'non-ideal' && modelB.forwardDrop === 0)
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                    title="Toggle between ideal lossless switches and practical non-ideal switches"
                  >
                    {modelB.switchModel === 'ideal' ||
                    (modelB.switchModel !== 'non-ideal' && modelB.forwardDrop === 0)
                      ? '⚡ Ideal (0V)'
                      : '🔬 Practical'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => updateModelB({ freewheelingDiode: !modelB.freewheelingDiode })}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                    modelB.freewheelingDiode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {modelB.freewheelingDiode ? 'FWD Active' : 'Enable FWD'}
                </button>
              </div>
            </div>

            {/* Live Schematic Display */}
            {showSchematics && (
              <div className="bg-slate-950 p-2 overflow-x-auto border-b border-slate-800/80">
                {renderSchematicFor(
                  modelB,
                  resultB,
                  (swId) => {
                    const next = modelB.switches[swId] === 'diode' ? 'thyristor' : 'diode';
                    updateModelB({ switches: { ...modelB.switches, [swId]: next } });
                  },
                  () => updateModelB({ freewheelingDiode: !modelB.freewheelingDiode })
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Footer for Circuit B */}
          <div className="p-3 bg-amber-950/40 border-t border-amber-800/40 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">V_dc</span>
              <strong className="text-amber-300 font-bold">{mB.vDc.toFixed(1)}V</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">V_rms</span>
              <strong className="text-slate-200">{mB.vRms.toFixed(1)}V</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">I_dc</span>
              <strong className="text-emerald-400">{mB.iDc.toFixed(2)}A</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Ripple</span>
              <strong className="text-amber-300">{(mB.rippleFactorV * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">THD_i</span>
              <strong className="text-purple-300">{mB.thdCurrent.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">PF</span>
              <strong className="text-cyan-300">{mB.powerFactor.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Synchronized Dual Overlaid Oscilloscope Waveform Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-300">Compare Waveform:</span>
            {[
              { id: 'vo', label: 'Load Voltage (vo)' },
              { id: 'io', label: 'Load Current (io)' },
              { id: 'is', label: 'Source Line Current (is)' },
              { id: 'vt', label: 'Switch Voltage Stress (v_AK)' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSignal(s.id as 'vo' | 'io' | 'is' | 'vt')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeSignal === s.id
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-sm font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Legend and instant cursor reading */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-sky-400 rounded-sm" />
              <span className="text-sky-300 font-bold">
                Model A: {activeSignal === 'vo' ? sampleA.vOutput.toFixed(1) : activeSignal === 'io' ? sampleA.iOutput.toFixed(2) : activeSignal === 'is' ? sampleA.iSourceA.toFixed(2) : sampleA.vSwitch1.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 border-t-2 border-dashed border-amber-400" />
              <span className="text-amber-300 font-bold">
                Model B: {activeSignal === 'vo' ? sampleB.vOutput.toFixed(1) : activeSignal === 'io' ? sampleB.iOutput.toFixed(2) : activeSignal === 'is' ? sampleB.iSourceA.toFixed(2) : sampleB.vSwitch1.toFixed(1)}
              </span>
            </div>
            <div className="text-slate-400 border-l border-slate-800 pl-3">
              θ = <strong className="text-white">{sampleA.thetaDeg.toFixed(1)}°</strong>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-[240px] block cursor-crosshair touch-none rounded-lg"
          onPointerDown={handlePointer}
          onPointerMove={(e) => {
            if (e.buttons === 1) handlePointer(e);
          }}
        />
        <div className="text-right text-[11px] text-slate-500 font-mono">
          Click or scrub along the canvas to inspect instantaneous values at any electrical angle θ
        </div>
      </div>

      {/* 4. Comparative Quantitative Performance Matrix Table */}
      <div className="overflow-x-auto bg-slate-950/70 border border-slate-800/90 rounded-xl p-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
              <th className="py-2.5 px-3.5 font-bold">Performance Metric</th>
              <th className="py-2.5 px-3.5 font-bold text-sky-400">Model A ({modelA.topology})</th>
              <th className="py-2.5 px-3.5 font-bold text-amber-400">Model B ({modelB.topology})</th>
              <th className="py-2.5 px-3.5 font-bold text-slate-300">Delta (B − A)</th>
              <th className="py-2.5 px-3.5 font-bold text-slate-400">Engineering Interpretation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-300">Average DC Output (V_dc)</td>
              <td className="py-2.5 px-3.5 text-sky-300 font-bold">{mA.vDc.toFixed(1)} V</td>
              <td className="py-2.5 px-3.5 text-amber-300 font-bold">{mB.vDc.toFixed(1)} V</td>
              <td className={`py-2.5 px-3.5 font-bold ${diffVDc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diffVDc >= 0 ? `+${diffVDc.toFixed(1)}` : diffVDc.toFixed(1)} V
              </td>
              <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                {diffVDc > 0 ? 'Model B delivers higher average DC voltage to load' : 'Model B has lower DC voltage due to firing delay / topology'}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-300">Voltage Ripple Factor (RF)</td>
              <td className="py-2.5 px-3.5 text-sky-300 font-bold">{(mA.rippleFactorV * 100).toFixed(1)}%</td>
              <td className="py-2.5 px-3.5 text-amber-300 font-bold">{(mB.rippleFactorV * 100).toFixed(1)}%</td>
              <td className={`py-2.5 px-3.5 font-bold ${diffRF <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diffRF >= 0 ? `+${diffRF.toFixed(1)}` : diffRF.toFixed(1)}%
              </td>
              <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                {diffRF < 0 ? 'Model B provides smoother output requiring smaller LC filter' : 'Model B has higher harmonic ripple on DC terminal'}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-300">Input Current Distortion (THD_i)</td>
              <td className="py-2.5 px-3.5 text-sky-300 font-bold">{mA.thdCurrent.toFixed(1)}%</td>
              <td className="py-2.5 px-3.5 text-amber-300 font-bold">{mB.thdCurrent.toFixed(1)}%</td>
              <td className={`py-2.5 px-3.5 font-bold ${diffTHD <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diffTHD >= 0 ? `+${diffTHD.toFixed(1)}` : diffTHD.toFixed(1)}%
              </td>
              <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                {diffTHD < 0 ? 'Model B injects lower harmonic distortion into AC utility grid' : 'Model B creates higher grid pollution'}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-300">Input Power Factor (PF)</td>
              <td className="py-2.5 px-3.5 text-sky-300 font-bold">{mA.powerFactor.toFixed(3)}</td>
              <td className="py-2.5 px-3.5 text-amber-300 font-bold">{mB.powerFactor.toFixed(3)}</td>
              <td className={`py-2.5 px-3.5 font-bold ${diffPF >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diffPF >= 0 ? `+${diffPF.toFixed(3)}` : diffPF.toFixed(3)}
              </td>
              <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                {diffPF >= 0 ? 'Model B has higher electrical transmission utilization' : 'Model B draws increased reactive power from supply'}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-300">Semiconductor PIV Stress</td>
              <td className="py-2.5 px-3.5 text-sky-300 font-bold">{mA.peakInverseVoltageSw1.toFixed(1)} V</td>
              <td className="py-2.5 px-3.5 text-amber-300 font-bold">{mB.peakInverseVoltageSw1.toFixed(1)} V</td>
              <td className="py-2.5 px-3.5 text-slate-300 font-bold">
                {(mB.peakInverseVoltageSw1 - mA.peakInverseVoltageSw1).toFixed(1)} V
              </td>
              <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                Sets mandatory minimum peak inverse blocking rating for semiconductor devices
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Master Transfer Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => onApplyModelToMain(modelA)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-950 text-sky-200 border border-sky-700 text-xs font-bold hover:bg-sky-900 transition-colors cursor-pointer shadow-md"
        >
          <span>Load Circuit Model A into Main Simulator</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onApplyModelToMain(modelB)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-950 text-amber-200 border border-amber-700 text-xs font-bold hover:bg-amber-900 transition-colors cursor-pointer shadow-md"
        >
          <span>Load Circuit Model B into Main Simulator</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
