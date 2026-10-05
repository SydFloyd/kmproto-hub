import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BlueprintNavigator, childWorld, createWorld, fitCamera, focusCamera, mixCamera, pointAlong, project, resolveWorld } from '../app/components/blueprint/model.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('each child inherits the exact preview layout, gates and proportions', () => {
  let world = createWorld();
  for (const expected of ['city', 'machine', 'circuit']) {
    const part = world.parts[4], child = childWorld(world, part);
    assert.equal(child.kind, expected);
    assert.equal(child.seed, part.seed);
    assert.deepEqual(child.gates, part.gates);
    close(child.width / child.height, part.aperture.w / part.aperture.h);
    child.parts.forEach((nested, i) => {
      close(nested.x / child.width, part.layout[i].x);
      close(nested.y / child.height, part.layout[i].y);
      close(nested.w / child.width, part.layout[i].w);
      close(nested.h / child.height, part.layout[i].h);
    });
    world = child;
  }
});

test('a dive ends at exactly the next world camera without a positional jump', () => {
  const parent = createWorld();
  for (const [width, height] of [[300, 360], [560, 540], [1440, 900], [390, 844]]) {
    for (const part of parent.parts) {
      const child = childWorld(parent, part), focused = focusCamera(part.aperture, width, height), fit = fitCamera(child, width, height);
      const end = mixCamera(fitCamera(parent, width, height), focused, 1);
      close(end.scale, focused.scale);
      for (const nested of child.parts) {
        const point = { x: nested.x, y: nested.y }, mapped = {
          x: part.aperture.x + point.x / child.width * part.aperture.w,
          y: part.aperture.y + point.y / child.height * part.aperture.h,
        };
        const before = project(mapped, end, width, height), after = project(point, fit, width, height);
        close(before.x, after.x); close(before.y, after.y);
      }
    }
  }
});

test('deep exploration stays finite and each world has bounded visible geometry', () => {
  const navigation = new BlueprintNavigator();
  for (let i = 0; i < 500; i++) {
    assert.ok(navigation.dive((i * 7) % 9, true));
    const world = navigation.world;
    assert.equal(world.parts.length, 9); assert.equal(world.routes.length, 16);
    assert.ok(world.width / world.height > 0.6 && world.width / world.height < 2);
    for (const part of world.parts) {
      assert.ok(Object.values(part.aperture).every(Number.isFinite));
      assert.ok(part.x > 0 && part.y > 0 && part.x + part.w < world.width && part.y + part.h < world.height);
      assert.ok(part.aperture.w > 0 && part.aperture.h > 0);
    }
  }
  assert.equal(navigation.path.length, 500);
  assert.deepEqual(resolveWorld(navigation.path), navigation.world);
  assert.ok(navigation.surface(true));
  assert.deepEqual(navigation.world, createWorld()); assert.equal(navigation.path.length, 0);
});

test('returning and revisiting recover the same world, including other branches', () => {
  const navigation = new BlueprintNavigator();
  assert.equal(navigation.back(), false); assert.equal(navigation.dive(99), false);
  navigation.dive(2, true); const city = navigation.world;
  navigation.dive(7, true); const machine = navigation.world;
  navigation.back(true); assert.deepEqual(navigation.world, city);
  navigation.dive(7, true); assert.deepEqual(navigation.world, machine);
  navigation.back(true); navigation.dive(0, true); assert.notEqual(navigation.world.seed, machine.seed);
  navigation.surface(true); assert.deepEqual(navigation.world, createWorld());
});

test('transitions serialize navigation and reduced motion completes immediately', () => {
  const navigation = new BlueprintNavigator();
  navigation.dive(4);
  assert.equal(navigation.dive(2), false); assert.equal(navigation.surface(), false);
  assert.equal(navigation.advance(0.4), false); assert.equal(navigation.path.length, 0);
  assert.equal(navigation.advance(0.6), true); assert.deepEqual(navigation.path, [4]);
  navigation.surface(); assert.equal(navigation.transition.mode, 'out'); navigation.advance(1);
  assert.equal(navigation.world.kind, 'circuit'); assert.equal(navigation.path.length, 0);
  navigation.dive(0, true); assert.equal(navigation.transition, null); assert.equal(navigation.world.kind, 'city');
});

test('moving signals follow continuous physical routes through corners', () => {
  const route = { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], length: 20, phase: 0 };
  assert.deepEqual(pointAlong(route, 0.25), { x: 5, y: 0 });
  assert.deepEqual(pointAlong(route, 0.5), { x: 10, y: 0 });
  assert.deepEqual(pointAlong(route, 0.75), { x: 10, y: 5 });
  assert.deepEqual(pointAlong(route, 1.25), pointAlong(route, 0.25));
  assert.deepEqual(pointAlong(route, -0.25), pointAlong(route, 0.75));
});
