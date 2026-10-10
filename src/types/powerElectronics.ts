export type TopologyType =
  | '1ph-half'
  | '1ph-midpoint'
  | '1ph-bridge'
  | '3ph-half'
  | '3ph-bridge';

export type SwitchType = 'diode' | 'thyristor';

export type LoadType = 'R' | 'RL' | 'RLE';

export interface SwitchState {
  id: string;
  name: string;
  type: SwitchType;
  firingAngleDeg: number; // For thyristors
  isConducting: boolean;
  current: number;
  voltageAK: number; // Anode-to-Cathode voltage
}

export interface CircuitParameters {
  topology: TopologyType;
  // AC Source
  peakVoltage: number; // Vm (Volts peak)
  frequency: number; // Hz (usually 50 or 60)
  sourceInductance: number; // mH (Ls for commutation overlap)
  
  // Switches
  switches: Record<string, SwitchType>; // switch ID -> 'diode' | 'thyristor'
  firingAngleDeg: number; // master firing angle alpha (0 to 180)
  forwardDrop: number; // Vf (Volts, e.g. 0V ideal, 0.7V diode, 1.2V thyristor)
  switchModel?: 'ideal' | 'non-ideal'; // Choice between ideal and non-ideal components
  diodeForwardDrop?: number; // Vf for diodes (Volts, e.g. 0.7V)
  thyristorForwardDrop?: number; // Vf for thyristors (Volts, e.g. 1.4V)
  switchResistance?: number; // Dynamic internal on-resistance Ron (Ohms, e.g. 0.05Ω)
  
  // Load
  loadType: LoadType;
  resistance: number; // Ohms
  inductance: number; // mH
  backEmf: number; // Volts (DC motor / battery)
  freewheelingDiode: boolean; // FWD across load
}

export interface SimulationSample {
  time: number; // seconds
  thetaRad: number; // radians (0 to 2pi * cycles)
  thetaDeg: number; // degrees
  cycleIndex: number;
  
  // Source voltages
  vSourceA: number;
  vSourceB?: number;
  vSourceC?: number;
  
  // Source currents
  iSourceA: number;
  iSourceB?: number;
  iSourceC?: number;
  
  // Output load
  vOutput: number;
  iOutput: number;
  
  // Freewheeling diode
  iFwd?: number;
  
  // Switch conduction flags & voltages for switch 1 (representative)
  conductingSwitches: string[];
  vSwitch1: number; // Anode to Cathode
  iSwitch1: number;
  switchVoltages?: Record<string, number>; // Anode-to-Cathode voltage for every switch (S1..S6, FWD)
}

export interface HarmonicComponent {
  order: number;
  frequency: number; // Hz
  magnitude: number; // Peak or RMS
  percentage: number; // % of fundamental
}

export interface SimulationMetrics {
  vDc: number; // Average load voltage (V)
  vRms: number; // RMS load voltage (V)
  iDc: number; // Average load current (A)
  iRms: number; // RMS load current (A)
  rippleFactorV: number; // Form factor RF
  formFactor: number;
  vPeakToPeak: number;
  
  // Power & AC Input
  activePower: number; // W (average load power)
  apparentPower: number; // VA
  powerFactor: number; // PF = P / S
  displacementFactor: number; // DPF = cos(phi1)
  thdCurrent: number; // Total Harmonic Distortion (%)
  rectificationEfficiency: number; // P_dc / P_ac (%)
  
  // Switch stresses
  peakInverseVoltageSw1: number; // PIV (V)
  avgSwitchCurrentSw1: number; // A
  rmsSwitchCurrentSw1: number; // A
  conductionAngleDeg: number; // gamma (degrees)
  
  // Theoretical expected V_dc for reference
  theoreticalVDc: number;
}

export interface SimulationResult {
  params: CircuitParameters;
  samples: SimulationSample[];
  metrics: SimulationMetrics;
  harmonics: HarmonicComponent[];
  cyclesSimulated: number;
  periodMs: number;
}
