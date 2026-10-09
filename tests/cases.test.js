import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSignals, mulberry32, buildCase, CARDS_PER_CASE } from '../js/cases.js';

const full = {
  fileName: 'IMG_8842.jpg', bytes: 4823000, width: 3024, height: 4032, aspect: 0.75,
  orientation: 'portrait', screenShaped: false, hasExif: true,
  takenAt: new Date(2026, 2, 10, 23, 48), hour: 23, weekday: 2, yearsAgo: 0.6,
  make: 'Apple', model: 'iPhone 13 Pro', deviceKind: 'iphone', hasGPS: false,
  dominant: { name: 'beige', share: 0.62 }, brightness: 0.66, saturation: 0.22,
  pixelCount: 3024 * 4032, analyzedAt: new Date(2026, 9, 8, 14, 0),
};

const sparse = {
  fileName: 'Screenshot 2026-10-08 at 2.14.33 AM.png', bytes: 212000, width: 1170, height: 2532,
  aspect: 1170 / 2532, orientation: 'portrait', screenShaped: true, hasExif: false,
  takenAt: null, hour: null, weekday: null, yearsAgo: null,
  make: null, model: null, deviceKind: null, hasGPS: false,
  dominant: { name: 'black', share: 0.7 }, brightness: 0.5, saturation: 0.3,
  pixelCount: 1170 * 2532, analyzedAt: new Date(2026, 9, 8, 14, 0),
};

test('hashSignals is a stable uint32 that changes with the input', () => {
  const a = hashSignals(full);
  assert.equal(a, hashSignals({ ...full }));
  assert.ok(Number.isInteger(a) && a >= 0 && a <= 0xffffffff);
  assert.notEqual(a, hashSignals({ ...full, fileName: 'IMG_8843.jpg' }));
});

test('mulberry32 is deterministic and in range', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 20; i += 1) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('buildCase returns five cards with distinct non-always categories', () => {
  const c = buildCase(full, 123, 0);
  assert.equal(c.cards.length, CARDS_PER_CASE);
  const cats = c.cards.filter((k) => k.category !== 'always').map((k) => k.category);
  assert.equal(new Set(cats).size, cats.length);
  for (const card of c.cards) {
    assert.equal(typeof card.evidence, 'string');
    assert.equal(typeof card.deduction, 'string');
    assert.equal(typeof card.why, 'string');
    assert.ok(card.evidence.length > 0 && card.deduction.length > 0 && card.why.length > 0);
  }
  assert.deepEqual(c.cards.map((k) => k.exhibit), [1, 2, 3, 4, 5]);
});

test('buildCase is deterministic for the same seed and different on reopen', () => {
  const a = buildCase(full, 123, 0);
  const b = buildCase(full, 123, 0);
  assert.deepEqual(a, b);
  const r = buildCase(full, 123, 1);
  const strip = (c) => c.cards.map(({ exhibit, ...rest }) => rest);
  assert.notDeepEqual(strip(a), strip(r));
  const ruleSet = (c) => c.cards.map((k) => k.ruleId).sort().join();
  assert.ok(Array.from({ length: 50 }, (_, i) => i).some((i) => ruleSet(buildCase(full, i, 0)) !== ruleSet(buildCase(full, i, 1))));
  assert.deepEqual(r.cards.map((k) => k.exhibit), [6, 7, 8, 9, 10]);
  assert.equal(r.reopenCount, 1);
});

test('buildCase still yields five cards for a sparse screenshot', () => {
  const c = buildCase(sparse, 7, 0);
  assert.equal(c.cards.length, CARDS_PER_CASE);
  assert.ok(c.cards.some((k) => k.ruleId === 'screenshot'));
  assert.ok(c.cards.some((k) => k.ruleId === 'dark-neutral'));
  assert.ok(!c.cards.some((k) => k.ruleId === 'second-opinion'));
  const r = buildCase(sparse, 7, 2);
  assert.ok(r.cards.some((k) => k.ruleId === 'second-opinion'));
});

test('a reopen never repeats a card from the case it replaces', () => {
  for (const signals of [full, sparse]) {
    for (let seed = 0; seed < 2000; seed += 1) {
      let previous = buildCase(signals, seed, 0);
      for (let n = 1; n <= 3; n += 1) {
        const next = buildCase(signals, seed, n, previous);
        const seen = new Set(previous.cards.map((c) => `${c.ruleId}|${c.deduction}`));
        for (const card of next.cards) assert.ok(!seen.has(`${card.ruleId}|${card.deduction}`), `seed ${seed} reopen ${n}: ${card.ruleId}`);
        previous = next;
      }
    }
  }
});
