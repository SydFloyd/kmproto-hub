/**
 * Reduced-order, SI-unit smoker model. This is a controller demonstration, not
 * a calibrated burner or cooking-safety model. All rates / conductances below
 * are nominal engineering assumptions; source-backed chemistry is separate.
 *
 * An established ember bed supplies startup energy. Hardwood is a finite batch;
 * pellets are the same biomass chemistry with faster small-particle kinetics,
 * delivered from a finite hopper. Pyrolysis partitions mass into char and gas;
 * oxygen-limited gas escapes rather than releasing imaginary combustion heat.
 * Species, fuel geometry, flame mixing, emissions, and internal food geometry
 * require experimental calibration beyond this lumped model.
 */
export type FuelKind = 'wood' | 'pellets' | 'hybrid';
export type ControlMode = 'auto' | 'manual';
export type PelletControl = 'feed-and-air' | 'damper-only';
export type BurnPhase = 'Warming / drying' | 'Volatile flame' | 'Char / embers' | 'Metered pellet burn' | 'Hybrid wood + pellets' | 'Fuel depleted' | 'Fire cooling';

export interface SmokerConfig {
  fuel: FuelKind;
  mode: ControlMode;
  pelletControl: PelletControl;
  targetC: number;
  ambientC: number;
  windMps: number;
  woodMoisture: number; // water / wet fuel mass, for either selected fuel
  meatMassKg: number;
  initialWoodKg: number; // hybrid wet wood charge
  initialPelletKg: number; // hybrid wet pellet hopper
  pelletMoisture: number; // independent hybrid pellet wet-basis moisture
  initialFuelKg: number; // hardwood charge or pellet hopper, excludes starter
  pelletFeedKgH: number; // manual / damper-only commanded feed
  intake: number; // pure-mode / legacy command, fractions 0..1
  woodIntake: number; // dedicated hybrid wood firebox command
  pelletIntake: number; // dedicated hybrid pellet firebox command
  exhaust: number;
}

export const DEFAULT_CONFIG: SmokerConfig = {
  fuel: 'wood', mode: 'auto', pelletControl: 'feed-and-air', targetC: (250 - 32) * 5 / 9,
  ambientC: 20, windMps: 0, woodMoisture: 0.20, meatMassKg: 3,
  initialWoodKg: .35, initialPelletKg: 3, pelletMoisture: .08,
  initialFuelKg: 1, pelletFeedKgH: 0.7, intake: 0.45, woodIntake: .45, pelletIntake: .45, exhaust: 0.85,
};

export const MODEL_SOURCES = [
  { title: 'USDA: fuelwood moisture and heating values', url: 'https://research.fs.usda.gov/treesearch/34919' },
  { title: 'USDA: net combustion heat, char and oxygen demand', url: 'https://research.fs.usda.gov/treesearch/8568' },
  { title: 'USDA: drying, pyrolysis and char oxidation', url: 'https://research.fs.usda.gov/treesearch/8392' },
  { title: 'DOE: wet-basis moisture and evaporation energy', url: 'https://www.energy.gov/documents/doe-iefoundationalbuildingheathotwatertextversionpdf-0' },
  { title: 'Traeger: temperature control changes pellet auger feed', url: 'https://support.traeger.com/hc/en-us/articles/20230767254939-Non-WiFi-AC-Grill-Controllers' },
] as const;

export const MODEL_ASSUMPTIONS = {
  dryWoodNetJPerKg: 18_500_000,
  charNetJPerKg: 30_000_000,
  charYield: 0.20,
  volatileNetJPerKg: 15_625_000, // .8 * 15.625 + .2 * 30 = 18.5 MJ/kg
  waterLatentJPerKg: 2_300_000,
  airOxygenMassFraction: 0.232,
  volatileOxygenKgPerKg: 1.15,
  charOxygenKgPerKg: 2.667,
  chamberHeatCapacityJPerK: 4_500,
  wallHeatCapacityJPerK: 22_000,
  fireHeatCapacityJPerK: 2_000,
  meatSpecificHeatJPerKgK: 3_300,
  notes: 'Nominal lumped geometry, kinetics, heat transfer and feedback gains. The smoke index is a relative oxygen / temperature indicator, not a particulate, flavor or emissions prediction. Food temperatures are illustrative, not a doneness or safety recommendation.',
} as const;

export interface FuelBed {
  dryKg: number;
  charKg: number;
  waterKg: number;
  temperatureC: number;
  addedKg: number; // includes starter char and pellet hopper, by fuel origin
  burnedKg: number;
  escapedVolatilesKg: number;
  waterEvaporatedKg: number;
  releasedEnergyJ: number;
  volatilePowerW: number;
  charPowerW: number;
  dryingW: number;
  heatToFuelW: number;
  potentialVolatileKgS: number;
  potentialCharKgS: number;
}

export const HYBRID_CONTROL_ASSUMPTIONS = {
  observerTimeS: 45, woodForecastS: 120, pitForecastS: 240,
  proportionalWPerK: 40, integralWPerKS: .045,
  fireStoredEnergyHorizonS: 240,
  fireHeatCapacityJPerK: 2000, fireToPitWPerK: 2,
  fireLossWPerK: .5, fireWindLossWPerKPerMps: .04,
  branchAirLeakKgS: .00004, branchAirScaleKgS: .003,
  minimumIntake: .12, minimumExhaust: .72,
  cleanGasExcessAirRatio: 1.25, feedExcessAirRatio: 1.8,
  maximumFeedKgH: 2.5, effortSlewPerS: .003,
  minimumWarmFeedKgH: .10,
  woodStarterCharKg: .04, woodStarterChargeKg: .35, pelletStarterDryKg: .025, pelletStarterCharKg: .025,
  observer: 'Idealized access to simulated wood heat release. A real controller needs a calibrated observer using available sensors; that observer is not implemented here.',
  thermalLedger: 'Initial hot-firebox sensible energy is explicit. Fuel mass and chemical-energy ledgers close; fuel sensible-enthalpy transport and changing capacities remain reduced-order approximations.',
} as const;

export interface SmokerState {
  config: SmokerConfig;
  woodBed: FuelBed;
  pelletBed: FuelBed;
  woodPhase: BurnPhase;
  pelletPhase: BurnPhase;
  woodPowerW: number;
  pelletPowerW: number;
  woodVolatilePowerW: number;
  woodCharPowerW: number;
  pelletVolatilePowerW: number;
  pelletCharPowerW: number;
  woodFuelRemainingKg: number;
  pelletFuelRemainingKg: number;
  woodFuelC: number;
  pelletFuelC: number;
  woodDryingW: number;
  pelletDryingW: number;
  woodFireC: number;
  pelletFireC: number;
  woodIntake: number;
  pelletIntake: number;
  woodAirKgS: number;
  pelletAirKgS: number;
  woodHeatIntoChamberW: number;
  pelletHeatIntoChamberW: number;
  woodSmokeIndex: number;
  pelletSmokeIndex: number;
  woodOxygenDemandKgS: number;
  pelletOxygenDemandKgS: number;
  woodOxygenConsumedKgS: number;
  pelletOxygenConsumedKgS: number;
  woodOxygenRatio: number;
  pelletOxygenRatio: number;
  demandPowerW: number;
  residualPelletPowerW: number;
  pelletPilotActive: boolean;
  pelletPilotPowerW: number;
  estimatedWoodPowerW: number;
  estimatedWoodRateWPerS: number;
  predictedWoodPowerW: number;
  committedPelletPowerW: number;
  unavoidableWoodPowerW: number;
  woodOverpower: boolean;
  cleanAirLimited: boolean;
  pelletFeedTargetKgH: number;
  oxygenConsumedKgS: number;
  oxygenDemandKgS: number;
  startupSensibleEnergyJ: number;
  hybridIntegralW: number;
  controlReason: string;
  timeS: number;
  chamberC: number;
  wallC: number;
  fireC: number;
  fuelC: number;
  meatSurfaceC: number;
  meatCoreC: number;
  meatWaterKg: number;
  meatCoreWaterKg: number;
  pelletRelightRequired: boolean;
  feedInhibited: boolean;
  intake: number;
  exhaust: number;
  pelletFeedKgH: number; // actual feed, zero with an empty hopper
  powerW: number;
  volatilePowerW: number;
  charPowerW: number;
  dryingW: number;
  evaporationW: number;
  heatIntoChamberW: number;
  lossW: number;
  airKgS: number;
  oxygenRatio: number;
  smokeIndex: number;
  fuelRemainingKg: number;
  woodDryKg: number;
  charKg: number;
  waterKg: number;
  hopperKg: number;
  hopperMoisture: number; // wet-basis chemistry of the current hopper load
  fuelAddedKg: number;
  fuelConsumedKg: number; // wet mass removed: burned + escaped gas + evaporated fuel water
  fuelBurnedKg: number; // dry mass actually combusted
  escapedVolatilesKg: number;
  fuelWaterEvaporatedKg: number;
  releasedEnergyJ: number;
  phase: BurnPhase;
  errorC: number;
  status: string;
  lidOpenRemainingS: number;
  lidRecoveryS: number;
  controllerIntegral: number;
  controllerEffort: number;
  temperatureRateCPerS: number;
  setpointLimited: boolean;
  remainderS: number;
}

const A = MODEL_ASSUMPTIONS;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
export const cToF = (c: number) => c * 9 / 5 + 32;
export const fToC = (f: number) => (f - 32) * 5 / 9;

function normalizeConfig(options: Partial<SmokerConfig>): SmokerConfig {
  const fuel: FuelKind = options.fuel === 'hybrid' ? 'hybrid' : options.fuel === 'pellets' ? 'pellets' : 'wood';
  const config: SmokerConfig = { ...DEFAULT_CONFIG, ...options, fuel };
  if (options.woodMoisture === undefined) config.woodMoisture = fuel === 'pellets' ? .08 : .20;
  if (options.initialFuelKg === undefined) config.initialFuelKg = fuel === 'wood' ? 1 : 3;
  config.targetC = clamp(finite(config.targetC, DEFAULT_CONFIG.targetC), 65, 175);
  config.ambientC = clamp(finite(config.ambientC, 20), -20, 45);
  config.windMps = clamp(finite(config.windMps, 0), 0, 15);
  config.woodMoisture = clamp(finite(config.woodMoisture, .20), 0, .55);
  config.meatMassKg = clamp(finite(config.meatMassKg, 3), .5, 8);
  config.initialWoodKg = clamp(finite(config.initialWoodKg, .35), 0, 10);
  config.initialPelletKg = clamp(finite(config.initialPelletKg, 3), 0, 10);
  config.pelletMoisture = clamp(finite(config.pelletMoisture, .08), 0, .55);
  config.initialFuelKg = clamp(finite(config.initialFuelKg, 1), 0, 10);
  config.pelletFeedKgH = clamp(finite(config.pelletFeedKgH, .7), 0, 2.5);
  config.intake = clamp(finite(config.intake, .45), 0, 1);
  config.woodIntake = clamp(finite(options.woodIntake ?? config.intake, .45), 0, 1);
  config.pelletIntake = clamp(finite(options.pelletIntake ?? config.intake, .45), 0, 1);
  config.exhaust = clamp(finite(config.exhaust, .85), 0, 1);
  return config;
}

export function createSimulation(options: Partial<SmokerConfig> = {}): SmokerState {
  const config = normalizeConfig(options);
  const hybrid = config.fuel === 'hybrid';
  const woodChargeKg = hybrid ? config.initialWoodKg : config.fuel === 'wood' ? config.initialFuelKg : 0;
  const pelletPresent = hybrid ? config.initialPelletKg > 0 : config.fuel === 'pellets';
  const pelletMoisture = hybrid ? config.pelletMoisture : config.woodMoisture;
  const hopperKg = hybrid ? config.initialPelletKg : config.fuel === 'pellets' ? config.initialFuelKg : 0;
  const woodBed = makeBed(woodChargeKg * (1 - config.woodMoisture), woodChargeKg * config.woodMoisture,
    hybrid ? HYBRID_CONTROL_ASSUMPTIONS.woodStarterCharKg * woodChargeKg / HYBRID_CONTROL_ASSUMPTIONS.woodStarterChargeKg
      : config.fuel === 'wood' ? .18 : 0, config.ambientC);
  const pelletDryKg = pelletPresent ? .025 : 0;
  const pelletBed = makeBed(pelletDryKg, pelletDryKg * pelletMoisture / (1 - pelletMoisture), pelletPresent ? .025 : 0, 160);
  pelletBed.addedKg += hopperKg;
  const woodDryKg = woodBed.dryKg + pelletBed.dryKg;
  const waterKg = woodBed.waterKg + pelletBed.waterKg;
  const charKg = woodBed.charKg + pelletBed.charKg;
  const fuelAddedKg = woodBed.addedKg + pelletBed.addedKg;
  const woodFireC = hybrid ? woodChargeKg > 0 ? 480 : config.ambientC : config.fuel === 'wood' ? 480 : config.ambientC;
  const pelletFireC = hybrid ? pelletPresent ? 480 : config.ambientC : config.fuel === 'pellets' ? 480 : config.ambientC;
  return {
    config, woodBed, pelletBed,
    woodPhase: woodChargeKg > 0 ? 'Warming / drying' : 'Fuel depleted',
    pelletPhase: pelletPresent ? 'Metered pellet burn' : 'Fuel depleted',
    woodPowerW: 0, pelletPowerW: 0, woodVolatilePowerW: 0, woodCharPowerW: 0,
    pelletVolatilePowerW: 0, pelletCharPowerW: 0,
    woodFuelRemainingKg: woodBed.addedKg, pelletFuelRemainingKg: pelletBed.addedKg,
    woodFuelC: woodBed.temperatureC, pelletFuelC: pelletBed.temperatureC,
    woodFireC, pelletFireC, woodIntake: config.woodIntake, pelletIntake: config.pelletIntake,
    woodAirKgS: 0, pelletAirKgS: 0, woodHeatIntoChamberW: 0, pelletHeatIntoChamberW: 0,
    woodSmokeIndex: 0, pelletSmokeIndex: 0, woodOxygenDemandKgS: 0, pelletOxygenDemandKgS: 0,
    woodOxygenConsumedKgS: 0, pelletOxygenConsumedKgS: 0, woodOxygenRatio: 1, pelletOxygenRatio: 1,
    woodDryingW: 0, pelletDryingW: 0, demandPowerW: 0, residualPelletPowerW: 0,
    pelletPilotActive: false, pelletPilotPowerW: 0,
    estimatedWoodPowerW: 0, estimatedWoodRateWPerS: 0, predictedWoodPowerW: 0,
    committedPelletPowerW: 0, unavoidableWoodPowerW: 0, woodOverpower: false, cleanAirLimited: false,
    pelletFeedTargetKgH: 0, oxygenConsumedKgS: 0, oxygenDemandKgS: 0,
    startupSensibleEnergyJ: (hybrid ? HYBRID_CONTROL_ASSUMPTIONS.fireHeatCapacityJPerK
      * (woodFireC + pelletFireC - 2 * config.ambientC) : A.fireHeatCapacityJPerK * (480 - config.ambientC))
      + (pelletBed.dryKg * 1700 + pelletBed.waterKg * 4180) * (160 - config.ambientC),
    hybridIntegralW: 0, controlReason: hybrid ? 'Wood heat plus pellet trim' : 'Temperature feedback',
    timeS: 0, chamberC: config.ambientC, wallC: config.ambientC,
    fireC: hybrid ? (woodFireC + pelletFireC) / 2 : 480, fuelC: config.fuel === 'pellets' ? 160 : config.ambientC,
    meatSurfaceC: 5, meatCoreC: 5, meatWaterKg: config.meatMassKg * .20, meatCoreWaterKg: config.meatMassKg * .45,
    pelletRelightRequired: false, feedInhibited: false,
    intake: config.intake, exhaust: config.exhaust, pelletFeedKgH: 0,
    powerW: 0, volatilePowerW: 0, charPowerW: 0, dryingW: 0, evaporationW: 0,
    heatIntoChamberW: 0, lossW: 0, airKgS: 0, oxygenRatio: 1, smokeIndex: 0,
    fuelRemainingKg: fuelAddedKg, woodDryKg, charKg, waterKg, hopperKg, hopperMoisture: pelletMoisture,
    fuelAddedKg, fuelConsumedKg: 0, fuelBurnedKg: 0, escapedVolatilesKg: 0,
    fuelWaterEvaporatedKg: 0, releasedEnergyJ: 0,
    phase: config.fuel === 'wood' ? 'Warming / drying' : 'Metered pellet burn',
    errorC: config.targetC - config.ambientC, status: 'Warming the pit',
    lidOpenRemainingS: 0, lidRecoveryS: 0, controllerIntegral: 0,
    controllerEffort: .45, temperatureRateCPerS: 0, setpointLimited: false, remainderS: 0,
  };
}

/** Live settings. Change fuel / meat mass with createSimulation for a fresh run. */
export function setControls(state: SmokerState, controls: Partial<Omit<SmokerConfig, 'fuel' | 'initialFuelKg' | 'initialWoodKg' | 'initialPelletKg' | 'meatMassKg'>>): void {
  const priorMode = state.config.mode;
  const priorPelletControl = state.config.pelletControl;
  const branchControls = controls.intake === undefined ? {} : {
    woodIntake: controls.woodIntake ?? controls.intake,
    pelletIntake: controls.pelletIntake ?? controls.intake,
  };
  state.config = normalizeConfig({ ...state.config, ...controls, ...branchControls });
  if (priorMode !== state.config.mode || priorPelletControl !== state.config.pelletControl) {
    state.controllerIntegral = 0;
    state.hybridIntegralW = 0;
    state.controllerEffort = state.intake;
  }
  if (state.config.mode === 'manual') {
    state.woodIntake = state.config.woodIntake;
    state.pelletIntake = state.config.pelletIntake;
    state.intake = state.config.fuel === 'hybrid' ? (state.woodIntake + state.pelletIntake) / 2 : state.config.intake;
    state.exhaust = state.config.exhaust;
  }
}

/** Wet hardwood mass or hopper pellet mass; new wood is mixed into the fuel node. */
export function refuel(state: SmokerState, kg = state.config.fuel === 'pellets' ? 1 : .75, fuel?: 'wood' | 'pellets'): void {
  kg = clamp(finite(kg, 0), 0, 10);
  if (!kg) return;
  if (state.config.fuel === 'hybrid') {
    refuelHybrid(state, kg, fuel ?? 'wood');
    return;
  }
  if (state.config.fuel === 'pellets') {
    state.hopperMoisture = (state.hopperMoisture * state.hopperKg + state.config.woodMoisture * kg) / (state.hopperKg + kg);
    state.hopperKg += kg;
  }
  else {
    const oldMass = state.woodDryKg + state.waterKg;
    state.fuelC = (state.fuelC * oldMass + state.config.ambientC * kg) / (oldMass + kg);
    state.woodDryKg += kg * (1 - state.config.woodMoisture);
    state.waterKg += kg * state.config.woodMoisture;
  }
  state.fuelAddedKg += kg;
  state.fuelRemainingKg += kg;
}

export function openLid(state: SmokerState, seconds = 45): void {
  state.lidOpenRemainingS = Math.max(state.lidOpenRemainingS, clamp(finite(seconds, 45), 0, 600));
  state.lidRecoveryS = 120;
}

function airFlow(state: SmokerState, intake = state.intake, exhaust = state.exhaust): number {
  // Two restrictions in series; either damper can choke flow. Tiny leakage remains.
  const valve = 1 / Math.sqrt(1 / (intake + .025) ** 2 + 1 / (exhaust + .025) ** 2);
  const draft = Math.sqrt(clamp((state.fireC - state.config.ambientC + 60) / 520, .12, 2));
  return .00008 + .006 * valve * draft * (1 + .045 * state.config.windMps);
}

function branchAirFlow(state: SmokerState, kind: 'wood' | 'pellets', intake: number, exhaust: number): number {
  // The common exhaust is in series with each dedicated intake. This nominal
  // branch model does not resolve a pressure network or transfer oxygen between fires.
  const fireC = kind === 'wood' ? state.woodFireC : state.pelletFireC;
  const valve = 1 / Math.sqrt(1 / (intake + .025) ** 2 + 1 / (exhaust + .025) ** 2);
  const draft = Math.sqrt(clamp((fireC - state.config.ambientC + 60) / 520, .12, 2));
  const H = HYBRID_CONTROL_ASSUMPTIONS;
  return H.branchAirLeakKgS + H.branchAirScaleKgS * valve * draft * (1 + .045 * state.config.windMps);
}

function control(state: SmokerState): void {
  const config = state.config;
  if (config.fuel === 'hybrid') { controlHybrid(state); return; }
  if (config.mode === 'manual') {
    state.intake = config.intake;
    state.exhaust = config.exhaust;
    return;
  }
  // Lid-open air temperature is a known disturbance, not an instruction to add
  // a large amount of delayed fire energy. Hold actuators and freeze integrator.
  if (state.lidOpenRemainingS > 0 || config.fuel === 'pellets' && state.timeS > 300 && state.fireC < 120) return;
  const anticipationC = clamp(state.temperatureRateCPerS * 240, -12, 50);
  const predictedError = config.targetC - state.chamberC - anticipationC;
  const feedControlled = config.fuel === 'pellets' && config.pelletControl === 'feed-and-air';
  const proportional = feedControlled ? .004 : .010;
  const integralGain = feedControlled ? .000004 : .000012;
  const desiredHeatW = (3 + .35 * config.windMps + state.airKgS * 1005) * (config.targetC - config.ambientC)
    + 32 * (config.targetC - state.wallC)
    + 3.2 * (config.meatMassKg / 3) ** (2 / 3) * (config.targetC - state.meatSurfaceC);
  const desiredFireC = config.targetC + desiredHeatW / 4.0;
  const desiredPowerW = desiredHeatW + (1.0 + .08 * config.windMps) * (desiredFireC - config.ambientC) + 100;
  state.demandPowerW = desiredPowerW;
  state.residualPelletPowerW = config.fuel === 'pellets' ? desiredPowerW : 0;
  state.controlReason = feedControlled ? 'Meter pellet heat and match combustion air' : 'Adjust both dampers from predicted pit temperature';
  const pelletWetEnergyJ = (1 - state.hopperMoisture) * A.dryWoodNetJPerKg - state.hopperMoisture * A.waterLatentJPerKg;
  const baseline = feedControlled ? clamp(desiredPowerW * 3600 / pelletWetEnergyJ / 2.5, .10, .8) : .42;
  const raw = baseline + proportional * predictedError + state.controllerIntegral;
  const minimumEffort = feedControlled ? .10 : .025;
  const effort = clamp(raw, minimumEffort, 1);
  // Heat-balance feed-forward accounts for the cold wall and changing weather.
  // Conditional integration prevents actuator saturation from accumulating debt.
  if (state.lidRecoveryS <= 0 && (raw === effort || (raw > 1 && predictedError < 0) || (raw < minimumEffort && predictedError > 0))) {
    state.controllerIntegral = clamp(state.controllerIntegral + integralGain * predictedError, -.6, .6);
  }
  state.controllerEffort += clamp(effort - state.controllerEffort, -.003, .003);
  if (feedControlled) {
    // Choose air to accompany the metered fuel, with oxygen headroom. A pellet
    // grill's primary temperature actuator is its auger, not a closed chimney.
    const feedKgH = state.controllerEffort * 2.5;
    const desiredAir = feedKgH / 3600 * (1 - state.hopperMoisture) * 6.25 * 1.8;
    state.exhaust = clamp(.72 + state.controllerEffort * .28, .72, 1);
    let low = .12, high = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      if (airFlow(state, mid, state.exhaust) < desiredAir) low = mid;
      else high = mid;
    }
    state.intake = (low + high) / 2;
  } else {
    state.intake = clamp(state.controllerEffort, .025, 1);
    state.exhaust = clamp(.65 + state.intake * .30 + state.smokeIndex * .15, .65, 1);
  }
}

function stepOneSecond(state: SmokerState): void {
  const config = state.config;
  control(state);
  const lidOpen = state.lidOpenRemainingS > 0;
  if (config.fuel === 'hybrid') {
    state.woodAirKgS = branchAirFlow(state, 'wood', state.woodIntake, state.exhaust);
    state.pelletAirKgS = branchAirFlow(state, 'pellets', state.pelletIntake, state.exhaust);
    state.airKgS = state.woodAirKgS + state.pelletAirKgS;
  } else state.airKgS = airFlow(state);
  let heatToFuelW = 0;
  if (config.fuel === 'hybrid') {
    heatToFuelW = burnHybrid(state);
  } else {
  let feedKg = 0;
  state.feedInhibited = config.fuel === 'pellets' && config.mode === 'auto' && state.timeS > 300 && state.fireC < 120;
  if (config.fuel === 'pellets') {
    const commanded = config.mode === 'auto' && config.pelletControl === 'feed-and-air'
      ? state.controllerEffort * 2.5 : config.pelletFeedKgH;
    feedKg = state.feedInhibited ? 0 : Math.min(state.hopperKg, commanded / 3600);
    const oldMass = state.woodDryKg + state.waterKg;
    if (feedKg > 0) state.fuelC = (state.fuelC * oldMass + config.ambientC * feedKg) / (oldMass + feedKg);
    state.hopperKg -= feedKg;
    state.woodDryKg += feedKg * (1 - state.hopperMoisture);
    state.waterKg += feedKg * state.hopperMoisture;
  }
  state.pelletFeedKgH = feedKg * 3600;

  const fuelHeatCapacity = Math.max(config.fuel === 'wood' ? 80 : 8, state.woodDryKg * 1700 + state.waterKg * 4180);
  const fuelConductance = config.fuel === 'wood' ? 3.5 : fuelHeatCapacity / 8;
  heatToFuelW = fuelConductance * (state.fireC - state.fuelC);
  const waterRemovalKg = state.fuelC >= 95
    ? Math.min(state.waterKg, Math.max(0, heatToFuelW) / A.waterLatentJPerKg, state.waterKg / (config.fuel === 'wood' ? 120 : 5)) : 0;
  state.dryingW = waterRemovalKg * A.waterLatentJPerKg;
  state.waterKg -= waterRemovalKg;
  state.fuelWaterEvaporatedKg += waterRemovalKg;
  state.fuelC += (heatToFuelW - state.dryingW) / fuelHeatCapacity;
  // Aggregate split cores can still be drying while hot surfaces devolatilize.
  // Smaller pellet particles heat / devolatilize much faster than hardwood splits.
  const thermalActivation = clamp((state.fuelC - 140) / 180, 0, 1.5);
  const moistureDrag = 1 / (1 + 8 * state.waterKg / Math.max(.02, state.woodDryKg));
  const pyrolysisKg = Math.min(state.woodDryKg,
    state.woodDryKg / (config.fuel === 'wood' ? 3500 : 65) * thermalActivation * moistureDrag);
  state.woodDryKg -= pyrolysisKg;
  state.charKg += pyrolysisKg * A.charYield;
  const volatileKg = pyrolysisKg * (1 - A.charYield);
  const charPotentialKg = Math.min(state.charKg, state.charKg / (config.fuel === 'wood' ? 600 : 90)
    * clamp((state.fireC - (config.fuel === 'wood' ? 80 : 180)) / (config.fuel === 'wood' ? 180 : 280), 0, 1.8));
  const oxygenKg = state.airKgS * A.airOxygenMassFraction;
  const oxygenDemandKg = volatileKg * A.volatileOxygenKgPerKg + charPotentialKg * A.charOxygenKgPerKg;
  state.oxygenDemandKgS = oxygenDemandKg;
  state.oxygenRatio = oxygenDemandKg > 1e-10 ? Math.min(8, oxygenKg / oxygenDemandKg) : 8;
  const oxygenFraction = volatileKg > 1e-12 ? clamp(oxygenKg / (volatileKg * A.volatileOxygenKgPerKg), 0, 1) : 1;
  const hotMixing = clamp((state.fireC - 120) / 120, 0, 1);
  const volatileBurnKg = volatileKg * oxygenFraction * hotMixing;
  const charBurnKg = Math.min(charPotentialKg, Math.max(0, oxygenKg - volatileBurnKg * A.volatileOxygenKgPerKg) / A.charOxygenKgPerKg);
  state.oxygenConsumedKgS = volatileBurnKg * A.volatileOxygenKgPerKg + charBurnKg * A.charOxygenKgPerKg;
  state.charKg -= charBurnKg;
  const escapedKg = volatileKg - volatileBurnKg;
  state.fuelBurnedKg += volatileBurnKg + charBurnKg;
  state.escapedVolatilesKg += escapedKg;
  state.volatilePowerW = volatileBurnKg * A.volatileNetJPerKg;
  state.charPowerW = charBurnKg * A.charNetJPerKg;
  state.powerW = state.volatilePowerW + state.charPowerW;
  state.releasedEnergyJ += state.powerW;
  state.smokeIndex = volatileKg > 1e-9 ? clamp(escapedKg / volatileKg, 0, 1) : 0;
  syncPureBed(state, heatToFuelW, volatileKg, charPotentialKg);
  }

  let fireLossW: number;
  if (config.fuel === 'hybrid') {
    const H = HYBRID_CONTROL_ASSUMPTIONS;
    state.woodHeatIntoChamberW = H.fireToPitWPerK * (state.woodFireC - state.chamberC);
    state.pelletHeatIntoChamberW = H.fireToPitWPerK * (state.pelletFireC - state.chamberC);
    state.heatIntoChamberW = state.woodHeatIntoChamberW + state.pelletHeatIntoChamberW;
    const lossConductance = H.fireLossWPerK + H.fireWindLossWPerKPerMps * config.windMps;
    const woodLossW = lossConductance * (state.woodFireC - config.ambientC);
    const pelletLossW = lossConductance * (state.pelletFireC - config.ambientC);
    fireLossW = woodLossW + pelletLossW;
    state.woodFireC += (state.woodPowerW - state.woodHeatIntoChamberW - state.woodBed.heatToFuelW - woodLossW) / H.fireHeatCapacityJPerK;
    state.pelletFireC += (state.pelletPowerW - state.pelletHeatIntoChamberW - state.pelletBed.heatToFuelW - pelletLossW) / H.fireHeatCapacityJPerK;
    state.fireC = (state.woodFireC + state.pelletFireC) / 2; // legacy display average only
  } else {
    state.heatIntoChamberW = 4.0 * (state.fireC - state.chamberC);
    fireLossW = (1.0 + .08 * config.windMps) * (state.fireC - config.ambientC);
    state.fireC += (state.powerW - state.heatIntoChamberW - heatToFuelW - fireLossW) / A.fireHeatCapacityJPerK;
    syncPureFireboxTelemetry(state);
  }
  const chamberToWallW = 32 * (state.chamberC - state.wallC);
  const wallLossW = (9 + .8 * config.windMps) * (state.wallC - config.ambientC);
  const directLossW = (3 + .35 * config.windMps + (lidOpen ? 95 : 0)) * (state.chamberC - config.ambientC);
  const exhaustLossW = state.airKgS * 1005 * (state.chamberC - config.ambientC);
  const meatAreaFactor = (config.meatMassKg / 3) ** (2 / 3);
  const chamberToMeatW = 3.2 * meatAreaFactor * (state.chamberC - state.meatSurfaceC);
  const surfaceToCoreW = .95 * meatAreaFactor * (state.meatSurfaceC - state.meatCoreC);
  // Temperature-driven evaporation consumes real latent energy. Exhaust drying
  // and depletion of a finite surface-water reservoir create an illustrative stall.
  const evaporationKg = Math.min(state.meatWaterKg, .000055 * meatAreaFactor
    * clamp((state.meatSurfaceC - 45) / 30, 0, 1.7)
    * Math.min(1, state.meatWaterKg / (config.meatMassKg * .06))
    * clamp(.65 + state.airKgS / .004, .65, 2));
  state.meatWaterKg -= evaporationKg;
  state.evaporationW = evaporationKg * A.waterLatentJPerKg;
  state.meatSurfaceC += (chamberToMeatW - surfaceToCoreW - state.evaporationW) / (config.meatMassKg * .20 * A.meatSpecificHeatJPerKgK);
  const coreHeatCapacity = config.meatMassKg * .80 * A.meatSpecificHeatJPerKgK;
  const heatToBoilingJ = Math.max(0, (100 - state.meatCoreC) * coreHeatCapacity);
  const coreEvaporationKg = Math.min(state.meatCoreWaterKg, Math.max(0, surfaceToCoreW - heatToBoilingJ) / A.waterLatentJPerKg);
  state.meatCoreWaterKg -= coreEvaporationKg;
  state.evaporationW += coreEvaporationKg * A.waterLatentJPerKg;
  state.meatCoreC += (surfaceToCoreW - coreEvaporationKg * A.waterLatentJPerKg) / coreHeatCapacity;
  const oldChamberC = state.chamberC;
  state.chamberC += (state.heatIntoChamberW - chamberToWallW - directLossW - exhaustLossW - chamberToMeatW) / A.chamberHeatCapacityJPerK;
  state.wallC += (chamberToWallW - wallLossW) / A.wallHeatCapacityJPerK;
  state.lossW = wallLossW + directLossW + exhaustLossW + fireLossW;
  state.temperatureRateCPerS += .025 * (state.chamberC - oldChamberC - state.temperatureRateCPerS);
  state.timeS += 1;
  state.lidOpenRemainingS = Math.max(0, state.lidOpenRemainingS - 1);
  if (!lidOpen) state.lidRecoveryS = Math.max(0, state.lidRecoveryS - 1);
  state.fuelRemainingKg = state.woodDryKg + state.charKg + state.waterKg + state.hopperKg;
  state.fuelConsumedKg = state.fuelBurnedKg + state.escapedVolatilesKg + state.fuelWaterEvaporatedKg;
  state.errorC = config.targetC - state.chamberC;
  syncFuelTelemetry(state);
  const minimumEffort = config.fuel === 'pellets' && config.pelletControl === 'feed-and-air' ? .10 : .025;
  state.setpointLimited = config.mode === 'auto' && (state.controllerEffort > .98 && state.errorC > 8
    || state.controllerEffort < minimumEffort + .005 && state.errorC < -8
    || config.fuel === 'pellets' && config.pelletControl === 'damper-only' && state.smokeIndex > .35
    || config.fuel === 'hybrid' && state.woodOverpower);
  if (state.fuelRemainingKg < .002) state.phase = 'Fuel depleted';
  else if (state.powerW < 100 && state.fireC < 160) state.phase = 'Fire cooling';
  else if (config.fuel === 'hybrid' && state.woodPowerW > 100 && state.pelletPowerW > 100) state.phase = 'Hybrid wood + pellets';
  else if ((config.fuel === 'pellets' || config.fuel === 'hybrid') && state.pelletPowerW > state.woodPowerW && state.hopperKg > 0) state.phase = 'Metered pellet burn';
  else if (state.dryingW > state.volatilePowerW && state.waterKg > .002) state.phase = 'Warming / drying';
  else if (state.volatilePowerW > state.charPowerW && state.woodDryKg > .005) state.phase = 'Volatile flame';
  else state.phase = 'Char / embers';
  state.status = lidOpen ? 'Lid open · controller holding'
    : state.phase === 'Fuel depleted' ? 'Fuel depleted · add fuel'
      : state.feedInhibited ? 'Fire cooled · pellet feed paused · reset to relight'
        : state.phase === 'Fire cooling' ? 'Fire cooling · insufficient heat'
        : state.cleanAirLimited ? 'Damper airflow at capacity · clean combustion unavailable'
        : state.woodOverpower ? 'Wood exceeds clean-air control authority · pellet command zero'
        : state.smokeIndex > .35 ? 'Oxygen-limited burn · smoky combustion'
          : state.setpointLimited ? 'Controller at limit · target unavailable'
            : Math.abs(state.errorC) <= 3 ? 'Holding the smoking temperature'
              : state.errorC > 0 ? 'Warming toward the target' : 'Coasting toward the target';
}

/** Advances deterministic 1 s physics ticks, retaining sub-second remainder. */
export function stepSimulation(state: SmokerState, seconds = 1): SmokerState {
  const duration = Math.max(0, finite(seconds, 0));
  const total = state.remainderS + duration;
  const ticks = Math.floor(total + 1e-9);
  state.remainderS = Math.max(0, total - ticks);
  for (let i = 0; i < ticks; i++) stepOneSecond(state);
  return state;
}

function makeBed(dryKg: number, waterKg: number, charKg: number, temperatureC: number): FuelBed {
  return { dryKg, waterKg, charKg, temperatureC, addedKg: dryKg + waterKg + charKg,
    burnedKg: 0, escapedVolatilesKg: 0, waterEvaporatedKg: 0, releasedEnergyJ: 0,
    volatilePowerW: 0, charPowerW: 0, dryingW: 0, heatToFuelW: 0,
    potentialVolatileKgS: 0, potentialCharKgS: 0 };
}

function refuelHybrid(state: SmokerState, kg: number, fuel: 'wood' | 'pellets'): void {
  if (fuel === 'pellets') {
    state.hopperMoisture = (state.hopperMoisture * state.hopperKg + state.config.pelletMoisture * kg) / (state.hopperKg + kg);
    state.hopperKg += kg;
    state.pelletBed.addedKg += kg;
  } else {
    const bed = state.woodBed;
    const oldCapacity = bed.dryKg * 1700 + bed.waterKg * 4180;
    const newDryKg = kg * (1 - state.config.woodMoisture);
    const newWaterKg = kg * state.config.woodMoisture;
    const addedCapacity = newDryKg * 1700 + newWaterKg * 4180;
    bed.temperatureC = (bed.temperatureC * oldCapacity + state.config.ambientC * addedCapacity) / (oldCapacity + addedCapacity);
    bed.dryKg += newDryKg;
    bed.waterKg += newWaterKg;
    bed.addedKg += kg;
  }
  syncFuelTelemetry(state);
}

function syncPureBed(state: SmokerState, heatToFuelW: number, volatileKg: number, charKg: number): void {
  const bed = state.config.fuel === 'wood' ? state.woodBed : state.pelletBed;
  bed.dryKg = state.woodDryKg;
  bed.charKg = state.charKg;
  bed.waterKg = state.waterKg;
  bed.temperatureC = state.fuelC;
  bed.addedKg = state.fuelAddedKg;
  bed.burnedKg = state.fuelBurnedKg;
  bed.escapedVolatilesKg = state.escapedVolatilesKg;
  bed.waterEvaporatedKg = state.fuelWaterEvaporatedKg;
  bed.releasedEnergyJ = state.releasedEnergyJ;
  bed.volatilePowerW = state.volatilePowerW;
  bed.charPowerW = state.charPowerW;
  bed.dryingW = state.dryingW;
  bed.heatToFuelW = heatToFuelW;
  bed.potentialVolatileKgS = volatileKg;
  bed.potentialCharKgS = charKg;
}

function syncPureFireboxTelemetry(state: SmokerState): void {
  const wood = state.config.fuel === 'wood';
  state.woodFireC = wood ? state.fireC : state.config.ambientC;
  state.pelletFireC = wood ? state.config.ambientC : state.fireC;
  state.woodIntake = state.intake;
  state.pelletIntake = state.intake;
  state.woodAirKgS = wood ? state.airKgS : 0;
  state.pelletAirKgS = wood ? 0 : state.airKgS;
  state.woodHeatIntoChamberW = wood ? state.heatIntoChamberW : 0;
  state.pelletHeatIntoChamberW = wood ? 0 : state.heatIntoChamberW;
  state.woodSmokeIndex = wood ? state.smokeIndex : 0;
  state.pelletSmokeIndex = wood ? 0 : state.smokeIndex;
  state.woodOxygenDemandKgS = wood ? state.oxygenDemandKgS : 0;
  state.pelletOxygenDemandKgS = wood ? 0 : state.oxygenDemandKgS;
  state.woodOxygenConsumedKgS = wood ? state.oxygenConsumedKgS : 0;
  state.pelletOxygenConsumedKgS = wood ? 0 : state.oxygenConsumedKgS;
  state.woodOxygenRatio = wood ? state.oxygenRatio : 8;
  state.pelletOxygenRatio = wood ? 8 : state.oxygenRatio;
}

function syncFuelTelemetry(state: SmokerState): void {
  const w = state.woodBed, p = state.pelletBed;
  state.woodPowerW = w.volatilePowerW + w.charPowerW;
  state.pelletPowerW = p.volatilePowerW + p.charPowerW;
  state.woodVolatilePowerW = w.volatilePowerW;
  state.woodCharPowerW = w.charPowerW;
  state.pelletVolatilePowerW = p.volatilePowerW;
  state.pelletCharPowerW = p.charPowerW;
  state.woodFuelC = w.temperatureC;
  state.pelletFuelC = p.temperatureC;
  state.woodDryingW = w.dryingW;
  state.pelletDryingW = p.dryingW;
  state.woodPhase = w.dryKg + w.charKg + w.waterKg < .002 ? 'Fuel depleted'
    : state.woodPowerW < 100 && state.woodFireC < 160 ? 'Fire cooling'
      : w.dryingW > w.volatilePowerW && w.waterKg > .002 ? 'Warming / drying'
        : w.volatilePowerW > w.charPowerW && w.dryKg > .005 ? 'Volatile flame' : 'Char / embers';
  state.pelletPhase = p.dryKg + p.charKg + p.waterKg + state.hopperKg < .002 ? 'Fuel depleted'
    : state.pelletPowerW < 100 && (state.pelletFireC < 160
      || state.config.fuel === 'hybrid' && state.pelletFeedKgH < .001) ? 'Fire cooling'
      : state.hopperKg > 0 ? 'Metered pellet burn' : 'Char / embers';
  state.woodFuelRemainingKg = w.dryKg + w.charKg + w.waterKg;
  state.pelletFuelRemainingKg = p.dryKg + p.charKg + p.waterKg + state.hopperKg;
  if (state.config.fuel === 'hybrid') {
    state.woodDryKg = w.dryKg + p.dryKg; // retained legacy aggregate name
    state.charKg = w.charKg + p.charKg;
    state.waterKg = w.waterKg + p.waterKg;
    state.fuelRemainingKg = state.woodFuelRemainingKg + state.pelletFuelRemainingKg;
    state.fuelAddedKg = w.addedKg + p.addedKg;
    state.fuelBurnedKg = w.burnedKg + p.burnedKg;
    state.escapedVolatilesKg = w.escapedVolatilesKg + p.escapedVolatilesKg;
    state.fuelWaterEvaporatedKg = w.waterEvaporatedKg + p.waterEvaporatedKg;
    state.fuelConsumedKg = state.fuelBurnedKg + state.escapedVolatilesKg + state.fuelWaterEvaporatedKg;
    state.releasedEnergyJ = w.releasedEnergyJ + p.releasedEnergyJ;
    state.powerW = state.woodPowerW + state.pelletPowerW;
    state.volatilePowerW = w.volatilePowerW + p.volatilePowerW;
    state.charPowerW = w.charPowerW + p.charPowerW;
    state.dryingW = w.dryingW + p.dryingW;
    const mass = w.dryKg + w.waterKg + p.dryKg + p.waterKg;
    state.fuelC = mass > 1e-12 ? ((w.dryKg + w.waterKg) * w.temperatureC + (p.dryKg + p.waterKg) * p.temperatureC) / mass : state.fireC;
  }
}

function intakeForAir(state: SmokerState, kind: 'wood' | 'pellets', desiredAirKgS: number, exhaust: number): number {
  let low: number = HYBRID_CONTROL_ASSUMPTIONS.minimumIntake, high = 1;
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    if (branchAirFlow(state, kind, mid, exhaust) < desiredAirKgS) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function minimumCleanAir(state: SmokerState, kind: 'wood' | 'pellets'): number {
  const bed = kind === 'wood' ? state.woodBed : state.pelletBed;
  const gasOxygenKgS = bed.potentialVolatileKgS * A.volatileOxygenKgPerKg;
  return Math.max(branchAirFlow(state, kind, HYBRID_CONTROL_ASSUMPTIONS.minimumIntake, HYBRID_CONTROL_ASSUMPTIONS.minimumExhaust),
    gasOxygenKgS * HYBRID_CONTROL_ASSUMPTIONS.cleanGasExcessAirRatio / A.airOxygenMassFraction);
}

function woodPowerAtAir(state: SmokerState, desiredAirKgS: number, exhaust: number): number {
  const bed = state.woodBed;
  const oxygen = Math.min(desiredAirKgS, branchAirFlow(state, 'wood', 1, exhaust)) * A.airOxygenMassFraction;
  const gasBurn = Math.min(bed.potentialVolatileKgS, oxygen / A.volatileOxygenKgPerKg)
    * clamp((state.woodFireC - 120) / 120, 0, 1);
  const charBurn = Math.min(bed.potentialCharKgS,
    Math.max(0, oxygen - gasBurn * A.volatileOxygenKgPerKg) / A.charOxygenKgPerKg);
  return gasBurn * A.volatileNetJPerKg + charBurn * A.charNetJPerKg;
}

function controlHybrid(state: SmokerState): void {
  const config = state.config, H = HYBRID_CONTROL_ASSUMPTIONS;
  // This is an ideal simulated observer. Device software cannot read wood heat
  // directly; identifying that heat from real temperature/O2 sensors is separate.
  const previousEstimate = state.estimatedWoodPowerW;
  state.estimatedWoodPowerW += (state.woodPowerW - state.estimatedWoodPowerW) / H.observerTimeS;
  state.estimatedWoodRateWPerS += .025 * (state.estimatedWoodPowerW - previousEstimate - state.estimatedWoodRateWPerS);
  state.predictedWoodPowerW = clamp(state.estimatedWoodPowerW + H.woodForecastS * state.estimatedWoodRateWPerS,
    0, state.estimatedWoodPowerW * 2 + 200);
  if (config.mode === 'manual') {
    state.woodIntake = config.woodIntake;
    state.pelletIntake = config.pelletIntake;
    state.intake = (state.woodIntake + state.pelletIntake) / 2;
    state.exhaust = config.exhaust;
    state.pelletFeedTargetKgH = config.pelletFeedKgH;
    state.woodOverpower = false;
    state.cleanAirLimited = false;
    state.demandPowerW = 0;
    state.residualPelletPowerW = 0;
    state.pelletPilotActive = false;
    state.pelletPilotPowerW = 0;
    state.unavoidableWoodPowerW = 0;
    state.controlReason = 'Manual independent firebox intakes, common exhaust and fixed pellet feed';
    return;
  }
  if (state.lidOpenRemainingS > 0) { state.controlReason = 'Lid open: hold dampers and feed, freeze integral'; return; }
  // A wood fire cannot certify ignition in the separate pellet firebox. Once
  // automatic feeding is inhibited, passive heating through the pit cannot
  // clear that state; reset explicitly establishes a new pellet ember bed.
  state.pelletRelightRequired = state.pelletRelightRequired || state.timeS > 300 && state.pelletFireC < 120;
  state.feedInhibited = state.pelletRelightRequired;
  const anticipatedC = clamp(state.temperatureRateCPerS * H.pitForecastS, -12, 50);
  const error = config.targetC - state.chamberC - anticipatedC;
  const desiredHeatW = (3 + .35 * config.windMps + state.airKgS * 1005) * (config.targetC - config.ambientC)
    + 32 * (config.targetC - state.wallC)
    + 3.2 * (config.meatMassKg / 3) ** (2 / 3) * (config.targetC - state.meatSurfaceC);
  const desiredFireC = config.targetC + desiredHeatW / 4;
  const feedForwardW = desiredHeatW + (1 + .08 * config.windMps) * (desiredFireC - config.ambientC)
    + Math.max(0, state.woodBed.heatToFuelW) + 100;
  // Positive correction removes heat demand when the dedicated hot fireboxes
  // contain the energy needed during the next control horizon. It also handles
  // the delay between stopping the auger and burning pellets already in the pot.
  const storedFireCorrectionW = clamp(H.fireHeatCapacityJPerK
    * (state.woodFireC + state.pelletFireC - 2 * desiredFireC) / H.fireStoredEnergyHorizonS, -1000, 2500);
  state.demandPowerW = Math.max(0, feedForwardW + H.proportionalWPerK * error + state.hybridIntegralW - storedFireCorrectionW);
  const wetEnergyJPerKg = (1 - state.hopperMoisture) * A.dryWoodNetJPerKg - state.hopperMoisture * A.waterLatentJPerKg;
  const maximumPelletPowerW = wetEnergyJPerKg * H.maximumFeedKgH / 3600;
  const rawResidualW = state.demandPowerW - state.predictedWoodPowerW;
  state.residualPelletPowerW = state.feedInhibited ? 0 : clamp(rawResidualW, 0, maximumPelletPowerW);
  const feedControlled = config.pelletControl === 'feed-and-air';
  // A dedicated pellet pot needs its own live ember bed while supplementing a
  // normal wood batch. This explicit low feed keeps it warm; it never reignites
  // a cold pot and is removed when the wood alone exceeds the base heat balance.
  const woodFloorAir = minimumCleanAir(state, 'wood');
  const minimumWoodPowerW = woodPowerAtAir(state, woodFloorAir, H.minimumExhaust);
  const pilotAllowed = feedControlled && !state.feedInhibited && state.hopperKg > 0
    && state.predictedWoodPowerW <= feedForwardW + 150 && minimumWoodPowerW <= feedForwardW + 150;
  state.pelletPilotPowerW = pilotAllowed ? wetEnergyJPerKg * H.minimumWarmFeedKgH / 3600 : 0;
  state.pelletPilotActive = state.pelletPilotPowerW > state.residualPelletPowerW;
  state.residualPelletPowerW = Math.max(state.residualPelletPowerW, state.pelletPilotPowerW);
  state.pelletFeedTargetKgH = state.residualPelletPowerW * 3600 / wetEnergyJPerKg;
  const previousIntegralW = state.hybridIntegralW;
  if (feedControlled) {
    if (state.lidRecoveryS <= 0 && (state.hopperKg > 0 && !state.feedInhibited || error < 0)
      && (rawResidualW >= state.pelletPilotPowerW && rawResidualW <= maximumPelletPowerW
      || rawResidualW < state.pelletPilotPowerW && error > 0 || rawResidualW > maximumPelletPowerW && error < 0)) {
      state.hybridIntegralW = clamp(state.hybridIntegralW + H.integralWPerKS * error, -2500, 2500);
    }
    const targetEffort = state.pelletFeedTargetKgH / H.maximumFeedKgH;
    state.controllerEffort += clamp(targetEffort - state.controllerEffort, -.01, H.effortSlewPerS);
    state.controllerIntegral = state.hybridIntegralW / maximumPelletPowerW;
  } else state.pelletFeedTargetKgH = state.feedInhibited ? 0 : config.pelletFeedKgH;

  // Each clean-air request serves only its own dedicated firebox. Closing one
  // intake never redirects that box's oxygen budget to the other fuel source.
  const pelletFloorAir = minimumCleanAir(state, 'pellets');
  const expectedFeed = (state.hopperKg > 0 ? state.pelletFeedTargetKgH : 0) / 3600 * (1 - state.hopperMoisture);
  const expectedFeedOxygen = expectedFeed * ((1 - A.charYield) * A.volatileOxygenKgPerKg + A.charYield * A.charOxygenKgPerKg);
  const woodCharOxygen = state.woodCharPowerW / A.charNetJPerKg * A.charOxygenKgPerKg;
  const pelletCharOxygen = state.pelletCharPowerW / A.charNetJPerKg * A.charOxygenKgPerKg;
  const woodDesiredAir = Math.max(woodFloorAir,
    (state.woodBed.potentialVolatileKgS * A.volatileOxygenKgPerKg + woodCharOxygen)
    * H.feedExcessAirRatio / A.airOxygenMassFraction);
  const pelletDesiredAir = Math.max(pelletFloorAir,
    (Math.max(expectedFeedOxygen, state.pelletBed.potentialVolatileKgS * A.volatileOxygenKgPerKg) + pelletCharOxygen)
    * H.feedExcessAirRatio / A.airOxygenMassFraction);
  state.exhaust = clamp(H.minimumExhaust + (woodDesiredAir + pelletDesiredAir) / .006 * .28, H.minimumExhaust, 1);
  const woodAirLimited = woodDesiredAir > branchAirFlow(state, 'wood', 1, state.exhaust) + 1e-9;
  const pelletAirLimited = pelletDesiredAir > branchAirFlow(state, 'pellets', 1, state.exhaust) + 1e-9;
  state.cleanAirLimited = woodAirLimited || pelletAirLimited;
  if (state.cleanAirLimited && error > 0) {
    state.hybridIntegralW = previousIntegralW;
    state.controllerIntegral = state.hybridIntegralW / maximumPelletPowerW;
  }
  if (!feedControlled) {
    const effort = clamp(.42 + .010 * error + state.controllerIntegral, H.minimumIntake, 1);
    state.controllerEffort += clamp(effort - state.controllerEffort, -.003, .003);
    state.woodIntake = Math.max(state.controllerEffort, intakeForAir(state, 'wood', woodFloorAir, state.exhaust));
    state.pelletIntake = Math.max(state.controllerEffort, intakeForAir(state, 'pellets', pelletFloorAir, state.exhaust));
  } else {
    state.woodIntake = intakeForAir(state, 'wood', woodDesiredAir, state.exhaust);
    state.pelletIntake = intakeForAir(state, 'pellets', pelletDesiredAir, state.exhaust);
  }
  state.intake = (state.woodIntake + state.pelletIntake) / 2;
  // Lower-bound chemical wood output at the minimum clean draft, keeping the
  // current hot fuel state fixed for one tick. This is a constraint diagnostic,
  // not a claim that every positive wood release exceeds control authority.
  state.unavoidableWoodPowerW = woodPowerAtAir(state, woodFloorAir, state.exhaust);
  state.woodOverpower = feedControlled && state.pelletFeedTargetKgH < 1e-8
    && state.unavoidableWoodPowerW > state.demandPowerW + 150;
  state.controlReason = state.feedInhibited ? 'Cold pellet firebox: feed inhibited; reset to establish a new pellet fire'
    : state.cleanAirLimited ? `${woodAirLimited && pelletAirLimited ? 'Both fireboxes exceed their' : woodAirLimited ? 'Wood firebox exceeds its' : 'Pellet firebox exceeds its'} intake capacity; clean burning is not guaranteed`
    : state.woodOverpower ? 'Wood heat exceeds the minimum clean-draft demand; pellet command is zero'
    : state.pelletPilotActive ? 'Wood carries the heat demand; low pellet feed keeps its separate firebox lit'
    : state.pelletFeedTargetKgH < .001 ? 'Wood supplies the heat demand; pellet command is zero'
      : state.hopperKg <= 0 ? 'Pellet hopper empty; available wood heat carries the fire'
        : feedControlled ? 'Subtract observed wood heat, meter residual pellet heat, preserve each firebox draft'
          : 'Fixed pellet feed; dampers cannot cancel fuel already committed to the fire';
}

function prepareHybridBed(state: SmokerState, bed: FuelBed, kind: 'wood' | 'pellets'): void {
  const wood = kind === 'wood';
  const fireC = wood ? state.woodFireC : state.pelletFireC;
  const activeMass = bed.dryKg + bed.waterKg;
  const capacity = Math.max(wood ? 80 : 8, bed.dryKg * 1700 + bed.waterKg * 4180);
  const conductance = activeMass > 1e-9 ? (wood ? 3.5 * Math.min(1.5, (activeMass / .8) ** (2 / 3)) : capacity / 8) : 0;
  bed.heatToFuelW = conductance * (fireC - bed.temperatureC);
  const evaporatedKg = bed.temperatureC >= 95
    ? Math.min(bed.waterKg, Math.max(0, bed.heatToFuelW) / A.waterLatentJPerKg, bed.waterKg / (wood ? 120 : 5)) : 0;
  bed.dryingW = evaporatedKg * A.waterLatentJPerKg;
  bed.waterKg -= evaporatedKg;
  bed.waterEvaporatedKg += evaporatedKg;
  bed.temperatureC += (bed.heatToFuelW - bed.dryingW) / capacity;
  const activation = clamp((bed.temperatureC - 140) / 180, 0, 1.5);
  const moistureDrag = 1 / (1 + 8 * bed.waterKg / Math.max(.02, bed.dryKg));
  const pyrolyzedKg = Math.min(bed.dryKg, bed.dryKg / (wood ? 3500 : 65) * activation * moistureDrag);
  bed.dryKg -= pyrolyzedKg;
  bed.charKg += pyrolyzedKg * A.charYield;
  bed.potentialVolatileKgS = pyrolyzedKg * (1 - A.charYield);
  bed.potentialCharKgS = Math.min(bed.charKg, bed.charKg / (wood ? 600 : 90)
    * clamp((fireC - (wood ? 80 : 180)) / (wood ? 180 : 280), 0, 1.8));
}

function burnHybrid(state: SmokerState): number {
  const config = state.config, pellet = state.pelletBed, wood = state.woodBed;
  if (config.mode === 'auto' && state.timeS > 300 && state.pelletFireC < 120) state.pelletRelightRequired = true;
  state.feedInhibited = config.mode === 'auto' && state.pelletRelightRequired;
  const commandedKgH = config.mode === 'auto' && config.pelletControl === 'feed-and-air'
    ? state.controllerEffort * HYBRID_CONTROL_ASSUMPTIONS.maximumFeedKgH : config.pelletFeedKgH;
  const feedKg = state.feedInhibited ? 0 : Math.min(state.hopperKg, commandedKgH / 3600);
  if (feedKg > 0) {
    const oldCapacity = pellet.dryKg * 1700 + pellet.waterKg * 4180;
    const addedDryKg = feedKg * (1 - state.hopperMoisture), addedWaterKg = feedKg * state.hopperMoisture;
    const addedCapacity = addedDryKg * 1700 + addedWaterKg * 4180;
    pellet.temperatureC = (pellet.temperatureC * oldCapacity + config.ambientC * addedCapacity) / (oldCapacity + addedCapacity);
    pellet.dryKg += addedDryKg;
    pellet.waterKg += addedWaterKg;
    state.hopperKg -= feedKg;
  }
  state.pelletFeedKgH = feedKg * 3600;
  prepareHybridBed(state, wood, 'wood');
  prepareHybridBed(state, pellet, 'pellets');
  const woodBurn = burnDedicatedBed(wood, state.woodFireC, state.woodAirKgS);
  const pelletBurn = burnDedicatedBed(pellet, state.pelletFireC, state.pelletAirKgS);
  state.woodOxygenDemandKgS = woodBurn.demandKgS;
  state.pelletOxygenDemandKgS = pelletBurn.demandKgS;
  state.woodOxygenConsumedKgS = woodBurn.consumedKgS;
  state.pelletOxygenConsumedKgS = pelletBurn.consumedKgS;
  state.woodOxygenRatio = woodBurn.oxygenRatio;
  state.pelletOxygenRatio = pelletBurn.oxygenRatio;
  state.woodSmokeIndex = woodBurn.smokeIndex;
  state.pelletSmokeIndex = pelletBurn.smokeIndex;
  state.oxygenDemandKgS = woodBurn.demandKgS + pelletBurn.demandKgS;
  state.oxygenConsumedKgS = woodBurn.consumedKgS + pelletBurn.consumedKgS;
  state.oxygenRatio = state.oxygenDemandKgS > 1e-10
    ? Math.min(8, state.airKgS * A.airOxygenMassFraction / state.oxygenDemandKgS) : 8;
  const volatilePotential = wood.potentialVolatileKgS + pellet.potentialVolatileKgS;
  state.smokeIndex = volatilePotential > 1e-9 ? (wood.potentialVolatileKgS * state.woodSmokeIndex
    + pellet.potentialVolatileKgS * state.pelletSmokeIndex) / volatilePotential : 0;
  state.committedPelletPowerW = pellet.potentialVolatileKgS * A.volatileNetJPerKg + pellet.potentialCharKgS * A.charNetJPerKg;
  syncFuelTelemetry(state);
  return wood.heatToFuelW + pellet.heatToFuelW;
}

function burnDedicatedBed(bed: FuelBed, fireC: number, airKgS: number) {
  const oxygenAvailable = airKgS * A.airOxygenMassFraction;
  const demandKgS = bed.potentialVolatileKgS * A.volatileOxygenKgPerKg + bed.potentialCharKgS * A.charOxygenKgPerKg;
  const mixing = clamp((fireC - 120) / 120, 0, 1);
  const gasBurn = Math.min(bed.potentialVolatileKgS, oxygenAvailable / A.volatileOxygenKgPerKg) * mixing;
  const oxygenAfterGas = Math.max(0, oxygenAvailable - gasBurn * A.volatileOxygenKgPerKg);
  const charBurn = Math.min(bed.potentialCharKgS, oxygenAfterGas / A.charOxygenKgPerKg);
  const consumedKgS = gasBurn * A.volatileOxygenKgPerKg + charBurn * A.charOxygenKgPerKg;
  bed.charKg = Math.max(0, bed.charKg - charBurn);
  bed.burnedKg += gasBurn + charBurn;
  bed.escapedVolatilesKg += bed.potentialVolatileKgS - gasBurn;
  bed.volatilePowerW = gasBurn * A.volatileNetJPerKg;
  bed.charPowerW = charBurn * A.charNetJPerKg;
  bed.releasedEnergyJ += bed.volatilePowerW + bed.charPowerW;
  return { demandKgS, consumedKgS,
    oxygenRatio: demandKgS > 1e-10 ? Math.min(8, oxygenAvailable / demandKgS) : 8,
    smokeIndex: bed.potentialVolatileKgS > 1e-9 ? clamp(1 - gasBurn / bed.potentialVolatileKgS, 0, 1) : 0 };
}
