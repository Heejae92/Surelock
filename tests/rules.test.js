import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, fmtTime, fmtRatio, fmtInt, fmtMB, fmtKB, parsePhotoNumber } from '../js/rules.js';

const CATEGORIES = new Set(['time', 'device', 'location', 'color', 'light', 'tone', 'shape', 'file', 'always']);

const base = {
  fileName: 'IMG_8842.jpg', bytes: 4823000, width: 3024, height: 4032, aspect: 0.75,
  orientation: 'portrait', screenShaped: false, hasExif: true,
  takenAt: new Date(2026, 2, 10, 23, 48), hour: 23, weekday: 2, yearsAgo: 0.6,
  make: 'Apple', model: 'iPhone 13 Pro', deviceKind: 'iphone', hasGPS: false,
  dominant: { name: 'beige', share: 0.62 }, brightness: 0.66, saturation: 0.22,
  pixelCount: 3024 * 4032, analyzedAt: new Date(2026, 9, 8, 14, 0), reopenCount: 0,
};

const byId = (id) => RULES.find((r) => r.id === id);

test('formatting helpers', () => {
  assert.equal(fmtTime(new Date(2026, 2, 14, 23, 48)), '11:48 PM');
  assert.equal(fmtTime(new Date(2026, 2, 14, 0, 5)), '12:05 AM');
  assert.equal(fmtTime(new Date(2026, 2, 14, 12, 0)), '12:00 PM');
  assert.equal(fmtRatio(3024, 4032), '3:4');
  assert.equal(fmtRatio(6000, 4000), '3:2');
  assert.equal(fmtRatio(1170, 2532), '9:16');
  assert.equal(fmtInt(12193792), '12,193,792');
  assert.equal(fmtMB(4823000), '4.6');
  assert.equal(fmtKB(212000), 207);
  assert.equal(parsePhotoNumber('IMG_8842.jpg'), 8842);
  assert.equal(parsePhotoNumber('DSC_0417.JPG'), 417);
  assert.equal(parsePhotoNumber('Screenshot 2026-10-08.png'), null);
  assert.equal(parsePhotoNumber('final2.jpg'), null);
});

test('every rule is complete', () => {
  assert.ok(RULES.length >= 33, `only ${RULES.length} rules`);
  const ids = new Set();
  for (const r of RULES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(CATEGORIES.has(r.category), r.id);
    assert.equal(typeof r.when, 'function', r.id);
    assert.equal(typeof r.evidence, 'function', r.id);
    assert.equal(r.deductions.length, 3, r.id);
    assert.equal(r.whys.length, 2, r.id);
  }
});

test('evidence strings are built from real values', () => {
  assert.equal(byId('late-night').evidence(base), 'Taken at 11:48 PM.');
  assert.equal(byId('neutral-light').evidence(base), '62% of the frame is beige.');
  assert.equal(byId('numbered-name').evidence(base), 'Filename: IMG_8842.jpg.');
  assert.equal(byId('iphone').evidence(base), 'Shot on iPhone 13 Pro.');
  assert.equal(byId('pixels').evidence(base), '12,192,768 pixels examined.');
  assert.equal(byId('dimensions').evidence(base), '3,024×4,032 pixels.');
  assert.equal(byId('analyzed-at').evidence(base), 'Analyzed at 2:00 PM.');
});

test('shape and camera rules are mutually exclusive for screenshots', () => {
  const shot = {
    ...base, fileName: 'Screenshot 2026-10-08 at 2.14.33 AM.png', bytes: 212000,
    width: 1170, height: 2532, screenShaped: true, hasExif: false,
    takenAt: null, hour: null, weekday: null, yearsAgo: null,
    make: null, model: null, deviceKind: null,
  };
  assert.equal(byId('screenshot').when(shot), true);
  assert.equal(byId('portrait').when(shot), false);
  assert.equal(byId('no-camera').when(shot), false);
  assert.equal(byId('custom-name').when(shot), false);
  assert.equal(byId('no-gps').when(shot), false);
  assert.equal(byId('late-night').when(shot), false);
  assert.equal(byId('weekend').when(shot), false);
});

test('second-opinion only fires after a reopen', () => {
  assert.equal(byId('second-opinion').when(base), false);
  assert.equal(byId('second-opinion').when({ ...base, reopenCount: 1 }), true);
  assert.equal(byId('second-opinion').evidence({ ...base, reopenCount: 1 }), 'Case reopened 1 time.');
  assert.equal(byId('second-opinion').evidence({ ...base, reopenCount: 2 }), 'Case reopened 2 times.');
});
