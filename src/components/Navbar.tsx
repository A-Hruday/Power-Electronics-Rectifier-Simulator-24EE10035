import React from 'react';
import { TopologyType } from '../types/powerElectronics';

interface NavbarProps {
  activeTab: 'simulator' | 'compare' | 'harmonics' | 'theory';
  onSelectTab: (tab: 'simulator' | 'compare' | 'harmonics' | 'theory') => void;
  onResetToDefault: () => void;
  topology: TopologyType;
  onTopologyChange: (t: TopologyType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onResetToDefault,
  topology,
  onTopologyChange,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-950/95 backdrop-blur sticky top-0 z-50 gap-y-2">
      {/* Zone 1: Brand title & User Signature */}
      <div className="flex flex-col">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('simulator');
          }}
          className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors shrink-0"
        >
          VoltLab Power Electronics
        </a>
        <div className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wide flex items-center gap-1.5 mt-0.5">
          <span>Ambati Hruday</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300">Roll No. 24EE10035</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          type="button"
          onClick={() => onSelectTab('simulator')}
          className={`hover:text-white transition-colors cursor-pointer ${
            activeTab === 'simulator' ? 'text-cyan-400 border-b-2 border-cyan-400 py-1 font-semibold' : ''
          }`}
        >
          Circuit Simulator
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('compare')}
          className={`hover:text-white transition-colors cursor-pointer ${
            activeTab === 'compare' ? 'text-cyan-400 border-b-2 border-cyan-400 py-1 font-semibold' : ''
          }`}
        >
          Comparative Analysis
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('harmonics')}
          className={`hover:text-white transition-colors cursor-pointer ${
            activeTab === 'harmonics' ? 'text-cyan-400 border-b-2 border-cyan-400 py-1 font-semibold' : ''
          }`}
        >
          Harmonics FFT
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('theory')}
          className={`hover:text-white transition-colors cursor-pointer ${
            activeTab === 'theory' ? 'text-cyan-400 border-b-2 border-cyan-400 py-1 font-semibold' : ''
          }`}
        >
          Formulas & Reference
        </button>
      </nav>

      {/* Zone 3: Circuit Schematic Selection Window right next to Reset */}
      <div className="flex items-center gap-2">
        <label htmlFor="nav-circuit-select" className="text-xs text-slate-400 hidden sm:inline">
          Circuit:
        </label>
        <select
          id="nav-circuit-select"
          value={topology}
          onChange={(e) => onTopologyChange(e.target.value as TopologyType)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none font-medium cursor-pointer"
        >
          <option value="1ph-bridge">1φ Full-Wave Bridge</option>
          <option value="1ph-half">1φ Half-Wave</option>
          <option value="1ph-midpoint">1φ Center-Tapped Midpoint</option>
          <option value="3ph-bridge">3φ 6-Pulse Bridge</option>
          <option value="3ph-half">3φ Half-Wave Star</option>
        </select>

        <button
          type="button"
          onClick={onResetToDefault}
          className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer border border-slate-700"
          title="Reset to default 1-phase diode bridge circuit"
        >
          Reset
        </button>
      </div>
    </header>
  );
};
