import React from 'react';
import { HarmonicComponent } from '../types/powerElectronics';

interface HarmonicsViewProps {
  harmonics: HarmonicComponent[];
  thdCurrent: number;
  fundamentalFreq: number;
}

export const HarmonicsView: React.FC<HarmonicsViewProps> = ({
  harmonics,
  thdCurrent,
  fundamentalFreq,
}) => {
  const maxPct = Math.max(100, ...harmonics.map((h) => h.percentage));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            AC Supply Line Current Harmonics (FFT Spectrum)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Discrete Fourier decomposition of line current i_s(t) showing harmonic orders relative to fundamental ({fundamentalFreq} Hz).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400">Total Harmonic Distortion (THD_i):</span>
          <span className="font-mono text-sm font-bold text-rose-400">
            {thdCurrent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800/90 overflow-x-auto">
        <div className="h-44 min-w-[500px] flex items-end gap-1 sm:gap-2 pt-6 pb-2">
          {harmonics.map((h) => {
            const heightPct = Math.max(3, (h.percentage / maxPct) * 100);
            const isFundamental = h.order === 1;

            return (
              <div key={h.order} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded mb-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                  {h.magnitude.toFixed(2)} A ({h.percentage.toFixed(1)}%)
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-[22px] sm:max-w-[28px] rounded-t transition-all ${
                    isFundamental
                      ? 'bg-cyan-500 group-hover:bg-cyan-400'
                      : h.percentage > 20
                      ? 'bg-rose-500/80 group-hover:bg-rose-400'
                      : 'bg-purple-500/70 group-hover:bg-purple-400'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                {/* X-axis label */}
                <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-2">
                  h={h.order}
                </div>
                <div className="text-[8px] sm:text-[9px] font-mono text-slate-500">
                  {h.frequency}Hz
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Educational Note */}
      <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed space-y-1">
        <div>
          <strong className="text-slate-200">IEEE 519 Standard Verification:</strong> Total Harmonic Distortion is calculated via exact Parseval integration <code className="text-cyan-300 font-mono">THD = √(I_ac,rms² - I_1,rms²) / I_1,rms</code> across the entire frequency spectrum, accurately matching theoretical textbook benchmarks (e.g. 48.34% for square-wave 1-phase rectifiers and 31.08% for 3-phase 6-pulse bridges).
        </div>
        <div>
          <strong className="text-slate-200">Harmonic Insight:</strong> For single-phase rectifiers, the input current contains prominent odd harmonics (3rd, 5th, 7th). In balanced three-phase 6-pulse bridge rectifiers, triplen harmonics (3rd, 9th) are canceled in line currents, leaving characteristic harmonics of order <code className="text-cyan-300 font-mono">6k ± 1</code> (5th, 7th, 11th, 13th, 17th, 19th).
        </div>
      </div>
    </div>
  );
};
