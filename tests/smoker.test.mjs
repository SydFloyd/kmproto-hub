import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MODEL_ASSUMPTIONS as A,
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
  for (const fuel of ['wood', 'pellets']) {
    const state = createSimulation({ fuel, mode: 'manual', ambientC: -20, windMps: 15,
      woodMoisture: .55, initialFuelKg: 10, meatMassKg: .5, intake: 1, exhaust: 1, pelletFeedKgH: 2.5 });
    openLid(state, 600);
    for (let i = 0; i < 48; i++) { stepSimulation(state, 900); assertFinite(state); }
  }
  const invalid = createSimulation({ ambientC: NaN, targetC: Infinity, intake: -2, exhaust: 8 });
  stepSimulation(invalid, 900);
  assertFinite(invalid);
  assert.ok(invalid.intake >= 0 && invalid.intake <= 1);
  assert.ok(invalid.exhaust >= 0 && invalid.exhaust <= 1);
});
