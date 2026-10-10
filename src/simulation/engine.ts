import {
  CircuitParameters,
  HarmonicComponent,
  SimulationMetrics,
  SimulationResult,
  SimulationSample,
  SwitchType,
  TopologyType,
} from '../types/powerElectronics';

const TWO_PI = 2 * Math.PI;

/**
 * Return default switch configuration for a topology
 */
export function getDefaultSwitches(
  topology: TopologyType,
  defaultType: 'diode' | 'thyristor' = 'diode'
): Record<string, 'diode' | 'thyristor'> {
  switch (topology) {
    case '1ph-half':
      return { S1: defaultType };
    case '1ph-midpoint':
      return { S1: defaultType, S2: defaultType };
    case '1ph-bridge':
      return {
        S1: defaultType,
        S2: defaultType,
        S3: defaultType,
        S4: defaultType,
      };
    case '3ph-half':
      return { S1: defaultType, S2: defaultType, S3: defaultType };
    case '3ph-bridge':
      return {
        S1: defaultType,
        S2: defaultType,
        S3: defaultType,
        S4: defaultType,
        S5: defaultType,
        S6: defaultType,
      };
  }
}

/**
 * Retrieve effective forward drops and resistance based on Ideal vs Non-Ideal switch model
 */
export function getEffectiveSwitchDrops(params: CircuitParameters): {
  isIdeal: boolean;
  vfDiode: number;
  vfThyristor: number;
  rOn: number;
  getVf: (type?: SwitchType) => number;
} {
  const isIdeal =
    params.switchModel === 'ideal' ||
    (params.switchModel !== 'non-ideal' && params.forwardDrop === 0);

  if (isIdeal) {
    return {
      isIdeal: true,
      vfDiode: 0,
      vfThyristor: 0,
      rOn: 0,
      getVf: () => 0,
    };
  }

  const vfDiode = params.diodeForwardDrop ?? (params.forwardDrop > 0 ? params.forwardDrop : 0.7);
  const vfThyristor = params.thyristorForwardDrop ?? 1.4;
  const rOn = params.switchResistance ?? 0.02;

  return {
    isIdeal: false,
    vfDiode,
    vfThyristor,
    rOn,
    getVf: (type?: SwitchType) => (type === 'thyristor' ? vfThyristor : vfDiode),
  };
}

/**
 * Theoretical V_dc calculation based on textbook analytical formulas
 */
export function calculateTheoreticalVDc(params: CircuitParameters): number {
  const { topology, peakVoltage: Vm, firingAngleDeg, forwardDrop: Vf, loadType, freewheelingDiode } = params;
  const alphaRad = (firingAngleDeg * Math.PI) / 180;
  const swValues = Object.values(params.switches);
  const isAllThyristor = swValues.length > 0 && swValues.every((s) => s === 'thyristor');
  const isAllDiode = swValues.length > 0 && swValues.every((s) => s === 'diode');
  const hasMixedSwitches = !isAllThyristor && !isAllDiode;

  const drops = getEffectiveSwitchDrops(params);
  const meanDrop = (drops.vfDiode + drops.vfThyristor) / 2;
  const dropFactor = drops.isIdeal ? 0 : topology.includes('bridge') ? 2 * meanDrop : meanDrop;

  switch (topology) {
    case '1ph-half': {
      if (isAllThyristor) {
        if (freewheelingDiode || loadType === 'R') {
          return Math.max(0, (Vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad)) - dropFactor);
        }
        return Math.max(0, (Vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad)) - dropFactor);
      }
      return Math.max(0, Vm / Math.PI - dropFactor);
    }
    case '1ph-midpoint': {
      if (isAllThyristor) {
        if (freewheelingDiode || loadType === 'R') {
          return Math.max(0, (Vm / Math.PI) * (1 + Math.cos(alphaRad)) - dropFactor);
        }
        return Math.max(0, ((2 * Vm) / Math.PI) * Math.cos(alphaRad) - dropFactor);
      }
      if (hasMixedSwitches || freewheelingDiode) {
        return Math.max(0, (Vm / Math.PI) * (1 + Math.cos(alphaRad)) - dropFactor);
      }
      return Math.max(0, ((2 * Vm) / Math.PI) - dropFactor);
    }
    case '1ph-bridge': {
      if (hasMixedSwitches || freewheelingDiode || loadType === 'R') {
        // Semi-converter formula (applies when upper or lower components are diodes, or leg is diode)
        return Math.max(0, (Vm / Math.PI) * (1 + Math.cos(alphaRad)) - dropFactor);
      }
      if (isAllThyristor) {
        return Math.max(0, ((2 * Vm) / Math.PI) * Math.cos(alphaRad) - dropFactor);
      }
      return Math.max(0, ((2 * Vm) / Math.PI) - dropFactor);
    }
    case '3ph-half': {
      const VmPhase = Vm;
      if (isAllThyristor) {
        if (freewheelingDiode && alphaRad > Math.PI / 6) {
          return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) * (1 + Math.cos(alphaRad + Math.PI / 6)) - dropFactor);
        }
        return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) * Math.cos(alphaRad) - dropFactor);
      }
      return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) - dropFactor);
    }
    case '3ph-bridge': {
      const VmPhase = Vm;
      if (hasMixedSwitches || freewheelingDiode) {
        // 3-Phase Semi-Converter (e.g. upper components diode, lower thyristor, or vice-versa)
        return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) * (1 + Math.cos(alphaRad)) - dropFactor);
      }
      if (isAllThyristor) {
        return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / Math.PI) * Math.cos(alphaRad) - dropFactor);
      }
      return Math.max(0, ((3 * Math.sqrt(3) * VmPhase) / Math.PI) - dropFactor);
    }
  }
}

/**
 * High-resolution numerical simulation of rectifier circuits
 * Implements exact continuous/discontinuous differential equations and Free-Wheeling Diode (FWD) physics
 */
export function simulateRectifier(params: CircuitParameters): SimulationResult {
  const {
    topology,
    peakVoltage: Vm,
    frequency: f,
    sourceInductance: LsMh,
    firingAngleDeg,
    forwardDrop: Vf,
    loadType,
    resistance: R,
    inductance: LMh,
    backEmf: E,
    freewheelingDiode: fwd,
    switches,
  } = params;

  const L = Math.max(1e-7, (loadType === 'R' ? 0 : LMh) * 1e-3);
  const Ls = Math.max(0, LsMh * 1e-3);
  const totalL = L + Ls;
  const alphaRad = (firingAngleDeg * Math.PI) / 180;
  const period = 1 / f;
  const omega = TWO_PI * f;

  // Retrieve effective forward drops and on-resistance based on switch model (ideal vs non-ideal)
  const switchDrops = getEffectiveSwitchDrops(params);
  const { isIdeal, vfDiode, vfThyristor, rOn, getVf } = switchDrops;

  const getSwVf = (id: string) => {
    if (isIdeal) return 0;
    if (id === 'FWD') return vfDiode;
    const type = switches[id] || 'diode';
    return getVf(type);
  };

  const getSwDrop = (id: string, current: number) => {
    if (isIdeal) return 0;
    return getSwVf(id) + current * rOn;
  };

  const pointsPerCycle = 1000;
  const totalCycles = 8; // Simulate 8 cycles to achieve true periodic steady-state
  const cyclesToKeep = 2; // Return last 2 steady-state cycles
  const totalSteps = pointsPerCycle * totalCycles;
  const dt = period / pointsPerCycle;

  // Running state variables
  let iLoad = 0;
  let activeState = 0; // State memory for conducting switch arm

  const allSamples: SimulationSample[] = [];

  for (let step = 0; step < totalSteps; step++) {
    const t = step * dt;
    const theta = (omega * t) % TWO_PI;
    const cycleIndex = Math.floor(step / pointsPerCycle);

    let vOut = E;
    let iSourceA = 0;
    let iSourceB: number | undefined;
    let iSourceC: number | undefined;
    let conductingSwitches: string[] = [];
    let vSwitch1 = 0;
    let iSwitch1 = 0;
    let iFwd = 0;

    const vSa = Vm * Math.sin(theta);
    let vSb = 0;
    let vSc = 0;

    // ==========================================
    // TOPOLOGY 1: 1-PHASE HALF-WAVE RECTIFIER
    // ==========================================
    if (topology === '1ph-half') {
      const isThyristor = switches.S1 === 'thyristor';
      const vfS1 = getSwVf('S1');
      const forwardBias = vSa > E + vfS1;
      const inFiringRange = theta >= alphaRad && theta < Math.PI;

      // Firing / turn-on condition
      if (activeState === 0) {
        if (!isThyristor && forwardBias) {
          activeState = 1;
        } else if (isThyristor && inFiringRange && forwardBias) {
          activeState = 1;
        }
      }

      // Conduction / freewheeling resolution
      if (activeState === 1) {
        if (fwd && vSa < 0 && iLoad > 0) {
          // Freewheeling Diode conducts: clamps output, commutates S1 off
          const dropFwd = getSwDrop('FWD', iLoad);
          vOut = -dropFwd;
          conductingSwitches = ['FWD'];
          iFwd = iLoad;
          iSourceA = 0;
          iSwitch1 = 0;
          vSwitch1 = vSa - vOut; // S1 reverse biased by vSa
        } else {
          // S1 is conducting
          const dropS1 = getSwDrop('S1', iLoad);
          vOut = vSa - dropS1;
          conductingSwitches = ['S1'];
          iSourceA = iLoad;
          iSwitch1 = iLoad;
          vSwitch1 = dropS1;
        }

        // Integrate load current di/dt = (vOut - R*i - E) / totalL
        if (totalL < 1e-6) {
          iLoad = Math.max(0, (vOut - E) / Math.max(0.01, R));
        } else {
          const di = (dt * (vOut - R * iLoad - E)) / totalL;
          iLoad = Math.max(0, iLoad + di);
        }

        if (iLoad <= 0) {
          iLoad = 0;
          activeState = 0;
          vOut = E;
          conductingSwitches = [];
        }
      } else {
        // Switch is OFF and FWD is OFF
        vOut = E;
        iLoad = 0;
        iSourceA = 0;
        iSwitch1 = 0;
        vSwitch1 = vSa - E;
      }
    }

    // ==========================================
    // TOPOLOGY 2: 1-PHASE MID-POINT (CENTER-TAPPED)
    // ==========================================
    else if (topology === '1ph-midpoint') {
      const vS1 = vSa;
      const vS2 = -vSa;
      const isS1Thyristor = switches.S1 === 'thyristor';
      const isS2Thyristor = switches.S2 === 'thyristor';
      const vfS1 = getSwVf('S1');
      const vfS2 = getSwVf('S2');

      // S1 trigger window [alpha, pi], S2 trigger window [pi + alpha, 2pi]
      const s1CanTrigger = (!isS1Thyristor || (theta >= alphaRad && theta < Math.PI)) && vS1 > E + vfS1;
      const s2CanTrigger = (!isS2Thyristor || (theta >= Math.PI + alphaRad && theta < TWO_PI)) && vS2 > E + vfS2;

      if (activeState === 0) {
        if (s1CanTrigger) activeState = 1;
        else if (s2CanTrigger) activeState = 2;
      } else if (activeState === 1) {
        if (s2CanTrigger) activeState = 2;
      } else if (activeState === 2) {
        if (s1CanTrigger) activeState = 1;
      }

      if (activeState !== 0) {
        const vDrive = activeState === 1 ? vS1 : vS2;
        const activeSw = activeState === 1 ? 'S1' : 'S2';

        if (fwd && vDrive < 0 && iLoad > 0) {
          // Freewheeling
          const dropFwd = getSwDrop('FWD', iLoad);
          vOut = -dropFwd;
          conductingSwitches = ['FWD'];
          iFwd = iLoad;
          iSourceA = 0;
          iSwitch1 = 0;
          vSwitch1 = vS1 - vOut;
        } else {
          const drop = getSwDrop(activeSw, iLoad);
          vOut = vDrive - drop;
          conductingSwitches = activeState === 1 ? ['S1'] : ['S2'];
          if (activeState === 1) {
            iSourceA = iLoad;
            iSwitch1 = iLoad;
            vSwitch1 = drop;
          } else {
            iSourceA = -iLoad;
            iSwitch1 = 0;
            vSwitch1 = vS1 - vS2; // S1 blocks 2*Vm
          }
        }

        // Integrate current
        if (totalL < 1e-6) {
          iLoad = Math.max(0, (vOut - E) / Math.max(0.01, R));
        } else {
          const di = (dt * (vOut - R * iLoad - E)) / totalL;
          iLoad = Math.max(0, iLoad + di);
        }

        if (iLoad <= 0) {
          iLoad = 0;
          activeState = 0;
          vOut = E;
          conductingSwitches = [];
        }
      } else {
        vOut = E;
        iLoad = 0;
        iSourceA = 0;
        iSwitch1 = 0;
        vSwitch1 = vS1 - E;
      }
    }

    // ==========================================
    // TOPOLOGY 3: 1-PHASE FULL-WAVE BRIDGE
    // ==========================================
    else if (topology === '1ph-bridge') {
      const half = theta < Math.PI ? 1 : -1;
      const thetaHalf = theta % Math.PI;

      // Positive arm: S1, S2. Negative arm: S3, S4.
      const isTopThyristor = half === 1 ? switches.S1 === 'thyristor' : switches.S3 === 'thyristor';
      const isBottomThyristor = half === 1 ? switches.S2 === 'thyristor' : switches.S4 === 'thyristor';

      // Semi-converter configurations check:
      const isUpperDiodes = switches.S1 === 'diode' && switches.S3 === 'diode';
      const isLowerDiodes = switches.S4 === 'diode' && switches.S2 === 'diode';
      const isLeg1Diodes = switches.S1 === 'diode' && switches.S4 === 'diode';
      const isLeg2Diodes = switches.S3 === 'diode' && switches.S2 === 'diode';
      const hasAnyDiode = switches.S1 === 'diode' || switches.S2 === 'diode' || switches.S3 === 'diode' || switches.S4 === 'diode';
      const hasAnyThyristor = switches.S1 === 'thyristor' || switches.S2 === 'thyristor' || switches.S3 === 'thyristor' || switches.S4 === 'thyristor';
      const isSemiConverter = hasAnyDiode && hasAnyThyristor;

      // Trigger condition for entering conduction of this half-wave:
      // If both switches in this arm are diodes, triggers naturally when forward biased.
      // If either switch is a thyristor, requires gate firing angle delay.
      const requiresFiringPulse = isTopThyristor || isBottomThyristor;
      const triggerCond = !requiresFiringPulse || thetaHalf >= alphaRad;
      const armSwA = half === 1 ? 'S1' : 'S3';
      const armSwB = half === 1 ? 'S2' : 'S4';
      const armDropThreshold = getSwVf(armSwA) + getSwVf(armSwB);
      const forwardBias = half * vSa > E + armDropThreshold;

      // Commutation / firing
      if (activeState !== half) {
        if (triggerCond && (activeState === 0 || forwardBias)) {
          activeState = half;
        }
      }

      if (activeState !== 0) {
        const vDrive = activeState * vSa;

        // Freewheeling check: External FWD active OR inherent semi-converter diode freewheeling
        const shouldFreewheel = (fwd || isSemiConverter) && vDrive < 0 && iLoad > 0;

        if (shouldFreewheel) {
          iFwd = iLoad;
          iSourceA = 0;
          iSwitch1 = 0;
          vSwitch1 = -Math.abs(vSa);

          if (fwd) {
            conductingSwitches = ['FWD'];
            vOut = -getSwDrop('FWD', iLoad);
          } else if (isUpperDiodes) {
            // Upper diodes S1, S3 with lower thyristors S4, S2
            conductingSwitches = activeState === 1 ? ['S3', 'S2'] : ['S1', 'S4'];
            const pairDrop = activeState === 1
              ? (getSwDrop('S3', iLoad) + getSwDrop('S2', iLoad))
              : (getSwDrop('S1', iLoad) + getSwDrop('S4', iLoad));
            vOut = -pairDrop;
          } else if (isLowerDiodes) {
            // Lower diodes S4, S2 with upper thyristors S1, S3
            conductingSwitches = activeState === 1 ? ['S1', 'S4'] : ['S3', 'S2'];
            const pairDrop = activeState === 1
              ? (getSwDrop('S1', iLoad) + getSwDrop('S4', iLoad))
              : (getSwDrop('S3', iLoad) + getSwDrop('S2', iLoad));
            vOut = -pairDrop;
          } else if (isLeg1Diodes) {
            conductingSwitches = ['S1', 'S4'];
            vOut = -(getSwDrop('S1', iLoad) + getSwDrop('S4', iLoad));
          } else if (isLeg2Diodes) {
            conductingSwitches = ['S3', 'S2'];
            vOut = -(getSwDrop('S3', iLoad) + getSwDrop('S2', iLoad));
          } else {
            conductingSwitches = activeState === 1 ? ['S1', 'S4'] : ['S3', 'S2'];
            vOut = -(getSwDrop(conductingSwitches[0], iLoad) + getSwDrop(conductingSwitches[1], iLoad));
          }
        } else {
          if (activeState === 1) {
            conductingSwitches = ['S1', 'S2'];
            const drop = getSwDrop('S1', iLoad) + getSwDrop('S2', iLoad);
            vOut = vDrive - drop;
            iSourceA = iLoad;
            iSwitch1 = iLoad;
            vSwitch1 = getSwDrop('S1', iLoad);
          } else {
            conductingSwitches = ['S3', 'S4'];
            const drop = getSwDrop('S3', iLoad) + getSwDrop('S4', iLoad);
            vOut = vDrive - drop;
            iSourceA = -iLoad;
            iSwitch1 = 0;
            vSwitch1 = -vSa;
          }
        }

        // Integration of load current
        if (totalL < 1e-6) {
          iLoad = Math.max(0, (vOut - E) / Math.max(0.01, R));
        } else {
          const di = (dt * (vOut - R * iLoad - E)) / totalL;
          iLoad = Math.max(0, iLoad + di);
        }

        if (iLoad <= 0) {
          iLoad = 0;
          activeState = 0;
          vOut = E;
          conductingSwitches = [];
        }
      } else {
        vOut = E;
        iLoad = 0;
        iSourceA = 0;
        iSwitch1 = 0;
        vSwitch1 = vSa - E;
      }
    }

    // ==========================================
    // TOPOLOGY 4: 3-PHASE HALF-WAVE (STAR / M3)
    // ==========================================
    else if (topology === '3ph-half') {
      vSb = Vm * Math.sin(theta - (2 * Math.PI) / 3);
      vSc = Vm * Math.sin(theta + (2 * Math.PI) / 3);

      const vPhases = [vSa, vSb, vSc];
      // Firing angle delay from natural crossover (30° / pi/6)
      const vTrigger = [
        Vm * Math.sin(theta - alphaRad),
        Vm * Math.sin(theta - (2 * Math.PI) / 3 - alphaRad),
        Vm * Math.sin(theta + (2 * Math.PI) / 3 - alphaRad),
      ];

      let maxIdx = 0;
      let maxV = -Infinity;
      for (let p = 0; p < 3; p++) {
        const swType = switches[`S${p + 1}`];
        const val = swType === 'thyristor' ? vTrigger[p] : vPhases[p];
        if (val > maxV) {
          maxV = val;
          maxIdx = p;
        }
      }

      const vActive = vPhases[maxIdx];
      const activeSwName = `S${maxIdx + 1}`;
      const swVf = getSwVf(activeSwName);

      if (fwd && vActive < 0 && iLoad > 0) {
        vOut = -getSwDrop('FWD', iLoad);
        conductingSwitches = ['FWD'];
        iFwd = iLoad;
        iSourceA = 0;
        iSourceB = 0;
        iSourceC = 0;
      } else if (iLoad <= 0 && vActive <= E + swVf) {
        iLoad = 0;
        vOut = E;
        conductingSwitches = [];
      } else {
        const drop = getSwDrop(activeSwName, iLoad);
        vOut = vActive - drop;
        conductingSwitches = [activeSwName];
        iSourceA = maxIdx === 0 ? iLoad : 0;
        iSourceB = maxIdx === 1 ? iLoad : 0;
        iSourceC = maxIdx === 2 ? iLoad : 0;
        if (maxIdx === 0) {
          iSwitch1 = iLoad;
          vSwitch1 = drop;
        } else {
          iSwitch1 = 0;
          vSwitch1 = vSa - vActive;
        }
      }

      // Integrate
      if (totalL < 1e-6) {
        iLoad = Math.max(0, (vOut - E) / Math.max(0.01, R));
      } else {
        const di = (dt * (vOut - R * iLoad - E)) / totalL;
        iLoad = Math.max(0, iLoad + di);
      }

      if (iLoad <= 0) {
        iLoad = 0;
        vOut = E;
        conductingSwitches = [];
      }
    }

    // ==========================================
    // TOPOLOGY 5: 3-PHASE 6-PULSE FULL BRIDGE
    // ==========================================
    else if (topology === '3ph-bridge') {
      vSb = Vm * Math.sin(theta - (2 * Math.PI) / 3);
      vSc = Vm * Math.sin(theta + (2 * Math.PI) / 3);

      const vPhases = [vSa, vSb, vSc];
      const vTrigger = [
        Vm * Math.sin(theta - alphaRad),
        Vm * Math.sin(theta - (2 * Math.PI) / 3 - alphaRad),
        Vm * Math.sin(theta + (2 * Math.PI) / 3 - alphaRad),
      ];

      const topSwitches = ['S1', 'S3', 'S5'];
      let topIdx = 0;
      let topMax = -Infinity;
      for (let p = 0; p < 3; p++) {
        const swType = switches[topSwitches[p]];
        const val = swType === 'thyristor' ? vTrigger[p] : vPhases[p];
        if (val > topMax) {
          topMax = val;
          topIdx = p;
        }
      }

      const botSwitches = ['S4', 'S6', 'S2'];
      let botIdx = 0;
      let botMin = Infinity;
      for (let p = 0; p < 3; p++) {
        const swType = switches[botSwitches[p]];
        const val = swType === 'thyristor' ? vTrigger[p] : vPhases[p];
        if (val < botMin) {
          botMin = val;
          botIdx = p;
        }
      }

      const topSwName = topSwitches[topIdx];
      const botSwName = botSwitches[botIdx];
      const vLine = vPhases[topIdx] - vPhases[botIdx];
      const swValues3 = Object.values(switches);
      const is3phSemiConverter = swValues3.some((s) => s === 'diode') && swValues3.some((s) => s === 'thyristor');
      const should3phFreewheel = (fwd || is3phSemiConverter) && vLine < 0 && iLoad > 0;
      const vLineThreshold = getSwVf(topSwName) + getSwVf(botSwName);

      if (should3phFreewheel) {
        vOut = -getSwDrop('FWD', iLoad);
        iFwd = iLoad;
        iSourceA = 0;
        iSourceB = 0;
        iSourceC = 0;
        if (fwd) {
          conductingSwitches = ['FWD'];
        } else {
          // Inherent semi-converter freewheeling through leg companion switches
          const companionBot = topIdx === 0 ? 'S4' : topIdx === 1 ? 'S6' : 'S2';
          conductingSwitches = [topSwitches[topIdx], companionBot];
        }
        vSwitch1 = -Math.abs(vSa);
      } else if (iLoad <= 0 && vLine <= E + vLineThreshold) {
        iLoad = 0;
        vOut = E;
        conductingSwitches = [];
      } else {
        const dropPair = getSwDrop(topSwName, iLoad) + getSwDrop(botSwName, iLoad);
        vOut = vLine - dropPair;
        conductingSwitches = [topSwName, botSwName];

        iSourceA = iLoad * ((topIdx === 0 ? 1 : 0) - (botIdx === 0 ? 1 : 0));
        iSourceB = iLoad * ((topIdx === 1 ? 1 : 0) - (botIdx === 1 ? 1 : 0));
        iSourceC = iLoad * ((topIdx === 2 ? 1 : 0) - (botIdx === 2 ? 1 : 0));

        if (topIdx === 0) {
          iSwitch1 = iLoad;
          vSwitch1 = getSwDrop(topSwName, iLoad);
        } else {
          iSwitch1 = 0;
          vSwitch1 = vSa - vPhases[topIdx];
        }
      }

      // Integrate
      if (totalL < 1e-6) {
        iLoad = Math.max(0, (vOut - E) / Math.max(0.01, R));
      } else {
        const di = (dt * (vOut - R * iLoad - E)) / totalL;
        iLoad = Math.max(0, iLoad + di);
      }

      if (iLoad <= 0) {
        iLoad = 0;
        vOut = E;
        conductingSwitches = [];
      }
    }

    // Store sample if in the last 2 cycles (steady-state)
    if (cycleIndex >= totalCycles - cyclesToKeep) {
      // Calculate anode-to-cathode voltages for all individual switches
      const switchVoltages: Record<string, number> = {};
      if (topology === '1ph-half') {
        switchVoltages.S1 = conductingSwitches.includes('S1') ? getSwDrop('S1', iLoad) : (vSa - vOut);
        if (fwd) switchVoltages.FWD = conductingSwitches.includes('FWD') ? getSwDrop('FWD', iLoad) : -Math.max(0, vOut);
      } else if (topology === '1ph-midpoint') {
        const vS1 = vSa;
        const vS2 = -vSa;
        switchVoltages.S1 = conductingSwitches.includes('S1') ? getSwDrop('S1', iLoad) : (vS1 - vOut);
        switchVoltages.S2 = conductingSwitches.includes('S2') ? getSwDrop('S2', iLoad) : (vS2 - vOut);
        if (fwd) switchVoltages.FWD = conductingSwitches.includes('FWD') ? getSwDrop('FWD', iLoad) : -Math.max(0, vOut);
      } else if (topology === '1ph-bridge') {
        const isS1 = conductingSwitches.includes('S1');
        const isS2 = conductingSwitches.includes('S2');
        const isS3 = conductingSwitches.includes('S3');
        const isS4 = conductingSwitches.includes('S4');
        switchVoltages.S1 = isS1 ? getSwDrop('S1', iLoad) : (isS3 || isS4 ? vSa : (vSa > 0 && vOut <= 0.1 ? vSa : -Math.max(0, -vSa)));
        switchVoltages.S2 = isS2 ? getSwDrop('S2', iLoad) : (isS3 || isS4 ? vSa : (vSa > 0 && vOut <= 0.1 ? vSa : -Math.max(0, -vSa)));
        switchVoltages.S3 = isS3 ? getSwDrop('S3', iLoad) : (isS1 || isS2 ? -vSa : (-vSa > 0 && vOut <= 0.1 ? -vSa : -Math.max(0, vSa)));
        switchVoltages.S4 = isS4 ? getSwDrop('S4', iLoad) : (isS1 || isS2 ? -vSa : (-vSa > 0 && vOut <= 0.1 ? -vSa : -Math.max(0, vSa)));
        if (fwd) switchVoltages.FWD = conductingSwitches.includes('FWD') ? getSwDrop('FWD', iLoad) : -Math.max(0, vOut);
      } else if (topology === '3ph-half') {
        switchVoltages.S1 = conductingSwitches.includes('S1') ? getSwDrop('S1', iLoad) : (vSa - vOut);
        switchVoltages.S2 = conductingSwitches.includes('S2') ? getSwDrop('S2', iLoad) : (vSb - vOut);
        switchVoltages.S3 = conductingSwitches.includes('S3') ? getSwDrop('S3', iLoad) : (vSc - vOut);
        if (fwd) switchVoltages.FWD = conductingSwitches.includes('FWD') ? getSwDrop('FWD', iLoad) : -Math.max(0, vOut);
      } else if (topology === '3ph-bridge') {
        const vMaxPh = Math.max(vSa, vSb, vSc);
        const vMinPh = Math.min(vSa, vSb, vSc);
        switchVoltages.S1 = conductingSwitches.includes('S1') ? getSwDrop('S1', iLoad) : (vSa - vMaxPh);
        switchVoltages.S3 = conductingSwitches.includes('S3') ? getSwDrop('S3', iLoad) : (vSb - vMaxPh);
        switchVoltages.S5 = conductingSwitches.includes('S5') ? getSwDrop('S5', iLoad) : (vSc - vMaxPh);
        switchVoltages.S4 = conductingSwitches.includes('S4') ? getSwDrop('S4', iLoad) : (vMinPh - vSa);
        switchVoltages.S6 = conductingSwitches.includes('S6') ? getSwDrop('S6', iLoad) : (vMinPh - vSb);
        switchVoltages.S2 = conductingSwitches.includes('S2') ? getSwDrop('S2', iLoad) : (vMinPh - vSc);
        if (fwd) switchVoltages.FWD = conductingSwitches.includes('FWD') ? getSwDrop('FWD', iLoad) : -Math.max(0, vOut);
      }


      allSamples.push({
        time: t,
        thetaRad: theta,
        thetaDeg: (theta * 180) / Math.PI,
        cycleIndex: cycleIndex - (totalCycles - cyclesToKeep),
        vSourceA: vSa,
        vSourceB: topology.startsWith('3ph') ? vSb : undefined,
        vSourceC: topology.startsWith('3ph') ? vSc : undefined,
        iSourceA,
        iSourceB: topology.startsWith('3ph') ? iSourceB : undefined,
        iSourceC: topology.startsWith('3ph') ? iSourceC : undefined,
        vOutput: vOut,
        iOutput: iLoad,
        iFwd: fwd ? iFwd : undefined,
        conductingSwitches,
        vSwitch1,
        iSwitch1,
        switchVoltages,
      });
    }
  }

  // Calculate metrics over exactly one full cycle (pointsPerCycle samples)
  const oneCycleSamples = allSamples.slice(0, pointsPerCycle);
  const n = oneCycleSamples.length;

  const vSum = oneCycleSamples.reduce((acc, s) => acc + s.vOutput, 0);
  const vSqSum = oneCycleSamples.reduce((acc, s) => acc + s.vOutput * s.vOutput, 0);
  const iSum = oneCycleSamples.reduce((acc, s) => acc + s.iOutput, 0);
  const iSqSum = oneCycleSamples.reduce((acc, s) => acc + s.iOutput * s.iOutput, 0);
  const isSqSum = oneCycleSamples.reduce((acc, s) => acc + s.iSourceA * s.iSourceA, 0);
  const vsSqSum = oneCycleSamples.reduce((acc, s) => acc + s.vSourceA * s.vSourceA, 0);
  const pSum = oneCycleSamples.reduce((acc, s) => acc + s.vOutput * s.iOutput, 0);

  const vDc = vSum / n;
  const vRms = Math.sqrt(vSqSum / n);
  const iDc = iSum / n;
  const iRms = Math.sqrt(iSqSum / n);
  const isRms = Math.sqrt(isSqSum / n);
  const vsRms = Math.sqrt(vsSqSum / n);
  const activePower = pSum / n;

  const numPhases = topology.startsWith('3ph') ? 3 : 1;
  const apparentPower = numPhases * vsRms * isRms;
  const powerFactor = apparentPower > 1e-4 ? Math.min(1, Math.max(0, activePower / apparentPower)) : 0;

  const rippleFactorV = vDc > 1e-4 ? Math.sqrt(Math.max(0, (vRms * vRms) / (vDc * vDc) - 1)) : 0;
  const formFactor = vDc > 1e-4 ? vRms / vDc : 1;

  let vMin = Infinity;
  let vMax = -Infinity;
  for (const s of oneCycleSamples) {
    if (s.vOutput < vMin) vMin = s.vOutput;
    if (s.vOutput > vMax) vMax = s.vOutput;
  }
  const vPeakToPeak = Math.max(0, vMax - vMin);

  // Switch 1 stress
  let piv = 0;
  let sw1ConductionCount = 0;
  let sw1CurrentSum = 0;
  let sw1CurrentSqSum = 0;
  for (const s of oneCycleSamples) {
    if (s.vSwitch1 < piv) piv = s.vSwitch1;
    if (s.iSwitch1 > 1e-3) sw1ConductionCount++;
    sw1CurrentSum += s.iSwitch1;
    sw1CurrentSqSum += s.iSwitch1 * s.iSwitch1;
  }
  const peakInverseVoltageSw1 = Math.abs(piv);
  const avgSwitchCurrentSw1 = sw1CurrentSum / n;
  const rmsSwitchCurrentSw1 = Math.sqrt(sw1CurrentSqSum / n);
  const conductionAngleDeg = (sw1ConductionCount / n) * 360;

  // Discrete Fourier Transform on source line current (iSourceA) for harmonics
  const isValues = oneCycleSamples.map((s) => s.iSourceA);
  const isSum = isValues.reduce((acc, v) => acc + v, 0);
  const isDc = isSum / n;
  const isSqSumTotal = isValues.reduce((acc, v) => acc + v * v, 0);
  const isTotalRms = Math.sqrt(isSqSumTotal / n);
  // AC component RMS of line current (eliminating any DC offset for half-wave topologies)
  const isAcRms = Math.sqrt(Math.max(0, isTotalRms * isTotalRms - isDc * isDc));

  const harmonics = computeHarmonics(isValues, f);
  const fundamental = harmonics.find((h) => h.order === 1)?.magnitude || 1e-6;

  // Exact IEEE 519 / Parseval Total Harmonic Distortion (THD_i):
  // THD = sqrt(I_ac,rms^2 - I_1,rms^2) / I_1,rms * 100%
  const higherHarmonicsRms = Math.sqrt(Math.max(0, isAcRms * isAcRms - fundamental * fundamental));
  const thdCurrent = fundamental > 1e-4 ? (higherHarmonicsRms / fundamental) * 100 : 0;

  // Displacement factor (cos phi_1) relative to vSourceA = Vm * sin(wt) reference
  let sumSin = 0;
  let sumCos = 0;
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    sumSin += isValues[i] * Math.sin(angle);
    sumCos += isValues[i] * Math.cos(angle);
  }
  const i1Sin = (2 * sumSin) / n; // In-phase with Vm * sin(wt)
  const i1Cos = (2 * sumCos) / n; // Quadrature component
  const i1Peak = Math.sqrt(i1Sin * i1Sin + i1Cos * i1Cos);
  const displacementFactor = i1Peak > 1e-4 ? Math.min(1, Math.max(0, Math.abs(i1Sin) / i1Peak)) : 1;

  // Rectification efficiency: P_dc / P_ac
  const pDc = vDc * iDc;
  const rectificationEfficiency = activePower > 1e-4 ? Math.min(100, Math.max(0, (pDc / activePower) * 100)) : 0;

  const theoreticalVDc = calculateTheoreticalVDc(params);

  const metrics: SimulationMetrics = {
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
    avgSwitchCurrentSw1,
    rmsSwitchCurrentSw1,
    conductionAngleDeg,
    theoreticalVDc,
  };

  return {
    params,
    samples: allSamples,
    metrics,
    harmonics,
    cyclesSimulated: cyclesToKeep,
    periodMs: period * 1000,
  };
}

/**
 * Compute discrete harmonic components (orders 1 to 19)
 */
function computeHarmonics(signal: number[], fundamentalFreq: number): HarmonicComponent[] {
  const n = signal.length;
  const orders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const results: { order: number; magnitude: number }[] = [];

  for (const k of orders) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * i) / n;
      re += signal[i] * Math.cos(angle);
      im -= signal[i] * Math.sin(angle);
    }
    re = (2 * re) / n;
    im = (2 * im) / n;
    const mag = Math.sqrt(re * re + im * im) / Math.SQRT2;
    results.push({ order: k, magnitude: mag });
  }

  const fundMag = results.find((r) => r.order === 1)?.magnitude || 1e-6;

  return results.map((r) => ({
    order: r.order,
    frequency: r.order * fundamentalFreq,
    magnitude: r.magnitude,
    percentage: fundMag > 1e-5 ? (r.magnitude / fundMag) * 100 : 0,
  }));
}

/**
 * Fundamental phase computation for displacement factor
 */
function computeFundamentalPhase(signal: number[]): { phaseRad: number } {
  const n = signal.length;
  let re = 0;
  let im = 0;
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    re += signal[i] * Math.cos(angle);
    im -= signal[i] * Math.sin(angle);
  }
  return { phaseRad: Math.atan2(im, re) };
}
