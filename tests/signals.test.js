import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isScreenShaped, classifyDevice, deriveTime, orientationOf } from '../js/signals.js';

test('isScreenShaped matches phone and desktop ratios only when there is no EXIF', () => {
  assert.equal(isScreenShaped(1170, 2532, false), true);
  assert.equal(isScreenShaped(1920, 1080, false), true);
  assert.equal(isScreenShaped(1170, 2532, true), false);
  assert.equal(isScreenShaped(3024, 4032, false), false);
  assert.equal(isScreenShaped(6000, 4000, false), false);
  assert.equal(isScreenShaped(0, 0, false), false);
});

test('classifyDevice reads make and model', () => {
  assert.equal(classifyDevice('Apple', 'iPhone 13 Pro'), 'iphone');
  assert.equal(classifyDevice('samsung', 'SM-G998B'), 'android');
  assert.equal(classifyDevice('Google', 'Pixel 8'), 'android');
  assert.equal(classifyDevice('Canon', 'Canon EOS R6'), 'camera');
  assert.equal(classifyDevice('SONY', 'ILCE-7M4'), 'camera');
  assert.equal(classifyDevice(null, null), null);
});

test('deriveTime computes hour, weekday, and years ago', () => {
  const now = new Date(2026, 9, 8, 14, 0);
  const t = deriveTime(new Date(2021, 5, 20, 12, 31), now);
  assert.equal(t.hour, 12);
  assert.equal(t.weekday, 0);
  assert.ok(t.yearsAgo > 5 && t.yearsAgo < 5.5, `yearsAgo ${t.yearsAgo}`);
  const empty = { takenAt: null, hour: null, weekday: null, yearsAgo: null };
  assert.deepEqual(deriveTime(null, now), empty);
  assert.deepEqual(deriveTime(new Date('nonsense'), now), empty);
});

test('orientationOf treats near-square as square', () => {
  assert.equal(orientationOf(3024, 4032), 'portrait');
  assert.equal(orientationOf(6000, 4000), 'landscape');
  assert.equal(orientationOf(1080, 1080), 'square');
  assert.equal(orientationOf(1080, 1090), 'square');
});
