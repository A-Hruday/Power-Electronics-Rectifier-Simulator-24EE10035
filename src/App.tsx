import React, { useMemo, useState } from 'react';
import { CircuitParameters, TopologyType } from './types/powerElectronics';
import { PRESETS } from './simulation/presets';
import { simulateRectifier, getDefaultSwitches } from './simulation/engine';
import { Navbar } from './components/Navbar';
import { SchematicViewer } from './components/schematics/SchematicViewer';
import { Oscilloscope } from './components/Oscilloscope';
import { MetricsGrid } from './components/MetricsGrid';
import { ControlDeck } from './components/ControlDeck';
import { ComparativeAnalysis } from './components/ComparativeAnalysis';
import { HarmonicsView } from './components/HarmonicsView';
import { FormulaSheet } from './components/FormulaSheet';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'compare' | 'harmonics' | 'theory'>('simulator');

  // Master Circuit Parameters initialized to 1-Phase Bridge Diode
  const [params, setParams] = useState<CircuitParameters>({
    ...PRESETS[0].params,
  });

  // Probed switch state for voltage inspector (can be unselected / null)
  const [probedSwitchId, setProbedSwitchId] = useState<string | null>(null);

  // Time scrubber cursor index & playback
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Run simulation engine whenever parameters change
  const simulation = useMemo(() => {
    return simulateRectifier(params);
  }, [params]);

  const currentSample = simulation.samples[cursorIndex] || simulation.samples[0];

  const handleUpdateParams = (updated: Partial<CircuitParameters>) => {
    setParams((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const handleTopologyChange = (newTopology: TopologyType) => {
    const newSwitches = getDefaultSwitches(newTopology, 'diode');
    setParams((prev) => ({
      ...prev,
      topology: newTopology,
      switches: newSwitches,
    }));
    setProbedSwitchId(null);
    setCursorIndex(0);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setParams({ ...preset.params });
      setProbedSwitchId(null);
      setCursorIndex(0);
    }
  };

  const handleResetToDefault = () => {
    setParams({ ...PRESETS[0].params });
    setProbedSwitchId(null);
    setCursorIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onResetToDefault={handleResetToDefault}
        topology={params.topology}
        onTopologyChange={handleTopologyChange}
      />

      <main className="flex-1 max-w-[1560px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Lab Header & Student Signature Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-slate-800/90">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Power Electronics Rectifier Laboratory
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
                IIT KGP Standard
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="text-xs sm:text-sm text-slate-400">
                Interactive waveform simulation, dynamic schematics & comparative switching analysis
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              {/* Student Signature Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-medium shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-bold text-white">Ambati Hruday</span>
                <span className="text-cyan-400/50">|</span>
                <span className="font-semibold text-cyan-200">Roll No. 24EE10035</span>
              </div>
            </div>
          </div>

          {/* Quick Selection Window at page top next to Reset */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-sm">
            <span className="text-xs text-slate-300 font-semibold pl-1">Circuit Schematic:</span>
            <select
              value={params.topology}
              onChange={(e) => handleTopologyChange(e.target.value as TopologyType)}
              className="bg-slate-950 border border-cyan-600/50 text-cyan-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="1ph-bridge">1φ Full-Wave Bridge (4 Switches)</option>
              <option value="1ph-half">1φ Half-Wave (1 Switch)</option>
              <option value="1ph-midpoint">1φ Center-Tapped Midpoint (2 Switches)</option>
              <option value="3ph-bridge">3φ 6-Pulse Bridge (6 Switches)</option>
              <option value="3ph-half">3φ Half-Wave Star (3 Switches)</option>
            </select>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
          {[
            { id: 'simulator', label: 'Circuit Simulator' },
            { id: 'compare', label: 'Comparative Analysis' },
            { id: 'harmonics', label: 'Harmonics FFT' },
            { id: 'theory', label: 'Formulas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: MASTER INTERACTIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Top Stage: Schematic Diagram (Left) & Multi-Channel Oscilloscope (Right) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Left Column: Interactive Schematic Diagram */}
              <div className="w-full">
                <SchematicViewer
                  params={params}
                  currentSample={currentSample}
                  onUpdateParams={handleUpdateParams}
                  onTopologyChange={handleTopologyChange}
                  onResetToDefault={handleResetToDefault}
                  probedSwitchId={probedSwitchId}
                  onSelectProbeSwitch={setProbedSwitchId}
                />
              </div>

              {/* Right Column: Multi-Channel Oscilloscope */}
              <div className="w-full">
                <Oscilloscope
                  simulation={simulation}
                  cursorIndex={cursorIndex}
                  onCursorChange={setCursorIndex}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  playbackSpeed={playbackSpeed}
                  onSpeedChange={setPlaybackSpeed}
                  probedSwitchId={probedSwitchId}
                  onSelectProbeSwitch={setProbedSwitchId}
                />
              </div>
            </div>

            {/* Performance Metrics Table */}
            <MetricsGrid metrics={simulation.metrics} />

            {/* Comprehensive Control Deck */}
            <ControlDeck
              params={params}
              onChange={handleUpdateParams}
              onApplyPreset={handleApplyPreset}
            />
          </div>
        )}

        {/* TAB 2: COMPARATIVE ANALYSIS MODE */}
        {activeTab === 'compare' && (
          <ComparativeAnalysis
            currentModel={params}
            onApplyModelToMain={(model) => {
              setParams({ ...model });
              setActiveTab('simulator');
            }}
          />
        )}

        {/* TAB 3: HARMONICS FFT ANALYSIS */}
        {activeTab === 'harmonics' && (
          <HarmonicsView
            harmonics={simulation.harmonics}
            thdCurrent={simulation.metrics.thdCurrent}
            fundamentalFreq={params.frequency}
          />
        )}

        {/* TAB 4: THEORETICAL FORMULAS & REFERENCE */}
        {activeTab === 'theory' && <FormulaSheet />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        VoltLab Power Electronics Simulation Laboratory · Developed by Ambati Hruday (24EE10035)
      </footer>
    </div>
  );
}
