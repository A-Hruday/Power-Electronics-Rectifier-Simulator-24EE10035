import React from 'react';

export const FormulaSheet: React.FC = () => {
  const formulas = [
    {
      title: '1-Phase Half-Wave Rectifier',
      uncontrolled: 'V_dc = V_m / π ≈ 0.318 · V_m',
      controlled: 'V_dc = (V_m / 2π) · (1 + cos α)',
      piv: 'PIV = V_m',
      rippleFreq: 'f_ripple = f = 50/60 Hz',
      notes: 'High DC core saturation current in transformer. Ripple factor RF = 121%.',
    },
    {
      title: '1-Phase Full-Wave Mid-Point (Center-Tapped)',
      uncontrolled: 'V_dc = (2 · V_m) / π ≈ 0.636 · V_m',
      controlled: 'V_dc = (2 · V_m / π) · cos α (continuous RL load)',
      piv: 'PIV = 2 · V_m (High voltage stress on switches)',
      rippleFreq: 'f_ripple = 2 · f = 100/120 Hz',
      notes: 'Requires dual-secondary transformer. Each switch blocks double the peak secondary voltage.',
    },
    {
      title: '1-Phase Full-Wave Bridge Rectifier',
      uncontrolled: 'V_dc = (2 · V_m) / π ≈ 0.636 · V_m',
      controlled: 'Fully Controlled: V_dc = (2 · V_m / π) · cos α\nSemi-Converter: V_dc = (V_m / π) · (1 + cos α)',
      piv: 'PIV = V_m',
      rippleFreq: 'f_ripple = 2 · f = 100/120 Hz',
      notes: 'Most popular 1-phase topology. Semi-converter eliminates negative output voltage without extra FWD.',
    },
    {
      title: '3-Phase Half-Wave (Star / M3)',
      uncontrolled: 'V_dc = (3√3 · V_m,phase) / (2π) ≈ 0.827 · V_m,phase',
      controlled: 'V_dc = (3√3 · V_m,phase / 2π) · cos α',
      piv: 'PIV = √3 · V_m,phase = V_m,line',
      rippleFreq: 'f_ripple = 3 · f = 150/180 Hz',
      notes: '3-pulse converter with natural commutation at 30° phase crossover points.',
    },
    {
      title: '3-Phase Full-Wave 6-Pulse Bridge',
      uncontrolled: 'V_dc = (3√3 · V_m,phase) / π = (3 · V_m,line) / π ≈ 1.35 · V_rms,line',
      controlled: 'V_dc = (3 · V_m,line / π) · cos α',
      piv: 'PIV = V_m,line = √3 · V_m,phase',
      rippleFreq: 'f_ripple = 6 · f = 300/360 Hz (Very low ripple RF = 4.2%)',
      notes: 'Workhorse of high-power industrial drives and HVDC. Triplen harmonics are canceled in line currents.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="border-b border-slate-800 pb-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Theoretical Formula Reference & Analytical Derivations
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Analytical textbook equations for average DC voltage, switch PIV ratings, and ripple frequencies.
          In ideal mode (Vf = 0V), results match these formulas directly; in non-ideal mode, forward diode/SCR drops and Ron are subtracted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {formulas.map((item) => (
          <div
            key={item.title}
            className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-200">{item.title}</div>

              <div className="mt-2 space-y-1.5 text-xs">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Uncontrolled (Diode) Average V_dc:</div>
                  <div className="font-mono text-cyan-400 font-semibold mt-0.5 whitespace-pre-line">
                    {item.uncontrolled}
                  </div>
                </div>

                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Controlled (SCR) Average V_dc:</div>
                  <div className="font-mono text-amber-400 font-semibold mt-0.5 whitespace-pre-line">
                    {item.controlled}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 text-[11px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Switch PIV Stress:</span>
                <span className="font-mono text-slate-200">{item.piv}</span>
              </div>
              <div className="flex justify-between">
                <span>Output Ripple Freq:</span>
                <span className="font-mono text-emerald-400">{item.rippleFreq}</span>
              </div>
              <div className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                {item.notes}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
