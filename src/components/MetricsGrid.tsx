import React from 'react';
import { SimulationMetrics } from '../types/powerElectronics';

interface MetricsGridProps {
  metrics: SimulationMetrics;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const {
    vDc,
    vRms,
    iDc,
    iRms,
    rippleFactorV,
    formFactor,
    vPeakToPeak,
    activePower,
    apparentPower,
    powerFactor,
    displacementFactor,
    thdCurrent,
    rectificationEfficiency,
    peakInverseVoltageSw1,
    conductionAngleDeg,
    theoreticalVDc,
  } = metrics;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Quantitative Performance & Switching Metrics
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">
          Theoretical V_dc: <strong className="text-cyan-400">{theoreticalVDc.toFixed(1)} V</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* V_dc */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">Average Output V_dc</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {vDc.toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Theo: {theoreticalVDc.toFixed(1)} V
          </div>
        </div>

        {/* V_rms */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">RMS Output V_rms</div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
            {vRms.toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            V_pp: {vPeakToPeak.toFixed(1)} V
          </div>
        </div>

        {/* I_dc */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">Average Current I_dc</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {iDc.toFixed(2)} <span className="text-xs font-normal text-slate-400">A</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            I_rms: {iRms.toFixed(2)} A
          </div>
        </div>

        {/* Ripple Factor */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">Voltage Ripple Factor</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
            {(rippleFactorV * 100).toFixed(1)} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Form Factor: {formFactor.toFixed(3)}
          </div>
        </div>

        {/* Power Factor */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">Input Power Factor (PF)</div>
          <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
            {powerFactor.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            DPF (cos φ₁): {displacementFactor.toFixed(3)}
          </div>
        </div>

        {/* Current THD */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400">Input Current THD_i</div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            {thdCurrent.toFixed(1)} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Efficiency: {rectificationEfficiency.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Secondary Switch Stresses Bar */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/50">
          <span className="text-slate-400">Peak Inverse Voltage (PIV):</span>
          <span className="font-mono font-bold text-slate-200">{peakInverseVoltageSw1.toFixed(1)} V</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/50">
          <span className="text-slate-400">Conduction Angle γ:</span>
          <span className="font-mono font-bold text-slate-200">{conductionAngleDeg.toFixed(1)}°</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/50">
          <span className="text-slate-400">Active DC Power:</span>
          <span className="font-mono font-bold text-slate-200">{activePower.toFixed(1)} W</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/50">
          <span className="text-slate-400">Apparent Power S:</span>
          <span className="font-mono font-bold text-slate-200">{apparentPower.toFixed(1)} VA</span>
        </div>
      </div>
    </div>
  );
};
