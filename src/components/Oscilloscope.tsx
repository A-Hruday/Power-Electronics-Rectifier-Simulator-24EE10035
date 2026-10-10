import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, SplitSquareVertical, Layers, CheckSquare, Square, SlidersHorizontal } from 'lucide-react';
import { SimulationResult, SimulationSample } from '../types/powerElectronics';
import { DeviceConductionBar } from './DeviceConductionBar';

export type OscilloscopeTrackId =
  | 'voltages'       // Input source vs output voltage
  | 'loadCurrent'    // Output DC load current & FWD loop
  | 'sourceCurrent'  // AC source line current
  | 'switchVoltage'  // Diode / Thyristor voltage v_AK
  | 'switchCurrent'  // Current through selected switch
  | 'gatePulses';    // Thyristor gate trigger pulses

interface OscilloscopeProps {
  simulation: SimulationResult;
  cursorIndex: number;
  onCursorChange: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  probedSwitchId?: string | null;
  onSelectProbeSwitch?: (switchId: string | null) => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  simulation,
  cursorIndex,
  onCursorChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  probedSwitchId,
  onSelectProbeSwitch,
}) => {
  const [viewMode, setViewMode] = useState<'separated' | 'combined'>('separated');

  // User-configurable active graphs list (choose how many and what graphs to look at)
  const [enabledTracks, setEnabledTracks] = useState<OscilloscopeTrackId[]>([
    'voltages',
    'loadCurrent',
    'sourceCurrent',
    'switchVoltage',
  ]);

  // Which switch is selected for diode voltage (v_AK) and switch current (i_sw)
  const [selectedSwitchId, setSelectedSwitchId] = useState<string>('S1');

  // Toggle for average DC load voltage (V_dc) and average load current (I_dc) indicator lines on graphs
  const [showAvgIndicators, setShowAvgIndicators] = useState<boolean>(true);

  // Canvas refs for separated tracks
  const canvasVRef = useRef<HTMLCanvasElement | null>(null);
  const canvasIoRef = useRef<HTMLCanvasElement | null>(null);
  const canvasIsRef = useRef<HTMLCanvasElement | null>(null);
  const canvasVakRef = useRef<HTMLCanvasElement | null>(null);
  const canvasIswRef = useRef<HTMLCanvasElement | null>(null);
  const canvasGateRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas ref for combined view
  const canvasCombinedRef = useRef<HTMLCanvasElement | null>(null);

  const { samples, params, periodMs, cyclesSimulated } = simulation;
  const currentSample: SimulationSample = samples[cursorIndex] || samples[0];

  // Available switches for current circuit topology
  const availableSwitches = useMemo(() => {
    const list = Object.keys(params.switches);
    if (params.freewheelingDiode) list.push('FWD');
    return list;
  }, [params.switches, params.freewheelingDiode]);

  // Synchronize with probed switch if selected from schematic
  useEffect(() => {
    if (probedSwitchId && availableSwitches.includes(probedSwitchId)) {
      setSelectedSwitchId(probedSwitchId);
    }
  }, [probedSwitchId, availableSwitches]);

  const activeSwitch = availableSwitches.includes(selectedSwitchId)
    ? selectedSwitchId
    : availableSwitches[0] || 'S1';

  const isSwitchThyristor = activeSwitch !== 'FWD' && params.switches[activeSwitch] === 'thyristor';
  const switchDeviceType = activeSwitch === 'FWD' ? 'FWD Diode' : isSwitchThyristor ? 'Thyristor' : 'Diode';

  // Toggle track visibility
  const handleToggleTrack = (trackId: OscilloscopeTrackId) => {
    setEnabledTracks((prev) => {
      if (prev.includes(trackId)) {
        if (prev.length === 1) return prev; // Keep at least one track visible
        return prev.filter((id) => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  // Quick preset handlers
  const handleApplyPreset = (preset: 'default' | 'diode' | 'all' | 'six' | 'minimal') => {
    switch (preset) {
      case 'default':
        setEnabledTracks(['voltages', 'loadCurrent', 'sourceCurrent']);
        break;
      case 'diode':
        setEnabledTracks(['voltages', 'loadCurrent', 'switchVoltage']);
        break;
      case 'all':
        setEnabledTracks(['voltages', 'loadCurrent', 'sourceCurrent', 'switchVoltage']);
        break;
      case 'six':
        setEnabledTracks(['voltages', 'loadCurrent', 'sourceCurrent', 'switchVoltage', 'switchCurrent', 'gatePulses']);
        break;
      case 'minimal':
        setEnabledTracks(['voltages', 'loadCurrent']);
        break;
    }
  };

  const handleSelectSwitch = (swId: string) => {
    setSelectedSwitchId(swId);
    if (onSelectProbeSwitch) {
      onSelectProbeSwitch(swId);
    }
  };

  // Specific conducting device description (Diode vs Thyristor) at current cursor
  const conductingDevices = (currentSample?.conductingSwitches || []).map((id) => {
    if (id === 'FWD') return 'FWD (Diode)';
    const swType = params.switches[id] || 'diode';
    return `${id} (${swType === 'thyristor' ? 'Thyristor' : 'Diode'})`;
  });

  // Calculate Diode / Switch Voltage (v_AK) series across all samples
  const vAkSeriesData = useMemo(() => {
    return samples.map((s) => {
      if (s.switchVoltages && s.switchVoltages[activeSwitch] !== undefined) {
        return s.switchVoltages[activeSwitch];
      }
      if (activeSwitch === 'S1') return s.vSwitch1;
      return 0;
    });
  }, [samples, activeSwitch]);

  // Calculate Switch Current (i_sw) series
  const iSwSeriesData = useMemo(() => {
    return samples.map((s) => {
      if (activeSwitch === 'FWD') return s.iFwd || 0;
      return s.conductingSwitches.includes(activeSwitch) ? s.iOutput : 0;
    });
  }, [samples, activeSwitch]);

  // Calculate Thyristor Gate Pulses (i_g) series
  const gatePulseSeriesData = useMemo(() => {
    const alphaRad = (params.firingAngleDeg * Math.PI) / 180;
    const pulseWidthRad = (12 * Math.PI) / 180; // 12-degree trigger pulse width
    const is3ph = params.topology.startsWith('3ph');
    const hasThyristor = Object.values(params.switches).some((s) => s === 'thyristor');

    return samples.map((s) => {
      if (!hasThyristor) return 0;
      const angle = (s.thetaDeg * Math.PI) / 180;
      const normAngle = angle % (is3ph ? (Math.PI / 3) : Math.PI);
      const targetAngle = is3ph ? ((Math.PI / 6 + alphaRad) % (Math.PI / 3)) : (alphaRad % Math.PI);
      const diff = Math.abs(normAngle - targetAngle);
      return diff < pulseWidthRad ? 1 : 0;
    });
  }, [samples, params.firingAngleDeg, params.topology, params.switches]);

  // Compute dynamic min/max ranges
  const computeRanges = useCallback(() => {
    let maxV = params.peakVoltage * 1.15;
    let minV = -params.peakVoltage * 1.15;
    let maxIo = 1;
    let maxIs = 1;
    let minIs = -1;
    let maxVak = 5;
    let minVak = -params.peakVoltage * 1.15;
    let maxIsw = 1;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.vOutput > maxV) maxV = s.vOutput;
      if (s.vOutput < minV) minV = s.vOutput;
      if (s.iOutput > maxIo) maxIo = s.iOutput;
      if (s.iSourceA > maxIs) maxIs = s.iSourceA;
      if (s.iSourceA < minIs) minIs = s.iSourceA;

      const vak = vAkSeriesData[i];
      if (vak !== undefined) {
        if (vak > maxVak) maxVak = vak;
        if (vak < minVak) minVak = vak;
      }

      const isw = iSwSeriesData[i];
      if (isw !== undefined && isw > maxIsw) maxIsw = isw;
    }

    maxIo = Math.max(1, maxIo * 1.15);
    maxIs = Math.max(1, maxIs * 1.15);
    minIs = Math.min(-1, minIs * 1.15);
    maxVak = Math.max(5, maxVak * 1.15);
    minVak = Math.min(-5, minVak * 1.15);
    maxIsw = Math.max(1, maxIsw * 1.15);

    return { maxV, minV, maxIo, minIo: 0, maxIs, minIs, maxVak, minVak, maxIsw };
  }, [samples, params.peakVoltage, vAkSeriesData, iSwSeriesData]);

  // Generic track drawer
  const drawTrack = useCallback(
    (
      canvas: HTMLCanvasElement,
      drawData: {
        seriesList: {
          data: number[];
          color: string;
          lineWidth?: number;
          dash?: number[];
        }[];
        minY: number;
        maxY: number;
        unit: string;
        zeroLineColor?: string;
        isBottomTrack?: boolean;
        referenceLines?: {
          value: number;
          label: string;
          color: string;
          dash?: number[];
          badgeBg?: string;
        }[];
      }
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx || samples.length === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Dark canvas background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const isBottomTrack = drawData.isBottomTrack ?? true;
      const padL = 46;
      const padR = 20;
      const padT = 8;
      const padB = isBottomTrack ? 18 : 6;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      const { minY, maxY, seriesList, unit, zeroLineColor } = drawData;
      const range = maxY - minY < 1e-4 ? 1 : maxY - minY;

      const getX = (i: number) => padL + (i / (samples.length - 1)) * plotW;
      const getY = (v: number) => padT + plotH - ((v - minY) / range) * plotH;

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';

      // Horizontal lines (Top, Middle, Bottom)
      const ySteps = [minY, (minY + maxY) / 2, maxY];
      for (const val of ySteps) {
        const y = getY(val);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillText(`${val.toFixed(0)}${unit}`, padL - 6, y + 3);
      }

      // Zero line highlight if in range
      if (minY <= 0 && maxY >= 0) {
        const y0 = getY(0);
        ctx.strokeStyle = zeroLineColor || '#334155';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(padL, y0);
        ctx.lineTo(padL + plotW, y0);
        ctx.stroke();
      }

      // Vertical time lines every cycle / 90 degrees
      const divisions = cyclesSimulated * 4;
      ctx.textAlign = 'center';
      for (let d = 0; d <= divisions; d++) {
        const fraction = d / divisions;
        const x = padL + fraction * plotW;
        ctx.strokeStyle = d % 4 === 0 ? '#334155' : '#172033';
        ctx.lineWidth = d % 4 === 0 ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();

        // Time ticks on bottom (only if bottom track to avoid redundant dead space)
        if (isBottomTrack && d % 2 === 0) {
          const ms = (fraction * cyclesSimulated * periodMs).toFixed(0);
          ctx.fillStyle = '#475569';
          ctx.fillText(`${ms}ms`, x, padT + plotH + 12);
        }
      }

      // Draw Series Curves
      for (const series of seriesList) {
        ctx.strokeStyle = series.color;
        ctx.lineWidth = series.lineWidth || 2;
        if (series.dash) ctx.setLineDash(series.dash);
        else ctx.setLineDash([]);

        ctx.beginPath();
        series.data.forEach((v, i) => {
          const x = getX(i);
          const y = getY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Reference Lines (e.g. Average DC Load Voltage V_dc or Load Current I_dc)
      if (drawData.referenceLines && drawData.referenceLines.length > 0) {
        for (const ref of drawData.referenceLines) {
          if (ref.value >= minY && ref.value <= maxY) {
            const yRef = getY(ref.value);
            ctx.strokeStyle = ref.color;
            ctx.lineWidth = 1.6;
            ctx.setLineDash(ref.dash || [6, 4]);
            ctx.beginPath();
            ctx.moveTo(padL, yRef);
            ctx.lineTo(padL + plotW, yRef);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw crisp pill badge for label
            ctx.font = 'bold 9px ui-monospace, monospace';
            const labelText = ref.label;
            const textWidth = ctx.measureText(labelText).width;
            const badgeW = textWidth + 10;
            const badgeH = 14;
            const badgeX = padL + plotW - badgeW - 6;
            const badgeY = yRef - 15 >= padT ? yRef - 14 : yRef + 3;

            ctx.fillStyle = ref.badgeBg || 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            ctx.strokeStyle = ref.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

            ctx.fillStyle = ref.color;
            ctx.textAlign = 'left';
            ctx.fillText(labelText, badgeX + 5, badgeY + 10.5);
          }
        }
      }

      // Vertical cursor line
      if (cursorIndex >= 0 && cursorIndex < samples.length) {
        const curX = getX(cursorIndex);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(curX, padT);
        ctx.lineTo(curX, padT + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight marker circles on each active series
        for (const series of seriesList) {
          const val = series.data[cursorIndex];
          if (val !== undefined) {
            ctx.fillStyle = series.color;
            ctx.beginPath();
            ctx.arc(curX, getY(val), 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    },
    [samples, cyclesSimulated, periodMs, cursorIndex]
  );

  // Render Separated Tracks
  const renderSeparated = useCallback(() => {
    const { minV, maxV, maxIo, maxIs, minIs, minVak, maxVak, maxIsw } = computeRanges();

    const allTrackOrder: OscilloscopeTrackId[] = [
      'voltages',
      'loadCurrent',
      'sourceCurrent',
      'switchVoltage',
      'switchCurrent',
      'gatePulses',
    ];
    const visibleTracksInOrder = allTrackOrder.filter((id) => enabledTracks.includes(id));
    const lastVisibleTrack = visibleTracksInOrder[visibleTracksInOrder.length - 1];

    // 1. Voltage Track: vSourceA (Cyan) + vOutput (Amber)
    if (enabledTracks.includes('voltages') && canvasVRef.current) {
      const vSeries: {
        data: number[];
        color: string;
        lineWidth?: number;
        dash?: number[];
      }[] = [
        { data: samples.map((s) => s.vSourceA), color: '#38bdf8', lineWidth: 1.6 },
        { data: samples.map((s) => s.vOutput), color: '#f59e0b', lineWidth: 2.2 },
      ];
      if (samples[0]?.vSourceB !== undefined) {
        vSeries.push({ data: samples.map((s) => s.vSourceB || 0), color: '#eab308', lineWidth: 1.2, dash: [4, 2] });
        vSeries.push({ data: samples.map((s) => s.vSourceC || 0), color: '#a855f7', lineWidth: 1.2, dash: [4, 2] });
      }
      const vRefLines = showAvgIndicators
        ? [
            {
              value: simulation.metrics.vDc,
              label: `V_dc = ${simulation.metrics.vDc.toFixed(1)} V`,
              color: '#fbbf24',
              dash: [6, 4],
              badgeBg: 'rgba(69, 26, 3, 0.92)',
            },
          ]
        : undefined;

      drawTrack(canvasVRef.current, {
        seriesList: vSeries,
        minY: minV,
        maxY: maxV,
        unit: 'V',
        referenceLines: vRefLines,
        isBottomTrack: lastVisibleTrack === 'voltages',
      });
    }

    // 2. Load Current Track: iOutput (Emerald)
    if (enabledTracks.includes('loadCurrent') && canvasIoRef.current) {
      const ioSeries: { data: number[]; color: string; lineWidth?: number; dash?: number[] }[] = [
        { data: samples.map((s) => s.iOutput), color: '#10b981', lineWidth: 2.2 },
      ];
      if (params.freewheelingDiode) {
        ioSeries.push({
          data: samples.map((s) => s.iFwd || 0),
          color: '#fbbf24',
          lineWidth: 1.6,
          dash: [4, 2],
        });
      }

      const ioRefLines = showAvgIndicators
        ? [
            {
              value: simulation.metrics.iDc,
              label: `I_dc = ${simulation.metrics.iDc.toFixed(2)} A`,
              color: '#34d399',
              dash: [6, 4],
              badgeBg: 'rgba(6, 78, 59, 0.92)',
            },
          ]
        : undefined;

      drawTrack(canvasIoRef.current, {
        seriesList: ioSeries,
        minY: 0,
        maxY: maxIo,
        unit: 'A',
        referenceLines: ioRefLines,
        isBottomTrack: lastVisibleTrack === 'loadCurrent',
      });
    }

    // 3. Source Current Track: iSourceA (Purple)
    if (enabledTracks.includes('sourceCurrent') && canvasIsRef.current) {
      drawTrack(canvasIsRef.current, {
        seriesList: [{ data: samples.map((s) => s.iSourceA), color: '#c084fc', lineWidth: 2.0 }],
        minY: minIs,
        maxY: maxIs,
        unit: 'A',
        isBottomTrack: lastVisibleTrack === 'sourceCurrent',
      });
    }

    // 4. Diode / Switch Voltage Track (v_AK): Anode-to-Cathode (Rose)
    if (enabledTracks.includes('switchVoltage') && canvasVakRef.current) {
      drawTrack(canvasVakRef.current, {
        seriesList: [
          { data: vAkSeriesData, color: '#f43f5e', lineWidth: 2.0 },
        ],
        minY: minVak,
        maxY: maxVak,
        unit: 'V',
        zeroLineColor: '#991b1b',
        isBottomTrack: lastVisibleTrack === 'switchVoltage',
      });
    }

    // 5. Switch Current Track (i_sw)
    if (enabledTracks.includes('switchCurrent') && canvasIswRef.current) {
      drawTrack(canvasIswRef.current, {
        seriesList: [
          { data: iSwSeriesData, color: '#06b6d4', lineWidth: 2.0 },
        ],
        minY: 0,
        maxY: maxIsw,
        unit: 'A',
        isBottomTrack: lastVisibleTrack === 'switchCurrent',
      });
    }

    // 6. Thyristor Gate Pulses Track (i_g)
    if (enabledTracks.includes('gatePulses') && canvasGateRef.current) {
      drawTrack(canvasGateRef.current, {
        seriesList: [
          { data: gatePulseSeriesData, color: '#eab308', lineWidth: 2.0 },
        ],
        minY: 0,
        maxY: 1.5,
        unit: 'P',
        isBottomTrack: lastVisibleTrack === 'gatePulses',
      });
    }
  }, [
    samples,
    enabledTracks,
    computeRanges,
    drawTrack,
    vAkSeriesData,
    iSwSeriesData,
    gatePulseSeriesData,
    params.freewheelingDiode,
    showAvgIndicators,
    simulation.metrics.vDc,
    simulation.metrics.iDc,
  ]);

  // Render Combined View
  const renderCombined = useCallback(() => {
    if (!canvasCombinedRef.current) return;
    const { minV, maxV, maxIo } = computeRanges();

    // Scale currents into voltage coordinates for overlay
    const scaleI = (maxV / (maxIo || 1)) * 0.7;

    const series: { data: number[]; color: string; lineWidth?: number; dash?: number[] }[] = [];

    if (enabledTracks.includes('voltages')) {
      series.push({ data: samples.map((s) => s.vSourceA), color: '#38bdf8', lineWidth: 1.6 });
      series.push({ data: samples.map((s) => s.vOutput), color: '#f59e0b', lineWidth: 2.4 });
    }
    if (enabledTracks.includes('loadCurrent')) {
      series.push({ data: samples.map((s) => s.iOutput * scaleI), color: '#10b981', lineWidth: 2.2 });
    }
    if (enabledTracks.includes('sourceCurrent')) {
      series.push({ data: samples.map((s) => s.iSourceA * scaleI), color: '#c084fc', lineWidth: 1.8 });
    }
    if (enabledTracks.includes('switchVoltage')) {
      series.push({ data: vAkSeriesData, color: '#f43f5e', lineWidth: 1.8, dash: [4, 2] });
    }
    if (enabledTracks.includes('switchCurrent')) {
      series.push({ data: iSwSeriesData.map((v) => v * scaleI), color: '#06b6d4', lineWidth: 1.8 });
    }
    if (enabledTracks.includes('gatePulses')) {
      series.push({ data: gatePulseSeriesData.map((v) => v * (maxV * 0.4)), color: '#eab308', lineWidth: 1.8 });
    }

    const combinedRefLines = showAvgIndicators
      ? [
          {
            value: simulation.metrics.vDc,
            label: `V_dc = ${simulation.metrics.vDc.toFixed(1)} V`,
            color: '#fbbf24',
            dash: [6, 4],
            badgeBg: 'rgba(69, 26, 3, 0.92)',
          },
        ]
      : undefined;

    drawTrack(canvasCombinedRef.current, {
      seriesList: series,
      minY: minV,
      maxY: maxV,
      unit: 'V',
      referenceLines: combinedRefLines,
    });
  }, [
    samples,
    enabledTracks,
    computeRanges,
    drawTrack,
    vAkSeriesData,
    iSwSeriesData,
    gatePulseSeriesData,
    showAvgIndicators,
    simulation.metrics.vDc,
  ]);

  // Master render effect
  useEffect(() => {
    if (viewMode === 'separated') {
      renderSeparated();
    } else {
      renderCombined();
    }
  }, [viewMode, renderSeparated, renderCombined, cursorIndex, enabledTracks, activeSwitch]);

  // Live Play Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onCursorChange((prev: number) => (prev + Math.round(4 * playbackSpeed)) % samples.length);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, samples.length, onCursorChange]);

  // Pointer scrubber interaction
  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    if (!canvas || samples.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padL = 46;
    const padR = 20;
    const plotW = rect.width - padL - padR;

    const clampedX = Math.max(0, Math.min(plotW, x - padL));
    const ratio = clampedX / plotW;
    const newIdx = Math.min(samples.length - 1, Math.max(0, Math.round(ratio * (samples.length - 1))));
    onCursorChange(newIdx);
  };

  // Instantaneous value of probed diode / switch voltage at current cursor
  const currentVak = vAkSeriesData[cursorIndex] ?? 0;
  const currentIsw = iSwSeriesData[cursorIndex] ?? 0;
  const isSelectedSwConducting = (currentSample?.conductingSwitches || []).includes(activeSwitch);

  // Responsive canvas height depending on how many tracks are visible
  const trackHeightClass =
    enabledTracks.length <= 2
      ? 'h-[140px] sm:h-[160px]'
      : enabledTracks.length <= 4
      ? 'h-[105px] sm:h-[120px]'
      : 'h-[85px] sm:h-[95px]';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
      {/* 1. TOP HEADER: Controls & Global Playback Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Oscilloscope Waveforms
          </span>

          {/* View Mode Toggle (Separated vs Combined) */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('separated')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'separated'
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Separated stacked oscilloscope tracks"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Separated</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('combined')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Combined overlaid waveforms"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overlay</span>
            </button>
          </div>

          {/* Play/Pause Animation button */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Run'}</span>
            </button>
            <button
              type="button"
              onClick={() => onCursorChange(0)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Reset to 0°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Select */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <span>Speed:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-slate-700 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Average DC Load Voltage & Current Indicators Toggle */}
          <button
            type="button"
            onClick={() => setShowAvgIndicators(!showAvgIndicators)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              showAvgIndicators
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)] font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle display of average DC load voltage (V_dc) and average load current (I_dc) horizontal indicator reference lines on graphs"
          >
            <span className="w-2.5 h-0.5 bg-current rounded-full" />
            <span>Avg DC Levels: {showAvgIndicators ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Live Instant Readout at cursor including conducting devices */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-400">θ:</span>
            <span className="w-12 text-right inline-block tabular-nums font-bold text-cyan-300">
              {currentSample.thetaDeg.toFixed(1)}°
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">t:</span>
            <span className="w-16 text-right inline-block tabular-nums font-bold text-white">
              {(currentSample.time * 1000).toFixed(2)} ms
            </span>
          </div>

          {conductingDevices.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold text-[11px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ON: {conductingDevices.join(', ')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-500 text-[11px] shrink-0">
              All Blocking
            </span>
          )}
        </div>
      </div>

      {/* 2. DEDICATED GRAPH SELECTOR STRIP: Choose How Many & What Graphs to Look At */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-slate-300 font-semibold shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Graphs ({enabledTracks.length}/6):</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => handleApplyPreset('diode')}
              className="px-2 py-0.5 text-[10px] font-semibold text-rose-300 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
              title="Focus on Diode voltage v_AK, Load Voltage v_o, and Load Current i_o"
            >
              Diode Analysis
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('default')}
              className="px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Standard 3 tracks: Voltages, Load Current, Source Current"
            >
              Standard (3)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className="px-2 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-950/40 rounded transition-colors cursor-pointer"
              title="All 4 main tracks: Voltages, Load Current, Source Current, Diode Voltage"
            >
              Main 4
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('six')}
              className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-950/40 rounded transition-colors cursor-pointer"
              title="Show all 6 possible channels"
            >
              All 6
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('minimal')}
              className="px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Minimal 2 tracks: Voltages and Load Current"
            >
              Minimal (2)
            </button>
          </div>

          {/* Individual Track Toggle Chips */}
          <div className="flex flex-wrap items-center gap-1">
            {/* 1. Voltages */}
            <button
              type="button"
              onClick={() => handleToggleTrack('voltages')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('voltages')
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {enabledTracks.includes('voltages') ? <CheckSquare className="w-3 h-3 text-amber-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>v_s & v_o</span>
            </button>

            {/* 2. Load Current */}
            <button
              type="button"
              onClick={() => handleToggleTrack('loadCurrent')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('loadCurrent')
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {enabledTracks.includes('loadCurrent') ? <CheckSquare className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>i_o</span>
            </button>

            {/* 3. Source Current */}
            <button
              type="button"
              onClick={() => handleToggleTrack('sourceCurrent')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('sourceCurrent')
                  ? 'bg-purple-950/50 border-purple-500/50 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {enabledTracks.includes('sourceCurrent') ? <CheckSquare className="w-3 h-3 text-purple-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>i_s</span>
            </button>

            {/* 4. Diode / Switch Voltage (v_AK) */}
            <button
              type="button"
              onClick={() => handleToggleTrack('switchVoltage')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('switchVoltage')
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.25)]'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-rose-300'
              }`}
            >
              {enabledTracks.includes('switchVoltage') ? <CheckSquare className="w-3 h-3 text-rose-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Diode Voltage (v_AK)</span>
            </button>

            {/* 5. Switch Current */}
            <button
              type="button"
              onClick={() => handleToggleTrack('switchCurrent')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('switchCurrent')
                  ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {enabledTracks.includes('switchCurrent') ? <CheckSquare className="w-3 h-3 text-cyan-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>i_sw</span>
            </button>

            {/* 6. Gate Pulses */}
            <button
              type="button"
              onClick={() => handleToggleTrack('gatePulses')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                enabledTracks.includes('gatePulses')
                  ? 'bg-yellow-950/50 border-yellow-500/50 text-yellow-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {enabledTracks.includes('gatePulses') ? <CheckSquare className="w-3 h-3 text-yellow-400" /> : <Square className="w-3 h-3" />}
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>i_g (Gate)</span>
            </button>
          </div>
        </div>

        {/* Inline Switch Selector for Diode Voltage (v_AK) */}
        {(enabledTracks.includes('switchVoltage') || enabledTracks.includes('switchCurrent')) && (
          <div className="flex items-center gap-1.5 shrink-0 bg-rose-950/30 border border-rose-900/50 px-2 py-0.5 rounded-lg">
            <span className="text-[11px] font-semibold text-rose-300">Measure Device:</span>
            <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-rose-950/80">
              {availableSwitches.map((swId) => {
                const isSelected = activeSwitch === swId;
                return (
                  <button
                    key={swId}
                    type="button"
                    onClick={() => handleSelectSwitch(swId)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {swId}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-rose-400/80 font-mono hidden sm:inline">
              ({switchDeviceType})
            </span>
          </div>
        )}
      </div>

      {/* 3. WAVEFORM TRACKS CONTAINER */}
      {viewMode === 'separated' ? (
        <div className="divide-y divide-slate-800/80 bg-slate-950 p-1.5 sm:p-2 space-y-1.5">
          {/* TRACK 1: Source Voltage v_s & Load Voltage v_o */}
          {enabledTracks.includes('voltages') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/60">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-300 shrink-0">
                    Track: Voltages (v_s & v_o)
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-sky-400 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>v_s:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-semibold">
                      {currentSample.vSourceA.toFixed(1)} V
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>v_o:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-bold">
                      {currentSample.vOutput.toFixed(1)} V
                    </span>
                  </span>
                  {showAvgIndicators && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300 font-bold bg-amber-950/70 border border-amber-500/50 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                      <span>Avg V_dc: {simulation.metrics.vDc.toFixed(1)} V</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                  {params.topology.startsWith('3ph') ? '3-Phase AC & DC' : '1-Phase AC & DC'}
                </span>
              </div>
              <canvas
                ref={canvasVRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}

          {/* TRACK 2: Load Current i_o */}
          {enabledTracks.includes('loadCurrent') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/60">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-300 shrink-0">
                    Track: Load Current (i_o)
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>i_o:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-bold">
                      {currentSample.iOutput.toFixed(2)} A
                    </span>
                  </span>
                  {showAvgIndicators && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/70 border border-emerald-500/50 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                      <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                      <span>Avg I_dc: {simulation.metrics.iDc.toFixed(2)} A</span>
                    </span>
                  )}
                  {params.freewheelingDiode && (
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                        currentSample.iFwd !== undefined && currentSample.iFwd > 0.05
                          ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentSample.iFwd !== undefined && currentSample.iFwd > 0.05
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-slate-600'
                        }`}
                      />
                      <span>FWD:</span>
                      <span className="w-14 text-right inline-block tabular-nums font-semibold">
                        {(currentSample.iFwd ?? 0).toFixed(2)} A
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                  {params.loadType === 'R' ? 'Pure R' : params.loadType === 'RL' ? 'R-L Inductive' : 'R-L-E (Motor)'}
                </span>
              </div>
              <canvas
                ref={canvasIoRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}

          {/* TRACK 3: Source Current i_s */}
          {enabledTracks.includes('sourceCurrent') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/60">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-300 shrink-0">
                    Track: Source Current (i_s, Phase A)
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-purple-400 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>i_s:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-bold">
                      {currentSample.iSourceA.toFixed(2)} A
                    </span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                  THD: {simulation.metrics.thdCurrent.toFixed(1)}%
                </span>
              </div>
              <canvas
                ref={canvasIsRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}

          {/* TRACK 4: Diode / Switch Voltage across selected device v_AK */}
          {enabledTracks.includes('switchVoltage') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-rose-950/50">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-bold text-rose-300 shrink-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Track: Diode Voltage v_AK({activeSwitch})
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-rose-400 font-bold shrink-0">
                    <span>v_AK:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-bold">
                      {currentVak >= 0 ? '+' : ''}{currentVak.toFixed(1)} V
                    </span>
                  </span>
                  <span
                    className={`w-36 text-center inline-block tabular-nums shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isSelectedSwConducting
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                        : currentVak > 0.5
                        ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                        : 'bg-rose-950 text-rose-400 border border-rose-700/60'
                    }`}
                  >
                    {isSelectedSwConducting
                      ? 'CONDUCTING (ON)'
                      : currentVak > 0.5
                      ? 'FORWARD BLOCKING'
                      : 'REVERSE BLOCKING'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0 pl-2">
                  <span>PIV: {Math.abs(computeRanges().minVak).toFixed(1)} V</span>
                  <span>·</span>
                  <span>{switchDeviceType}</span>
                </div>
              </div>
              <canvas
                ref={canvasVakRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}

          {/* TRACK 5: Switch Current (i_sw) */}
          {enabledTracks.includes('switchCurrent') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/60">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-cyan-300 shrink-0">
                    Track: Switch Current i_sw({activeSwitch})
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>i_sw:</span>
                    <span className="w-20 text-right inline-block tabular-nums font-bold">
                      {currentIsw.toFixed(2)} A
                    </span>
                  </span>
                </div>
                <span className="w-32 text-center inline-block tabular-nums text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                  {isSelectedSwConducting ? 'Forward Conduction' : 'Zero (Off)'}
                </span>
              </div>
              <canvas
                ref={canvasIswRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}

          {/* TRACK 6: Thyristor Gate Trigger Pulses (i_g) */}
          {enabledTracks.includes('gatePulses') && (
            <div className="relative bg-slate-950/80 rounded-lg p-1.5 border border-slate-800/60">
              <div className="h-7 flex items-center justify-between px-2 pb-1 text-xs flex-nowrap overflow-x-auto">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-semibold text-yellow-300 shrink-0">
                    Track: Gate Trigger Pulses (i_g)
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-yellow-400 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span>Gate Pulse:</span>
                    <span className="w-28 text-center inline-block tabular-nums shrink-0 font-bold">
                      {gatePulseSeriesData[cursorIndex] ? 'ACTIVE (PULSE)' : 'IDLE (0)'}
                    </span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                  α = {params.firingAngleDeg}°
                </span>
              </div>
              <canvas
                ref={canvasGateRef}
                className={`w-full ${trackHeightClass} block cursor-crosshair touch-none`}
                onPointerDown={handlePointer}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handlePointer(e);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        /* COMBINED VIEW */
        <div className="p-2 bg-slate-950">
          <canvas
            ref={canvasCombinedRef}
            className="w-full h-[320px] block cursor-crosshair touch-none"
            onPointerDown={handlePointer}
            onPointerMove={(e) => {
              if (e.buttons === 1) handlePointer(e);
            }}
          />
        </div>
      )}

      {/* LIVE CONDUCTING DIODES OR THYRISTORS BAR UNDER PLOTS */}
      <DeviceConductionBar
        simulation={simulation}
        cursorIndex={cursorIndex}
        onCursorChange={onCursorChange}
      />

      {/* Footer toolbar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span>
            Click any channel chip in the bar above to customize how many and what graphs you see. Hover/drag plots to scrub electrical angle θ.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-cyan-400/80">
            {enabledTracks.length} of 6 Channels Active
          </span>
        </div>
      </div>
    </div>
  );
};
