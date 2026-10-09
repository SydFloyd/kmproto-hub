import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MODEL_ASSUMPTIONS as A,
  HYBRID_CONTROL_ASSUMPTIONS as H,
  createSimulation, stepSimulation, setControls, refuel, openLid, cToF, fToC,
} from '../app/lab/smoker/model.ts';

const close = (actual, expected, tolerance, label = '') =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} versus ${expected}`);
const reservoirs = ['woodDryKg', 'charKg', 'waterKg', 'hopperKg', 'meatWaterKg', 'meatCoreWaterKg'];
const assertFinite = state => {
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key} is finite`);
  }
  for (const key of reservoirs) assert.ok(state[key] >= -1e-12, `${key} cannot be negative`);
};

// These ledgers independently verify that pyrolysis partitions, rather than
// creates, fuel mass and chemical energy. Thermal-node energy is approximate.
function remainingChemicalEnergy(state) {
  return state.woodDryKg * A.dryWoodNetJPerKg + state.charKg * A.charNetJPerKg
    + state.hopperKg * (1 - state.hopperMoisture) * A.dryWoodNetJPerKg;
}

test('SI conversion and fixed one-second ticks are independent of render batching', () => {
  close(fToC(212), 100, 1e-12);
  close(cToF(0), 32, 1e-12);
  const small = createSimulation({ fuel: 'pellets' });
  const batch = createSimulation({ fuel: 'pellets' });
  for (let i = 0; i < 3_600; i++) stepSimulation(small);
  for (let i = 0; i < 4; i++) stepSimulation(batch, 900);
  assert.deepEqual(batch, small);
  const partial = createSimulation();
  stepSimulation(partial, .5); assert.equal(partial.timeS, 0);
  stepSimulation(partial, .5); assert.equal(partial.timeS, 1);
  stepSimulation(partial, NaN); assert.equal(partial.timeS, 1);
});

test('wood and pellets conserve fuel mass and chemical energy through refueling and disturbances', () => {
  for (const fuel of ['wood', 'pellets']) for (const mode of ['auto', 'manual']) {
    const state = createSimulation({ fuel, mode });
    let suppliedChemicalJ = remainingChemicalEnergy(state);
    for (let i = 0; i < 48; i++) {
      if (i === 12) {
        refuel(state, .5);
        suppliedChemicalJ += .5 * (1 - state.config.woodMoisture) * A.dryWoodNetJPerKg;
        openLid(state, 45);
      }
      stepSimulation(state, 300);
      assertFinite(state);
      close(state.fuelRemainingKg + state.fuelConsumedKg, state.fuelAddedKg, 1e-9, `${fuel} mass ledger`);
      close(remainingChemicalEnergy(state) + state.releasedEnergyJ
        + state.escapedVolatilesKg * A.volatileNetJPerKg,
      suppliedChemicalJ, .01, `${fuel} chemical energy ledger`);
      close(state.powerW, state.charPowerW + state.volatilePowerW, 1e-9);
    }
  }
});

test('both dampers restrict the same air path and opening air supports more combustion', () => {
  const measure = (intake, exhaust) => {
    const state = createSimulation({ mode: 'manual', intake, exhaust });
    stepSimulation(state);
    return state;
  };
  const open = measure(1, 1);
  const intakeClosed = measure(0, 1);
  const exhaustClosed = measure(1, 0);
  assert.ok(open.airKgS > intakeClosed.airKgS * 10);
  assert.ok(open.airKgS > exhaustClosed.airKgS * 10);
  close(intakeClosed.airKgS, exhaustClosed.airKgS, 1e-12);
  const starved = createSimulation({ mode: 'manual', intake: .05, exhaust: .05 });
  const supplied = createSimulation({ mode: 'manual', intake: .45, exhaust: .85 });
  stepSimulation(starved, 1_200); stepSimulation(supplied, 1_200);
  assert.ok(supplied.releasedEnergyJ > starved.releasedEnergyJ * 4);
  assert.ok(supplied.chamberC > starved.chamberC + 50);
});

test('a finite hardwood batch dries, gives a volatile flame, then has a char-dominated tail', () => {
  const state = createSimulation();
  stepSimulation(state, 60);
  assert.equal(state.volatilePowerW, 0, 'cold wood does not immediately devolatilize');
  stepSimulation(state, 240);
  assert.ok(state.dryingW > 0, 'water evaporation costs heat');
  stepSimulation(state, 1_500);
  assert.ok(state.volatilePowerW > state.charPowerW);
  assert.ok(state.waterKg < .001);
  stepSimulation(state, 4_200);
  assert.ok(state.charPowerW > state.volatilePowerW);
  assert.equal(state.phase, 'Char / embers');
  assert.equal(state.pelletFeedKgH, 0);
});

test('wet fuel delays devolatilization and preserves more water under the same initial conditions', () => {
  const dry = createSimulation({ woodMoisture: .12 });
  const wet = createSimulation({ woodMoisture: .40 });
  stepSimulation(dry, 600); stepSimulation(wet, 600);
  assert.ok(wet.waterKg > dry.waterKg * 3);
  assert.ok(dry.volatilePowerW > wet.volatilePowerW * 1.5);
  assert.ok(dry.fuelC > wet.fuelC);
});

test('automatic control holds 225, 250 and 275 F once thermal inertia settles', () => {
  for (const fuel of ['wood', 'pellets']) for (const targetF of [225, 250, 275]) {
    const state = createSimulation({ fuel, targetC: fToC(targetF) });
    stepSimulation(state, 3_600);
    close(cToF(state.chamberC), targetF, 5, `${fuel} ${targetF} F after one hour`);
    for (let i = 0; i < 12; i++) {
      stepSimulation(state, 300);
      close(cToF(state.chamberC), targetF, 5, `${fuel} ${targetF} F stability`);
      assert.ok(state.exhaust >= .65, 'automatic exhaust retains a flow floor');
      assertFinite(state);
    }
  }
});

test('pellet feed and air control holds a low target for four hours without spurious flameout', () => {
  const state = createSimulation({ fuel: 'pellets', targetC: fToC(225) });
  stepSimulation(state, 14_400);
  close(cToF(state.chamberC), 225, 1);
  assert.equal(state.feedInhibited, false);
  assert.ok(state.hopperKg > 0);
  assert.ok(state.smokeIndex < .05);
});

test('a lid opening freezes integral action and both fuels recover without winding up', () => {
  for (const fuel of ['wood', 'pellets']) {
    const state = createSimulation({ fuel });
    stepSimulation(state, 3_600);
    const before = state.chamberC;
    const integral = state.controllerIntegral;
    const intake = state.intake;
    openLid(state, 45);
    stepSimulation(state, 45);
    assert.ok(state.chamberC < before - 20);
    assert.equal(state.controllerIntegral, integral);
    assert.equal(state.intake, intake);
    stepSimulation(state, 1_800);
    close(cToF(state.chamberC), 250, 5);
    assert.ok(Math.abs(state.controllerIntegral) <= .6);
  }
});

test('feedback compensates for a colder, windier environment while fuel remains available', () => {
  for (const fuel of ['wood', 'pellets']) {
    const state = createSimulation({ fuel });
    stepSimulation(state, 3_600);
    const beforePower = state.powerW;
    setControls(state, { ambientC: 5, windMps: 4 });
    stepSimulation(state, 1_800);
    close(cToF(state.chamberC), 250, 5);
    assert.ok(state.powerW > beforePower * 1.3);
    assertFinite(state);
  }
});

test('an excessive fixed pellet feed exposes the limitations of damper-only temperature control', () => {
  const auger = createSimulation({ fuel: 'pellets', pelletFeedKgH: 2 });
  const airOnly = createSimulation({ fuel: 'pellets', pelletFeedKgH: 2, pelletControl: 'damper-only' });
  stepSimulation(auger, 3_600); stepSimulation(airOnly, 3_600);
  close(cToF(auger.chamberC), 250, 5);
  assert.ok(auger.pelletFeedKgH < .6);
  close(airOnly.pelletFeedKgH, 2, 1e-12);
  assert.ok(airOnly.smokeIndex > .35, 'throttling air cannot dispose of excessive incoming fuel cleanly');
  assert.ok(airOnly.escapedVolatilesKg > auger.escapedVolatilesKg);
  assert.equal(airOnly.setpointLimited, true);
});

test('a cooled pellet fire pauses automatic feeding and cannot reignite by adding cold fuel', () => {
  const state = createSimulation({ fuel: 'pellets' });
  state.timeS = 600;
  state.fireC = 40;
  state.fuelC = 30;
  const hopper = state.hopperKg;
  stepSimulation(state, 600);
  assert.equal(state.feedInhibited, true);
  assert.equal(state.pelletFeedKgH, 0);
  assert.equal(state.hopperKg, hopper);
  assert.match(state.status, /reset to relight/);
  refuel(state, .5);
  stepSimulation(state, 600);
  assert.equal(state.pelletFeedKgH, 0);
  assert.ok(state.powerW < 100);
});

test('moisture changes apply to new fuel and mixed hopper loads preserve wet-basis water mass', () => {
  const state = createSimulation({ fuel: 'pellets', initialFuelKg: 2, woodMoisture: .08 });
  setControls(state, { woodMoisture: .20 });
  close(state.hopperMoisture, .08, 1e-12);
  refuel(state, 1);
  close(state.hopperMoisture, (.08 * 2 + .20) / 3, 1e-12);
  const wood = createSimulation();
  const beforeWater = wood.waterKg;
  setControls(wood, { woodMoisture: .40 });
  assert.equal(wood.waterKg, beforeWater);
  refuel(wood, .5);
  close(wood.waterKg, beforeWater + .2, 1e-12);
});

test('finite fuel inventories eventually cool, and wet meat cores respect boiling latent heat', () => {
  for (const fuel of ['wood', 'pellets']) {
    const state = createSimulation({ fuel });
    stepSimulation(state, 43_200);
    assertFinite(state);
    assert.ok(state.chamberC < 35, 'the finite supply cannot heat the pit forever');
    assert.ok(state.powerW < 100);
    if (fuel === 'pellets') assert.equal(state.hopperKg, 0);
    assert.ok(state.meatCoreC <= 100 || state.meatCoreWaterKg === 0);
  }
  const hot = createSimulation({ fuel: 'pellets', targetC: fToC(275), initialFuelKg: 10 });
  stepSimulation(hot, 43_200);
  assert.ok(hot.meatCoreWaterKg > 0);
  close(hot.meatCoreC, 100, 1e-8);
});

test('bounded inputs and extreme manual disturbances remain finite for the full demo horizon', () => {
  for (const fuel of ['wood', 'pellets', 'hybrid']) {
    const state = createSimulation({ fuel, mode: 'manual', ambientC: -20, windMps: 15,
      woodMoisture: .55, pelletMoisture: .55, initialFuelKg: 10, initialWoodKg: 10, initialPelletKg: 10,
      meatMassKg: .5, intake: 1, exhaust: 1, pelletFeedKgH: 2.5 });
    openLid(state, 600);
    for (let i = 0; i < 48; i++) { stepSimulation(state, 900); assertFinite(state); }
  }
  const invalid = createSimulation({ ambientC: NaN, targetC: Infinity, intake: -2, exhaust: 8 });
  stepSimulation(invalid, 900);
  assertFinite(invalid);
  assert.ok(invalid.intake >= 0 && invalid.intake <= 1);
  assert.ok(invalid.exhaust >= 0 && invalid.exhaust <= 1);
});

function originChemicalEnergy(state, origin) {
  const bed = origin === 'wood' ? state.woodBed : state.pelletBed;
  return bed.dryKg * A.dryWoodNetJPerKg + bed.charKg * A.charNetJPerKg
    + (origin === 'pellets' ? state.hopperKg * (1 - state.hopperMoisture) * A.dryWoodNetJPerKg : 0);
}

function assertOriginLedger(state, origin, suppliedEnergyJ) {
  const bed = origin === 'wood' ? state.woodBed : state.pelletBed;
  const remainingMass = bed.dryKg + bed.charKg + bed.waterKg + (origin === 'pellets' ? state.hopperKg : 0);
  close(remainingMass + bed.burnedKg + bed.escapedVolatilesKg + bed.waterEvaporatedKg, bed.addedKg, 1e-9, `${origin} mass`);
  close(originChemicalEnergy(state, origin) + bed.releasedEnergyJ
    + bed.escapedVolatilesKg * A.volatileNetJPerKg, suppliedEnergyJ, .01, `${origin} chemical energy`);
}

test('hybrid fuel origins independently conserve mass and chemical energy, including both refueling paths', () => {
  for (const options of [
    {}, { mode: 'manual' }, { initialWoodKg: 0 }, { initialPelletKg: 0 },
    { initialWoodKg: 0, initialPelletKg: 0 }, { initialWoodKg: 1.5 },
  ]) {
    const state = createSimulation({ fuel: 'hybrid', ...options });
    const supplied = { wood: originChemicalEnergy(state, 'wood'), pellets: originChemicalEnergy(state, 'pellets') };
    for (let i = 0; i < 36; i++) {
      if (i === 12) {
        setControls(state, { woodMoisture: .4, pelletMoisture: .14 });
        refuel(state, .2, 'wood');
        refuel(state, .7, 'pellets');
        supplied.wood += .2 * .6 * A.dryWoodNetJPerKg;
        supplied.pellets += .7 * .86 * A.dryWoodNetJPerKg;
        openLid(state, 45);
      }
      stepSimulation(state, 300);
      assertFinite(state);
      for (const origin of ['wood', 'pellets']) assertOriginLedger(state, origin, supplied[origin]);
      close(state.fuelAddedKg, state.woodBed.addedKg + state.pelletBed.addedKg, 1e-12);
      close(state.fuelRemainingKg + state.fuelConsumedKg, state.fuelAddedKg, 1e-9);
      close(state.powerW, state.woodPowerW + state.pelletPowerW, 1e-9);
    }
  }
});

test('dedicated burning beds obey their own oxygen budgets throughout the cook', () => {
  const state = createSimulation({ fuel: 'hybrid', mode: 'manual', initialWoodKg: 1,
    woodIntake: .025, pelletIntake: 1, exhaust: 1, pelletFeedKgH: .7 });
  state.woodFireC = 600; state.pelletFireC = 600;
  state.woodBed.temperatureC = 500;
  state.pelletBed.temperatureC = 500;
  stepSimulation(state);
  assert.ok(state.woodVolatilePowerW > 0 && state.pelletVolatilePowerW > 0);
  assert.ok(state.woodSmokeIndex > .5);
  assert.ok(state.woodSmokeIndex > state.pelletSmokeIndex, 'closed wood intake cannot borrow pellet oxygen');
  for (let i = 0; i < 3_600; i++) {
    for (const origin of ['wood', 'pellet']) {
      const consumed = state[`${origin}VolatilePowerW`] / A.volatileNetJPerKg * A.volatileOxygenKgPerKg
        + state[`${origin}CharPowerW`] / A.charNetJPerKg * A.charOxygenKgPerKg;
      close(state[`${origin}OxygenConsumedKgS`], consumed, 1e-12);
      assert.ok(consumed <= state[`${origin}AirKgS`] * A.airOxygenMassFraction + 1e-12);
    }
    close(state.airKgS, state.woodAirKgS + state.pelletAirKgS, 1e-12);
    close(state.oxygenConsumedKgS, state.woodOxygenConsumedKgS + state.pelletOxygenConsumedKgS, 1e-12);
    stepSimulation(state);
  }
});

test('default hybrid combustion overlaps, and pellets replace wood heat as the finite wood charge tapers', () => {
  const state = createSimulation({ fuel: 'hybrid' });
  stepSimulation(state, 300);
  assert.ok(state.woodPowerW > 500 && state.pelletPowerW > 500, 'both dedicated fireboxes release heat');
  stepSimulation(state, 3_300);
  const woodEarly = state.woodPowerW;
  const feedEarly = state.pelletFeedKgH;
  assert.ok(state.woodPowerW > 500 && state.pelletPowerW > 100);
  close(cToF(state.chamberC), 250, 5);
  stepSimulation(state, 3_600);
  assert.ok(state.woodPowerW < woodEarly * .2);
  assert.ok(state.pelletFeedKgH > feedEarly * 1.25);
  assert.ok(state.pelletPowerW > 1_000);
  close(cToF(state.chamberC), 250, 2);
});

test('hybrid feedback holds 225–275 F with both fuels and compensates for lid and weather disturbances', () => {
  for (const targetF of [225, 250, 275]) {
    const state = createSimulation({ fuel: 'hybrid', targetC: fToC(targetF) });
    stepSimulation(state, 5_400);
    close(cToF(state.chamberC), targetF, 3);
    const integral = state.hybridIntegralW;
    openLid(state, 45);
    stepSimulation(state, 45);
    assert.equal(state.hybridIntegralW, integral);
    stepSimulation(state, 1_800);
    close(cToF(state.chamberC), targetF, 3);
    setControls(state, { ambientC: 5, windMps: 4 });
    stepSimulation(state, 1_800);
    close(cToF(state.chamberC), targetF, 3);
    assert.ok(state.exhaust >= .72 && state.woodIntake >= .12 && state.pelletIntake >= .12);
    assert.ok(state.smokeIndex < .1);
  }
});

test('adding wood raises its heat contribution and reduces the residual pellet command', () => {
  const state = createSimulation({ fuel: 'hybrid' });
  stepSimulation(state, 3_600);
  const unchanged = structuredClone(state);
  refuel(state, .15, 'wood');
  stepSimulation(state, 900);
  stepSimulation(unchanged, 900);
  assert.ok(state.woodPowerW > unchanged.woodPowerW * 2);
  assert.ok(state.pelletFeedKgH < unchanged.pelletFeedKgH * .7);
  close(cToF(state.chamberC), 250, 5);
  close(state.pelletFeedTargetKgH, state.residualPelletPowerW * 3600
    / ((1 - state.hopperMoisture) * A.dryWoodNetJPerKg - state.hopperMoisture * A.waterLatentJPerKg), 1e-12);
});

test('large wood charges cannot be canceled: the auger stops and the clean-draft authority limit is explicit', () => {
  const state = createSimulation({ fuel: 'hybrid', initialWoodKg: 1.5 });
  stepSimulation(state, 1_800);
  assert.equal(state.pelletFeedTargetKgH, 0);
  assert.equal(state.pelletFeedKgH, 0);
  assert.ok(state.woodPowerW > 3_000);
  assert.ok(cToF(state.chamberC) > 300);
  assert.equal(state.woodOverpower, true);
  assert.ok(state.unavoidableWoodPowerW > state.demandPowerW + 150);
  assert.ok(state.exhaust >= .72 && state.woodIntake >= .12 && state.pelletIntake >= .12);
  assert.equal(state.pelletPilotActive, false, 'excess wood cancels even the keep-warm feed');
  assert.match(state.controlReason, /minimum clean-draft|intake capacity/);
  assert.ok(Math.abs(state.hybridIntegralW) <= 2_500);
});

test('an empty pellet hopper does not erase ongoing wood combustion or create replacement pellet heat', () => {
  const state = createSimulation({ fuel: 'hybrid', initialPelletKg: .1 });
  let carriedByWood = false;
  for (let i = 0; i < 7_200; i++) {
    const wasEmpty = state.hopperKg === 0;
    stepSimulation(state);
    if (state.hopperKg === 0 && state.woodPowerW > 100) carriedByWood = true;
    if (wasEmpty) assert.equal(state.pelletFeedKgH, 0);
  }
  assert.equal(carriedByWood, true);
  assert.equal(state.hopperKg, 0);
  assert.ok(state.chamberC < fToC(225), 'small finite wood charge cannot guarantee the target after depletion');
  const disabled = createSimulation({ fuel: 'hybrid', initialPelletKg: 0 });
  assert.equal(disabled.pelletBed.addedKg, 0, 'disabled pellet source receives no fictitious starter pellets');
  stepSimulation(disabled, 1_800);
  assert.equal(disabled.pelletPowerW, 0);
  assert.equal(disabled.pelletBed.releasedEnergyJ, 0);
});

test('pellets carry the hybrid target after the wood source is exhausted or disabled', () => {
  const disabled = createSimulation({ fuel: 'hybrid', initialWoodKg: 0 });
  assert.equal(disabled.woodBed.addedKg, 0);
  stepSimulation(disabled, 7_200);
  close(cToF(disabled.chamberC), 250, 3);
  assert.equal(disabled.woodPowerW, 0);
  assert.ok(disabled.pelletPowerW > 1_000);
  const taper = createSimulation({ fuel: 'hybrid' });
  stepSimulation(taper, 14_400);
  close(cToF(taper.chamberC), 250, 2);
  assert.ok(taper.woodPowerW < 20);
  assert.ok(taper.pelletPowerW > 1_000);
});

test('hybrid fixed-step batching, cold-fire inhibit and the full finite demo horizon remain deterministic', () => {
  const batched = createSimulation({ fuel: 'hybrid' });
  const single = createSimulation({ fuel: 'hybrid' });
  stepSimulation(batched, 900);
  for (let i = 0; i < 900; i++) stepSimulation(single);
  assert.deepEqual(batched, single);
  const cold = createSimulation({ fuel: 'hybrid' });
  cold.timeS = 600; cold.woodFireC = 40; cold.pelletFireC = 40;
  cold.woodBed.temperatureC = 30; cold.pelletBed.temperatureC = 30;
  const hopper = cold.hopperKg;
  stepSimulation(cold, 900);
  assert.equal(cold.pelletFeedKgH, 0);
  assert.equal(cold.hopperKg, hopper);
  assert.equal(cold.feedInhibited, true);
  const full = createSimulation({ fuel: 'hybrid' });
  for (let i = 0; i < 48; i++) {
    stepSimulation(full, 900);
    assertFinite(full);
    for (const bed of [full.woodBed, full.pelletBed]) {
      assert.ok(bed.dryKg >= 0 && bed.charKg >= 0 && bed.waterKg >= 0);
    }
  }
  assert.equal(full.hopperKg, 0);
  assert.ok(full.chamberC < 35);
});

test('closing either dedicated intake leaves the other firebox oxygen and immediate combustion unchanged', () => {
  const hot = createSimulation({ fuel: 'hybrid', mode: 'manual', initialWoodKg: 1,
    woodIntake: 1, pelletIntake: 1, exhaust: 1 });
  hot.woodFireC = 600; hot.pelletFireC = 600;
  hot.woodBed.temperatureC = 500; hot.pelletBed.temperatureC = 500;
  const open = structuredClone(hot), woodClosed = structuredClone(hot), pelletClosed = structuredClone(hot);
  setControls(woodClosed, { woodIntake: 0 });
  setControls(pelletClosed, { pelletIntake: 0 });
  for (const state of [open, woodClosed, pelletClosed]) stepSimulation(state);
  assert.ok(open.woodAirKgS > woodClosed.woodAirKgS * 10);
  assert.ok(open.pelletAirKgS > pelletClosed.pelletAirKgS * 10);
  assert.ok(open.woodPowerW > woodClosed.woodPowerW * 2);
  assert.ok(open.pelletPowerW > pelletClosed.pelletPowerW * 2);
  close(woodClosed.pelletAirKgS, open.pelletAirKgS, 1e-12);
  close(woodClosed.pelletPowerW, open.pelletPowerW, 1e-12);
  close(woodClosed.pelletFireC, open.pelletFireC, 1e-12);
  assert.deepEqual(woodClosed.pelletBed, open.pelletBed);
  close(pelletClosed.woodAirKgS, open.woodAirKgS, 1e-12);
  close(pelletClosed.woodPowerW, open.woodPowerW, 1e-12);
  close(pelletClosed.woodFireC, open.woodFireC, 1e-12);
  assert.deepEqual(pelletClosed.woodBed, open.woodBed);
});

test('the common exhaust restricts both dedicated air paths without exchanging their oxygen', () => {
  const open = createSimulation({ fuel: 'hybrid', mode: 'manual', woodIntake: 1, pelletIntake: 1, exhaust: 1 });
  const closed = structuredClone(open);
  setControls(closed, { exhaust: 0 });
  stepSimulation(open); stepSimulation(closed);
  assert.ok(open.woodAirKgS > closed.woodAirKgS * 10);
  assert.ok(open.pelletAirKgS > closed.pelletAirKgS * 10);
  for (const kind of ['wood', 'pellet']) {
    assert.ok(closed[`${kind}OxygenConsumedKgS`] <= closed[`${kind}AirKgS`] * A.airOxygenMassFraction + 1e-12);
  }
});

test('each dedicated thermal node heats only its own fuel and both transfers enter the common pit once', () => {
  const state = createSimulation({ fuel: 'hybrid', mode: 'manual', pelletFeedKgH: 0 });
  state.woodFireC = 650; state.pelletFireC = 200;
  state.chamberC = 250;
  const woodFire = state.woodFireC, pelletFire = state.pelletFireC, pit = state.chamberC;
  stepSimulation(state);
  close(state.woodHeatIntoChamberW, H.fireToPitWPerK * (woodFire - pit), 1e-12);
  close(state.pelletHeatIntoChamberW, H.fireToPitWPerK * (pelletFire - pit), 1e-12);
  assert.ok(state.pelletHeatIntoChamberW < 0, 'a cooler box can absorb stored pit heat');
  close(state.heatIntoChamberW, state.woodHeatIntoChamberW + state.pelletHeatIntoChamberW, 1e-12);
  for (const [origin, fire] of [['wood', woodFire], ['pellet', pelletFire]]) {
    const loss = (H.fireLossWPerK + H.fireWindLossWPerKPerMps * state.config.windMps) * (fire - state.config.ambientC);
    const bed = state[`${origin}Bed`];
    const expectedFire = fire + (state[`${origin}PowerW`] - state[`${origin}HeatIntoChamberW`] - bed.heatToFuelW - loss) / H.fireHeatCapacityJPerK;
    close(state[`${origin}FireC`], expectedFire, 1e-12);
  }
  close(state.fireC, (state.woodFireC + state.pelletFireC) / 2, 1e-12);
});

test('refueling one source changes only its own inventory and cannot add ignition or sensible firebox energy', () => {
  const state = createSimulation({ fuel: 'hybrid' });
  stepSimulation(state, 900);
  const pellet = structuredClone(state.pelletBed), woodFire = state.woodFireC, pelletFire = state.pelletFireC;
  const startup = state.startupSensibleEnergyJ, hopper = state.hopperKg;
  refuel(state, .5, 'wood');
  assert.deepEqual(state.pelletBed, pellet);
  assert.equal(state.hopperKg, hopper);
  assert.equal(state.woodFireC, woodFire); assert.equal(state.pelletFireC, pelletFire);
  const wood = structuredClone(state.woodBed);
  refuel(state, 1, 'pellets');
  assert.deepEqual(state.woodBed, wood);
  assert.equal(state.woodFireC, woodFire); assert.equal(state.pelletFireC, pelletFire);
  assert.equal(state.startupSensibleEnergyJ, startup);
  const empty = createSimulation({ fuel: 'hybrid', initialWoodKg: 0, initialPelletKg: 0 });
  close(empty.startupSensibleEnergyJ, 0, 1e-12);
  close(empty.woodFireC, empty.config.ambientC, 1e-12);
  close(empty.pelletFireC, empty.config.ambientC, 1e-12);
});

test('a cold pellet firebox stays inhibited beside hot wood and cannot bypass relighting by toggling modes', () => {
  const state = createSimulation({ fuel: 'hybrid' });
  state.timeS = 600; state.woodFireC = 700; state.pelletFireC = 40;
  state.woodBed.temperatureC = 500; state.pelletBed.temperatureC = 30;
  const hopper = state.hopperKg;
  stepSimulation(state);
  assert.ok(state.woodPowerW > 500);
  assert.equal(state.pelletFeedKgH, 0);
  assert.equal(state.hopperKg, hopper);
  assert.equal(state.pelletRelightRequired, true);
  refuel(state, .5, 'pellets');
  setControls(state, { mode: 'manual' });
  stepSimulation(state);
  assert.ok(state.pelletFeedKgH > 0, 'manual fuel delivery does not certify successful ignition');
  assert.equal(state.pelletRelightRequired, true);
  setControls(state, { mode: 'auto' });
  state.pelletFireC = 200; // passive heat or a temperature reading cannot clear the latch
  stepSimulation(state);
  assert.equal(state.feedInhibited, true);
  assert.equal(state.pelletFeedKgH, 0);
  assert.match(state.controlReason, /reset/);
  const newCook = createSimulation({ fuel: 'hybrid' });
  assert.equal(newCook.pelletRelightRequired, false);
});

test('the keep-warm pellet command supports the low target using its own live firebox', () => {
  const state = createSimulation({ fuel: 'hybrid', targetC: fToC(225) });
  let pilotTicks = 0;
  for (let i = 0; i < 10_800; i++) {
    stepSimulation(state);
    if (state.pelletPilotActive) {
      pilotTicks++;
      close(state.pelletFeedTargetKgH, H.minimumWarmFeedKgH, 1e-12);
      close(state.residualPelletPowerW, state.pelletPilotPowerW, 1e-12);
      assert.ok(state.residualPelletPowerW > Math.max(0, state.demandPowerW - state.predictedWoodPowerW));
      assert.ok(state.pelletFireC >= 120);
    }
    assert.equal(state.feedInhibited, false);
    assert.ok(state.pelletOxygenConsumedKgS <= state.pelletAirKgS * A.airOxygenMassFraction + 1e-12);
    if (i >= 5_400) close(cToF(state.chamberC), 225, 3);
  }
  assert.ok(pilotTicks > 300, 'wood peaks leave a sustained explicit keep-warm interval');
});

test('hybrid commands clamp independent intakes and legacy intake still controls both branches', () => {
  const state = createSimulation({ fuel: 'hybrid', mode: 'manual', woodIntake: -1, pelletIntake: 2 });
  assert.equal(state.woodIntake, 0); assert.equal(state.pelletIntake, 1);
  setControls(state, { intake: .3 });
  assert.equal(state.woodIntake, .3); assert.equal(state.pelletIntake, .3);
  setControls(state, { woodIntake: .8 });
  assert.equal(state.woodIntake, .8); assert.equal(state.pelletIntake, .3);
  close(state.intake, .55, 1e-12);
});

test('a hot paused pellet fire reports cooling while it transfers stored heat to the pit', () => {
  const state = createSimulation({ fuel: 'hybrid', mode: 'manual', pelletFeedKgH: 0 });
  state.pelletBed.dryKg = 0; state.pelletBed.waterKg = 0; state.pelletBed.charKg = 0;
  stepSimulation(state);
  assert.equal(state.pelletPowerW, 0);
  assert.ok(state.pelletFireC > 160);
  assert.ok(state.pelletHeatIntoChamberW > 0);
  assert.equal(state.pelletPhase, 'Fire cooling');
});
