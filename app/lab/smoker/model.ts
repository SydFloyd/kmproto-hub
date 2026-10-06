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
export type FuelKind = 'wood' | 'pellets';
export type ControlMode = 'auto' | 'manual';
export type PelletControl = 'feed-and-air' | 'damper-only';
export type BurnPhase = 'Warming / drying' | 'Volatile flame' | 'Char / embers' | 'Metered pellet burn' | 'Fuel depleted' | 'Fire cooling';

export interface SmokerConfig {
  fuel: FuelKind;
  mode: ControlMode;
  pelletControl: PelletControl;
  targetC: number;
  ambientC: number;
  windMps: number;
  woodMoisture: number; // water / wet fuel mass, for either selected fuel
  meatMassKg: number;
  initialFuelKg: number; // hardwood charge or pellet hopper, excludes starter
  pelletFeedKgH: number; // manual / damper-only commanded feed
  intake: number; // commanded fractions 0..1
  exhaust: number;
}

export const DEFAULT_CONFIG: SmokerConfig = {
  fuel: 'wood', mode: 'auto', pelletControl: 'feed-and-air', targetC: (250 - 32) * 5 / 9,
  ambientC: 20, windMps: 0, woodMoisture: 0.20, meatMassKg: 3,
  initialFuelKg: 1, pelletFeedKgH: 0.7, intake: 0.45, exhaust: 0.85,
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

export interface SmokerState {
  config: SmokerConfig;
  timeS: number;
  chamberC: number;
  wallC: number;
  fireC: number;
  fuelC: number;
  meatSurfaceC: number;
  meatCoreC: number;
  meatWaterKg: number;
  meatCoreWaterKg: number;
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
  const fuel = options.fuel === 'pellets' ? 'pellets' : 'wood';
  const config: SmokerConfig = { ...DEFAULT_CONFIG, ...options, fuel };
  if (options.woodMoisture === undefined) config.woodMoisture = fuel === 'wood' ? .20 : .08;
  if (options.initialFuelKg === undefined) config.initialFuelKg = fuel === 'wood' ? 1 : 3;
  config.targetC = clamp(finite(config.targetC, DEFAULT_CONFIG.targetC), 65, 175);
  config.ambientC = clamp(finite(config.ambientC, 20), -20, 45);
  config.windMps = clamp(finite(config.windMps, 0), 0, 15);
  config.woodMoisture = clamp(finite(config.woodMoisture, .20), 0, .55);
  config.meatMassKg = clamp(finite(config.meatMassKg, 3), .5, 8);
  config.initialFuelKg = clamp(finite(config.initialFuelKg, 1), 0, 10);
  config.pelletFeedKgH = clamp(finite(config.pelletFeedKgH, .7), 0, 2.5);
  config.intake = clamp(finite(config.intake, .45), 0, 1);
  config.exhaust = clamp(finite(config.exhaust, .85), 0, 1);
  return config;
}

export function createSimulation(options: Partial<SmokerConfig> = {}): SmokerState {
  const config = normalizeConfig(options);
  const woodDryKg = config.fuel === 'wood' ? config.initialFuelKg * (1 - config.woodMoisture) : .025;
  const waterKg = config.fuel === 'wood' ? config.initialFuelKg * config.woodMoisture : .025 * config.woodMoisture / (1 - config.woodMoisture);
  const charKg = config.fuel === 'wood' ? .18 : .025;
  const hopperKg = config.fuel === 'pellets' ? config.initialFuelKg : 0;
  const fuelAddedKg = woodDryKg + waterKg + charKg + hopperKg;
  return {
    config, timeS: 0, chamberC: config.ambientC, wallC: config.ambientC,
    fireC: 480, fuelC: config.fuel === 'wood' ? config.ambientC : 160,
    meatSurfaceC: 5, meatCoreC: 5, meatWaterKg: config.meatMassKg * .20, meatCoreWaterKg: config.meatMassKg * .45, feedInhibited: false,
    intake: config.intake, exhaust: config.exhaust, pelletFeedKgH: 0,
    powerW: 0, volatilePowerW: 0, charPowerW: 0, dryingW: 0, evaporationW: 0,
    heatIntoChamberW: 0, lossW: 0, airKgS: 0, oxygenRatio: 1, smokeIndex: 0,
    fuelRemainingKg: fuelAddedKg, woodDryKg, charKg, waterKg, hopperKg, hopperMoisture: config.woodMoisture,
    fuelAddedKg, fuelConsumedKg: 0, fuelBurnedKg: 0, escapedVolatilesKg: 0,
    fuelWaterEvaporatedKg: 0, releasedEnergyJ: 0,
    phase: config.fuel === 'wood' ? 'Warming / drying' : 'Metered pellet burn',
    errorC: config.targetC - config.ambientC, status: 'Warming the pit',
    lidOpenRemainingS: 0, lidRecoveryS: 0, controllerIntegral: 0,
    controllerEffort: .45, temperatureRateCPerS: 0, setpointLimited: false, remainderS: 0,
  };
}

/** Live settings. Change fuel / meat mass with createSimulation for a fresh run. */
export function setControls(state: SmokerState, controls: Partial<Omit<SmokerConfig, 'fuel' | 'initialFuelKg' | 'meatMassKg'>>): void {
  const priorMode = state.config.mode;
  const priorPelletControl = state.config.pelletControl;
  state.config = normalizeConfig({ ...state.config, ...controls });
  if (priorMode !== state.config.mode || priorPelletControl !== state.config.pelletControl) {
    state.controllerIntegral = 0;
    state.controllerEffort = state.intake;
  }
  if (state.config.mode === 'manual') {
    state.intake = state.config.intake;
    state.exhaust = state.config.exhaust;
  }
}

/** Wet hardwood mass or hopper pellet mass; new wood is mixed into the fuel node. */
export function refuel(state: SmokerState, kg = state.config.fuel === 'wood' ? .75 : 1): void {
  kg = clamp(finite(kg, 0), 0, 10);
  if (!kg) return;
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

function control(state: SmokerState): void {
  const config = state.config;
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
  state.airKgS = airFlow(state);
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
  const heatToFuelW = fuelConductance * (state.fireC - state.fuelC);
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
  state.oxygenRatio = oxygenDemandKg > 1e-10 ? Math.min(8, oxygenKg / oxygenDemandKg) : 8;
  const oxygenFraction = volatileKg > 1e-12 ? clamp(oxygenKg / (volatileKg * A.volatileOxygenKgPerKg), 0, 1) : 1;
  const hotMixing = clamp((state.fireC - 120) / 120, 0, 1);
  const volatileBurnKg = volatileKg * oxygenFraction * hotMixing;
  const charBurnKg = Math.min(charPotentialKg, Math.max(0, oxygenKg - volatileBurnKg * A.volatileOxygenKgPerKg) / A.charOxygenKgPerKg);
  state.charKg -= charBurnKg;
  const escapedKg = volatileKg - volatileBurnKg;
  state.fuelBurnedKg += volatileBurnKg + charBurnKg;
  state.escapedVolatilesKg += escapedKg;
  state.volatilePowerW = volatileBurnKg * A.volatileNetJPerKg;
  state.charPowerW = charBurnKg * A.charNetJPerKg;
  state.powerW = state.volatilePowerW + state.charPowerW;
  state.releasedEnergyJ += state.powerW;
  state.smokeIndex = volatileKg > 1e-9 ? clamp(escapedKg / volatileKg, 0, 1) : 0;

  state.heatIntoChamberW = 4.0 * (state.fireC - state.chamberC);
  const fireLossW = (1.0 + .08 * config.windMps) * (state.fireC - config.ambientC);
  state.fireC += (state.powerW - state.heatIntoChamberW - heatToFuelW - fireLossW) / A.fireHeatCapacityJPerK;
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
  const minimumEffort = config.fuel === 'pellets' && config.pelletControl === 'feed-and-air' ? .10 : .025;
  state.setpointLimited = config.mode === 'auto' && (state.controllerEffort > .98 && state.errorC > 8
    || state.controllerEffort < minimumEffort + .005 && state.errorC < -8
    || config.fuel === 'pellets' && config.pelletControl === 'damper-only' && state.smokeIndex > .35);
  if (state.fuelRemainingKg < .002) state.phase = 'Fuel depleted';
  else if (state.powerW < 100 && state.fireC < 160) state.phase = 'Fire cooling';
  else if (config.fuel === 'pellets' && state.hopperKg > 0) state.phase = 'Metered pellet burn';
  else if (state.dryingW > state.volatilePowerW && state.waterKg > .002) state.phase = 'Warming / drying';
  else if (state.volatilePowerW > state.charPowerW && state.woodDryKg > .005) state.phase = 'Volatile flame';
  else state.phase = 'Char / embers';
  state.status = lidOpen ? 'Lid open · controller holding'
    : state.phase === 'Fuel depleted' ? 'Fuel depleted · add fuel'
      : state.feedInhibited ? 'Fire cooled · pellet feed paused · reset to relight'
        : state.phase === 'Fire cooling' ? 'Fire cooling · insufficient heat'
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
