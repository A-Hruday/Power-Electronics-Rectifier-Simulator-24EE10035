import React, { useState, useMemo, useRef, useCallback } from 'react';
import { SimulationResult, SimulationSample } from '../types/powerElectronics';

interface DeviceConductionBarProps {
  simulation: SimulationResult;
  cursorIndex: number;
  onCursorChange?: React.Dispatch<React.SetStateAction<number>> | ((index: number) => void);
}

export type TimelineBarLayout = 'combined' | 'separate' | 'both';
export type TimelineSpanMode = '1cycle' | 'allCycles';

interface ConductionSegment {
  key: string;
  switches: string[];
  label: string;
  startIdx: number;
  endIdx: number;
  startAngleDeg: number;
  endAngleDeg: number;
  durationDeg: number;
  startPct: number;
  widthPct: number;
  bg: string;
  border: string;
  text: string;
  isActive: boolean;
}

export const DeviceConductionBar: React.FC<DeviceConductionBarProps> = ({
  simulation,
  cursorIndex,
  onCursorChange,
}) => {
  const { params, samples, cyclesSimulated = 2 } = simulation;
  const totalSamples = samples.length;
  const currentSample = samples[cursorIndex] || samples[0];
  const conductingSwitches = currentSample?.conductingSwitches || [];

  // Timeline view state: layout & span mode
  const [barLayout, setBarLayout] = useState<TimelineBarLayout>('combined');
  const [spanMode, setSpanMode] = useState<TimelineSpanMode>('1cycle');
  const [showDeviceTiles, setShowDeviceTiles] = useState<boolean>(false);
  const [hoveredSegment, setHoveredSegment] = useState<ConductionSegment | null>(null);

  // Number of samples in exactly 1 fundamental cycle
  const pointsPerCycle = useMemo(() => {
    return Math.max(1, Math.round(totalSamples / (cyclesSimulated || 1)));
  }, [totalSamples, cyclesSimulated]);

  // Determine list of switches in this topology
  const switchIds: string[] = useMemo(() => {
    if (params.topology === '1ph-half') return ['S1'];
    if (params.topology === '1ph-midpoint') return ['S1', 'S2'];
    if (params.topology === '1ph-bridge') return ['S1', 'S2', 'S3', 'S4'];
    if (params.topology === '3ph-half') return ['S1', 'S2', 'S3'];
    if (params.topology === '3ph-bridge') return ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    return ['S1'];
  }, [params.topology]);

  const isThyristorMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of switchIds) {
      map[id] = params.switches[id] === 'thyristor';
    }
    return map;
  }, [switchIds, params.switches]);

  const activeDeviceDetails = useMemo(() => {
    return conductingSwitches.map((id) => {
      if (id === 'FWD') {
        return {
          id: 'FWD',
          name: 'FWD',
          type: 'Freewheeling Diode',
          color: '#fbbf24',
          isFwd: true,
        };
      }
      const type = params.switches[id] || 'diode';
      return {
        id,
        name: id,
        type: type === 'thyristor' ? 'Thyristor (SCR)' : 'Diode',
        color: type === 'thyristor' ? '#38bdf8' : '#34d399',
        isFwd: false,
      };
    });
  }, [conductingSwitches, params.switches]);

  const isFwdConducting = conductingSwitches.includes('FWD');
  const thetaDeg = currentSample?.thetaDeg ?? 0;
  const timeMs = (currentSample?.time ?? 0) * 1000;

  // Active slice of samples for the timeline
  const activeSamples: SimulationSample[] = useMemo(() => {
    if (spanMode === '1cycle') {
      return samples.slice(0, pointsPerCycle);
    }
    return samples;
  }, [samples, spanMode, pointsPerCycle]);

  const activeSamplesCount = activeSamples.length;
  const maxSpanDeg = spanMode === '1cycle' ? 360 : (cyclesSimulated || 2) * 360;

  // Calculate playhead position percentage (0 to 100%)
  const playheadPct = useMemo(() => {
    if (spanMode === '1cycle') {
      return Math.min(100, Math.max(0, (thetaDeg / 360) * 100));
    }
    return totalSamples > 1 ? (cursorIndex / (totalSamples - 1)) * 100 : 0;
  }, [spanMode, thetaDeg, cursorIndex, totalSamples]);

  // Resolve color palette for combined conduction states
  const getConductionPalette = useCallback(
    (sws: string[]) => {
      if (sws.length === 0) {
        return {
          bg: 'repeating-linear-gradient(45deg, #090d16, #090d16 8px, #172033 8px, #172033 16px)',
          border: '#1e293b',
          text: '#64748b',
          name: 'Blocking (Off)',
        };
      }
      if (sws.includes('FWD')) {
        return {
          bg: '#b45309',
          border: '#f59e0b',
          text: '#fef3c7',
          name: 'FWD (Freewheeling)',
        };
      }

      const key = sws.slice().sort().join('+');
      if (key === 'S1+S4' || key === 'S2+S3') {
        return {
          bg: '#92400e',
          border: '#d97706',
          text: '#fde68a',
          name: `${sws.join(' + ')} (Freewheeling)`,
        };
      }

      const anyThyristor = sws.some((s) => isThyristorMap[s]);

      if (key.includes('S1') && key.includes('S2')) {
        return anyThyristor
          ? { bg: '#0284c7', border: '#38bdf8', text: '#f0f9ff', name: sws.join(' + ') }
          : { bg: '#059669', border: '#34d399', text: '#ecfdf5', name: sws.join(' + ') };
      }
      if (key.includes('S3') && key.includes('S4')) {
        return anyThyristor
          ? { bg: '#2563eb', border: '#60a5fa', text: '#eff6ff', name: sws.join(' + ') }
          : { bg: '#0d9488', border: '#2dd4bf', text: '#f0fdfa', name: sws.join(' + ') };
      }
      if (key.includes('S5') && key.includes('S6')) {
        return anyThyristor
          ? { bg: '#7c3aed', border: '#a78bfa', text: '#f5f3ff', name: sws.join(' + ') }
          : { bg: '#0891b2', border: '#22d3ee', text: '#ecfeff', name: sws.join(' + ') };
      }
      if (key.includes('S1') && key.includes('S6')) {
        return anyThyristor
          ? { bg: '#4f46e5', border: '#818cf8', text: '#eef2ff', name: sws.join(' + ') }
          : { bg: '#10b981', border: '#6ee7b7', text: '#ecfdf5', name: sws.join(' + ') };
      }
      if (key.includes('S3') && key.includes('S2')) {
        return anyThyristor
          ? { bg: '#0369a1', border: '#38bdf8', text: '#f0f9ff', name: sws.join(' + ') }
          : { bg: '#047857', border: '#10b981', text: '#ecfdf5', name: sws.join(' + ') };
      }
      if (key.includes('S5') && key.includes('S4')) {
        return anyThyristor
          ? { bg: '#6d28d9', border: '#c084fc', text: '#faf5ff', name: sws.join(' + ') }
          : { bg: '#0f766e', border: '#14b8a6', text: '#f0fdf4', name: sws.join(' + ') };
      }

      // Single switch conduction
      if (key === 'S1') {
        return anyThyristor
          ? { bg: '#0284c7', border: '#38bdf8', text: '#f0f9ff', name: 'S1' }
          : { bg: '#059669', border: '#34d399', text: '#ecfdf5', name: 'S1' };
      }
      if (key === 'S2') {
        return anyThyristor
          ? { bg: '#2563eb', border: '#60a5fa', text: '#eff6ff', name: 'S2' }
          : { bg: '#0d9488', border: '#2dd4bf', text: '#f0fdfa', name: 'S2' };
      }
      if (key === 'S3') {
        return anyThyristor
          ? { bg: '#7c3aed', border: '#a78bfa', text: '#f5f3ff', name: 'S3' }
          : { bg: '#0891b2', border: '#22d3ee', text: '#ecfeff', name: 'S3' };
      }

      return anyThyristor
        ? { bg: '#0284c7', border: '#38bdf8', text: '#f0f9ff', name: sws.join(' + ') }
        : { bg: '#059669', border: '#34d399', text: '#ecfdf5', name: sws.join(' + ') };
    },
    [isThyristorMap]
  );

  // Compute COMBINED conduction intervals along the sequence
  const combinedSegments = useMemo(() => {
    if (activeSamplesCount === 0) return [];
    const segs: ConductionSegment[] = [];
    let curKey = '';
    let curSws: string[] = [];
    let startIdx = 0;

    for (let i = 0; i < activeSamplesCount; i++) {
      const sws = [...activeSamples[i].conductingSwitches].sort();
      const key = sws.join('+');

      if (i === 0) {
        curKey = key;
        curSws = sws;
        startIdx = 0;
      } else if (key !== curKey) {
        const sIdx = startIdx;
        const eIdx = i - 1;
        const startPct = (sIdx / activeSamplesCount) * 100;
        const widthPct = ((i - sIdx) / activeSamplesCount) * 100;
        const startAngle = (sIdx / activeSamplesCount) * maxSpanDeg;
        const endAngle = (i / activeSamplesCount) * maxSpanDeg;
        const duration = endAngle - startAngle;
        const palette = getConductionPalette(curSws);

        segs.push({
          key: curKey || 'off',
          switches: curSws,
          label: curSws.length > 0 ? curSws.join(' + ') : 'Blocking (Off)',
          startIdx: sIdx,
          endIdx: eIdx,
          startAngleDeg: startAngle,
          endAngleDeg: endAngle,
          durationDeg: duration,
          startPct,
          widthPct,
          bg: palette.bg,
          border: palette.border,
          text: palette.text,
          isActive: false,
        });

        curKey = key;
        curSws = sws;
        startIdx = i;
      }
    }

    // Trailing interval
    if (activeSamplesCount > 0) {
      const sIdx = startIdx;
      const eIdx = activeSamplesCount - 1;
      const startPct = (sIdx / activeSamplesCount) * 100;
      const widthPct = ((activeSamplesCount - sIdx) / activeSamplesCount) * 100;
      const startAngle = (sIdx / activeSamplesCount) * maxSpanDeg;
      const endAngle = maxSpanDeg;
      const duration = endAngle - startAngle;
      const palette = getConductionPalette(curSws);

      segs.push({
        key: curKey || 'off',
        switches: curSws,
        label: curSws.length > 0 ? curSws.join(' + ') : 'Blocking (Off)',
        startIdx: sIdx,
        endIdx: eIdx,
        startAngleDeg: startAngle,
        endAngleDeg: endAngle,
        durationDeg: duration,
        startPct,
        widthPct,
        bg: palette.bg,
        border: palette.border,
        text: palette.text,
        isActive: false,
      });
    }

    // Determine which segment is active at cursor
    return segs.map((seg) => {
      const isActive = playheadPct >= seg.startPct && playheadPct < seg.startPct + seg.widthPct;
      return { ...seg, isActive };
    });
  }, [activeSamples, activeSamplesCount, maxSpanDeg, getConductionPalette, playheadPct]);

  const activeSegment = useMemo(() => {
    return combinedSegments.find((s) => s.isActive) || combinedSegments[0] || null;
  }, [combinedSegments]);

  // Compute SEPARATE conduction intervals for each individual switch
  const deviceIntervals = useMemo(() => {
    const intervals: Record<
      string,
      { startPct: number; widthPct: number; startDeg: number; durationDeg: number }[]
    > = {};

    if (activeSamplesCount === 0) return intervals;

    const allIds = [...switchIds];
    if (params.freewheelingDiode) allIds.push('FWD');

    for (const id of allIds) {
      intervals[id] = [];
      let inInterval = false;
      let startIdx = 0;

      for (let i = 0; i < activeSamplesCount; i++) {
        const isOn = activeSamples[i].conductingSwitches.includes(id);
        if (isOn && !inInterval) {
          inInterval = true;
          startIdx = i;
        } else if (!isOn && inInterval) {
          inInterval = false;
          const startPct = (startIdx / activeSamplesCount) * 100;
          const widthPct = ((i - startIdx) / activeSamplesCount) * 100;
          const startDeg = (startIdx / activeSamplesCount) * maxSpanDeg;
          const durationDeg = ((i - startIdx) / activeSamplesCount) * maxSpanDeg;
          intervals[id].push({ startPct, widthPct, startDeg, durationDeg });
        }
      }

      if (inInterval) {
        const startPct = (startIdx / activeSamplesCount) * 100;
        const widthPct = ((activeSamplesCount - startIdx) / activeSamplesCount) * 100;
        const startDeg = (startIdx / activeSamplesCount) * maxSpanDeg;
        const durationDeg = ((activeSamplesCount - startIdx) / activeSamplesCount) * maxSpanDeg;
        intervals[id].push({ startPct, widthPct, startDeg, durationDeg });
      }
    }

    return intervals;
  }, [activeSamples, activeSamplesCount, switchIds, params.freewheelingDiode, maxSpanDeg]);

  // Scrub interaction handler matching the waveform canvas padL = 46px and padR = 20px
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  const handleScrub = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onCursorChange) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const padL = 46;
      const padR = 20;
      const plotW = Math.max(1, rect.width - padL - padR);
      const clickX = Math.max(0, Math.min(plotW, e.clientX - rect.left - padL));
      const ratio = clickX / plotW;

      if (spanMode === '1cycle') {
        const targetSampleInCycle = Math.round(ratio * (pointsPerCycle - 1));
        const cycleBase =
          cursorIndex >= pointsPerCycle && totalSamples > pointsPerCycle ? pointsPerCycle : 0;
        const newIndex = Math.min(totalSamples - 1, cycleBase + targetSampleInCycle);
        onCursorChange(newIndex);
      } else {
        const newIndex = Math.round(ratio * (totalSamples - 1));
        onCursorChange(newIndex);
      }
    },
    [onCursorChange, spanMode, pointsPerCycle, cursorIndex, totalSamples]
  );

  return (
    <div className="bg-slate-950 border-t border-slate-800/90 p-1.5 sm:p-2 space-y-1.5">
      {/* 1. MASTER CONDUCTION TIMELINE SEQUENCE BAR (DIRECTLY ADJACENT UNDER PLOTS) */}
      <div className="bg-slate-900/95 rounded-lg p-2 border border-slate-800/80 shadow-md space-y-1.5">
        {/* Timeline Header with Title, Playhead Readout, and Layout/Span Toggles */}
        <div className="h-7 flex items-center justify-between gap-2 text-xs pb-1 border-b border-slate-800/70 flex-nowrap overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
              Conduction Sequence:
            </span>

            {/* Span Mode Toggle (1 Cycle vs 2 Cycles) */}
            <div className="inline-flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setSpanMode('1cycle')}
                className={`px-1.5 sm:px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
                  spanMode === '1cycle'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View canonical 1 electrical cycle (0° to 360°)"
              >
                1 Cycle (0°–360°)
              </button>
              <button
                type="button"
                onClick={() => setSpanMode('allCycles')}
                className={`px-1.5 sm:px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
                  spanMode === 'allCycles'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View full simulated scope (0° to 720°)"
              >
                2 Cycles (720°)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle to Combine or Separate All Bars */}
            <div className="inline-flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setBarLayout('combined')}
                className={`px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  barLayout === 'combined'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Combine all conducting devices into a single consolidated sequence timeline ribbon"
              >
                <span>▬</span> Combined Bar
              </button>
              <button
                type="button"
                onClick={() => setBarLayout('separate')}
                className={`px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  barLayout === 'separate'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display individual timeline track for each switch separately"
              >
                <span>☵</span> Separate Bars
              </button>
              <button
                type="button"
                onClick={() => setBarLayout('both')}
                className={`px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  barLayout === 'both'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Show both combined sequence ribbon and separate switch tracks"
              >
                <span>☷</span> Both
              </button>
            </div>

            {/* Playhead position readout with rock-solid fixed width (ZERO horizontal jitter) */}
            <div className="w-20 text-center font-mono tabular-nums text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-1 py-0.5 rounded shrink-0">
              θ = {thetaDeg.toFixed(1)}°
            </div>
          </div>
        </div>

        {/* Master Interactive Timeline Area: perfectly aligned with waveforms (padL: 46px, padR: 20px) */}
        <div
          ref={timelineTrackRef}
          className="relative select-none cursor-pointer pt-0.5"
          onPointerDown={handleScrub}
          onPointerMove={(e) => {
            if (e.buttons === 1) handleScrub(e);
          }}
        >
          {/* A. COMBINED CONDUCTION SEQUENCE RIBBON */}
          {(barLayout === 'combined' || barLayout === 'both') && (
            <div className="flex items-center mb-1">
              {/* Left label aligned with padL = 46px */}
              <span className="w-[46px] text-[10px] font-mono text-cyan-400 text-right pr-2 font-bold shrink-0">
                Seq
              </span>

              {/* Active ribbon taking full width up to padR = 20px */}
              <div className="flex-1 h-7 sm:h-8 bg-slate-950 rounded relative overflow-hidden flex items-center border border-slate-800/90 shadow-inner">
                {/* Render combined color segments */}
                {combinedSegments.map((seg, idx) => (
                  <div
                    key={`${seg.key}-${idx}`}
                    style={{
                      left: `${seg.startPct}%`,
                      width: `${seg.widthPct}%`,
                      background: seg.bg,
                      borderColor: seg.border,
                    }}
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className={`absolute top-0 bottom-0 border-r border-slate-950/40 transition-all flex items-center justify-center px-0.5 overflow-hidden group ${
                      seg.isActive
                        ? 'brightness-125 ring-2 ring-cyan-300 ring-inset z-10 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                        : 'opacity-90 hover:brightness-110'
                    }`}
                    title={`${seg.label}: ${seg.startAngleDeg.toFixed(1)}° → ${seg.endAngleDeg.toFixed(1)}° (Span: ${seg.durationDeg.toFixed(1)}°)`}
                  >
                    {seg.key === 'off' ? (
                      seg.widthPct >= 5 && (
                        <div className="flex items-center gap-1 truncate pointer-events-none px-1">
                          <span className="font-mono text-[9px] sm:text-[10px] font-semibold text-slate-400/90 drop-shadow">
                            Blocking
                          </span>
                          {seg.widthPct >= 12 && (
                            <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">
                              ({seg.durationDeg.toFixed(0)}°)
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      seg.widthPct >= 3.5 && (
                        <div className="flex items-center gap-1 truncate pointer-events-none px-0.5">
                          <span
                            className="font-mono text-[10px] sm:text-[11px] font-black tracking-tight drop-shadow"
                            style={{ color: seg.text }}
                          >
                            {seg.label}
                          </span>
                          {seg.widthPct >= 9 && (
                            <span className="text-[9px] font-mono opacity-90 text-slate-100 hidden sm:inline">
                              ({seg.durationDeg.toFixed(0)}°)
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>

              {/* Right gutter aligned with padR = 20px */}
              <span className="w-[20px] shrink-0"></span>
            </div>
          )}

          {/* B. SEPARATE INDIVIDUAL SWITCH TRACKS */}
          {(barLayout === 'separate' || barLayout === 'both') && (
            <div className="space-y-1">
              {switchIds.map((id) => {
                const isConductingNow = conductingSwitches.includes(id);
                const type = params.switches[id] || 'diode';
                const intervals = deviceIntervals[id] || [];

                return (
                  <div key={id} className="flex items-center">
                    <span className="w-[46px] text-[10px] font-mono text-slate-300 text-right pr-2 font-bold shrink-0">
                      {id}
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-950 rounded relative overflow-hidden flex items-center border border-slate-800/70">
                      {/* Interval blocks for this specific switch */}
                      <div className="absolute inset-0">
                        {intervals.map((interval, iIdx) => (
                          <div
                            key={iIdx}
                            style={{
                              left: `${interval.startPct}%`,
                              width: `${interval.widthPct}%`,
                              backgroundColor: type === 'thyristor' ? '#0ea5e9' : '#10b981',
                            }}
                            className="absolute h-full opacity-90 shadow-sm border-r border-slate-950/40"
                            title={`${id} Conducting: ${interval.startDeg.toFixed(1)}° to ${(interval.startDeg + interval.durationDeg).toFixed(1)}° (γ = ${interval.durationDeg.toFixed(1)}°)`}
                          />
                        ))}
                      </div>

                      {/* Device label inside bar */}
                      <span className="relative z-10 pl-1.5 text-[9px] font-mono text-slate-200 font-bold drop-shadow">
                        {type === 'thyristor' ? 'Thyristor' : 'Diode'}
                      </span>
                    </div>

                    <span className="w-[20px] text-center text-[9px] font-mono font-bold shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${
                          isConductingNow ? 'bg-emerald-400' : 'bg-slate-700'
                        }`}
                      />
                    </span>
                  </div>
                );
              })}

              {/* FWD Timeline row if present */}
              {params.freewheelingDiode && (
                <div className="flex items-center">
                  <span className="w-[46px] text-[10px] font-mono text-amber-400 text-right pr-2 font-bold shrink-0">
                    FWD
                  </span>
                  <div className="flex-1 h-3.5 bg-slate-950 rounded relative overflow-hidden flex items-center border border-slate-800/70">
                    <div className="absolute inset-0">
                      {(deviceIntervals['FWD'] || []).map((interval, iIdx) => (
                        <div
                          key={iIdx}
                          style={{
                            left: `${interval.startPct}%`,
                            width: `${interval.widthPct}%`,
                            backgroundColor: '#f59e0b',
                          }}
                          className="absolute h-full opacity-90 shadow-sm border-r border-slate-950/40"
                          title={`FWD Conducting: ${interval.startDeg.toFixed(1)}° to ${(interval.startDeg + interval.durationDeg).toFixed(1)}°`}
                        />
                      ))}
                    </div>
                    <span className="relative z-10 pl-1.5 text-[9px] font-mono text-slate-200 font-bold drop-shadow">
                      Freewheeling Diode
                    </span>
                  </div>

                  <span className="w-[20px] text-center text-[9px] font-mono font-bold shrink-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        isFwdConducting ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* C. SHARED VERTICAL PLAYHEAD CURSOR LINE: Exactly aligned with waveform plot (padL: 46px, padR: 20px) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{
              left: `calc(46px + ${playheadPct * 0.01} * (100% - 46px - 20px))`,
            }}
          >
            <div className="w-0.5 h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
            <div className="w-2.5 h-2.5 -ml-1 -top-1 absolute bg-cyan-400 rotate-45 border border-white"></div>
          </div>
        </div>

        {/* D. TIMELINE AXIS TICKS AND DEGREE LABELS: Aligned with padL = 46px and padR = 20px */}
        <div className="flex items-center pt-0.5">
          <span className="w-[46px] shrink-0"></span>

          <div className="flex-1 flex justify-between text-[9px] font-mono text-slate-400 px-0">
            {spanMode === '1cycle' ? (
              params.topology.startsWith('3ph') ? (
                <>
                  <span>0°</span>
                  <span>60°</span>
                  <span>120°</span>
                  <span>180° (π)</span>
                  <span>240°</span>
                  <span>300°</span>
                  <span>360° (2π)</span>
                </>
              ) : (
                <>
                  <span>0°</span>
                  <span>90° (π/2)</span>
                  <span>180° (π)</span>
                  <span>270° (3π/2)</span>
                  <span>360° (2π)</span>
                </>
              )
            ) : (
              <>
                <span>0°</span>
                <span>180°</span>
                <span className="text-cyan-300 font-bold">360° (T)</span>
                <span>540°</span>
                <span>720° (2T)</span>
              </>
            )}
          </div>

          <span className="w-[20px] shrink-0"></span>
        </div>

        {/* E. DEDICATED FIXED-HEIGHT SEGMENT INSPECTION STRIP (ZERO HEIGHT JUMP / ZERO SCREEN JITTER) */}
        <div className="h-7 min-h-[28px] max-h-[28px] bg-slate-950/90 border border-slate-800/90 rounded px-2.5 flex items-center justify-between text-[11px] font-mono overflow-hidden">
          <div className="flex items-center gap-2 truncate">
            {hoveredSegment ? (
              <>
                <span className="text-cyan-400 font-semibold uppercase text-[10px] tracking-wide shrink-0">
                  Inspecting:
                </span>
                <span className="font-bold text-white px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-800/70 shrink-0">
                  {hoveredSegment.label}
                </span>
                <span className="text-slate-400 text-[10px] truncate">
                  {hoveredSegment.startAngleDeg.toFixed(1)}° → {hoveredSegment.endAngleDeg.toFixed(1)}° (Span: γ ={' '}
                  {hoveredSegment.durationDeg.toFixed(1)}°)
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide shrink-0">
                  Active Interval:
                </span>
                <span className="font-bold text-emerald-300 px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-800/70 shrink-0">
                  {activeSegment?.label || 'Blocking (Off)'}
                </span>
                <span className="text-slate-400 text-[10px] truncate">
                  {activeSegment
                    ? `${activeSegment.startAngleDeg.toFixed(1)}° → ${activeSegment.endAngleDeg.toFixed(1)}° (γ = ${activeSegment.durationDeg.toFixed(1)}°)`
                    : 'All Switches Off'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
            <span className="text-slate-500">Conducting:</span>
            <span className="font-bold text-cyan-300">
              {conductingSwitches.length > 0 ? conductingSwitches.join(' + ') : 'None (Off)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT LIVE CONDUCTION STATUS STRIP & COLLAPSIBLE TILES (STABILIZED FIXED-HEIGHT, NON-WRAPPING) */}
      <div className="h-8 min-h-[32px] max-h-[32px] bg-slate-900/80 rounded-lg px-2.5 border border-slate-800/80 flex items-center justify-between gap-2 text-xs overflow-hidden">
        {/* Conducting Devices Active Badges - strictly non-wrapping */}
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap shrink-0 max-w-[72%]">
          <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px] tracking-wide shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Conducting:
          </span>

          <div className="flex items-center gap-1 flex-nowrap shrink-0">
            {activeDeviceDetails.length > 0 ? (
              activeDeviceDetails.map((dev) => (
                <span
                  key={dev.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold shadow-sm shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor: dev.isFwd ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    borderColor: dev.isFwd ? '#f59e0b' : '#10b981',
                    borderWidth: '1px',
                    color: dev.isFwd ? '#fcd34d' : '#6ee7b7',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dev.isFwd ? '#f59e0b' : '#10b981' }}
                  />
                  <span>{dev.name}</span>
                  <span className="text-[9px] opacity-80 font-sans font-medium">({dev.type})</span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[10px] shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Blocking (Natural Commutation / Off)
              </span>
            )}
          </div>
        </div>

        {/* Quick inline switches status + Toggle detailed tiles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {switchIds.map((id) => {
              const isConducting = conductingSwitches.includes(id);
              return (
                <span
                  key={id}
                  className={`px-1 py-0.2 rounded font-bold ${
                    isConducting ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500'
                  }`}
                >
                  {id}:{isConducting ? 'ON' : 'OFF'}
                </span>
              );
            })}
            {params.freewheelingDiode && (
              <span
                className={`px-1 py-0.2 rounded font-bold ${
                  isFwdConducting ? 'text-amber-400 bg-amber-950/60' : 'text-slate-500'
                }`}
              >
                FWD:{isFwdConducting ? 'ON' : 'OFF'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDeviceTiles(!showDeviceTiles)}
            className="text-[10px] font-semibold text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 cursor-pointer shrink-0"
          >
            <span>{showDeviceTiles ? 'Hide Specs' : 'Specs'}</span>
            <span>{showDeviceTiles ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* 3. OPTIONAL EXPANDABLE DETAILED DEVICE SPEC TILES */}
      {showDeviceTiles && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 pt-1 border-t border-slate-800/60">
          {switchIds.map((id) => {
            const isConducting = conductingSwitches.includes(id);
            const type = params.switches[id] || 'diode';
            const isThyristor = type === 'thyristor';

            return (
              <div
                key={id}
                className={`rounded-lg p-2 transition-all flex flex-col justify-between border ${
                  isConducting
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold font-mono ${
                      isConducting ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {id}
                  </span>
                  <span
                    className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded ${
                      isConducting
                        ? 'bg-emerald-500 text-slate-950 font-black animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isConducting ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="mt-1">
                  <div
                    className={`text-[10px] font-semibold tracking-tight ${
                      isThyristor ? 'text-cyan-400' : 'text-slate-300'
                    }`}
                  >
                    {isThyristor ? 'Thyristor' : 'Diode'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {isThyristor ? `α = ${params.firingAngleDeg}°` : 'Natural Bias'}
                  </div>
                </div>

                <div className="mt-1.5 pt-1 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono">
                  <span className={isConducting ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    {isConducting ? 'Conducting' : 'Blocking'}
                  </span>
                  {isConducting && <span className="text-emerald-300 font-bold">i &gt; 0</span>}
                </div>
              </div>
            );
          })}

          {/* Freewheeling Diode Tile if present */}
          {params.freewheelingDiode && (
            <div
              className={`rounded-lg p-2 transition-all flex flex-col justify-between border ${
                isFwdConducting
                  ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-mono ${
                    isFwdConducting ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  FWD
                </span>
                <span
                  className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded ${
                    isFwdConducting
                      ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isFwdConducting ? 'ON' : 'OFF'}
                </span>
              </div>

              <div className="mt-1">
                <div className="text-[10px] font-semibold text-amber-400">Freewheeling Diode</div>
                <div className="text-[9px] text-slate-500 font-mono">Load Bypass Loop</div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono">
                <span className={isFwdConducting ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                  {isFwdConducting ? 'Circulating' : 'Reverse Bias'}
                </span>
                {isFwdConducting && (
                  <span className="text-amber-300 font-bold">
                    {(currentSample.iFwd ?? 0).toFixed(1)}A
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
