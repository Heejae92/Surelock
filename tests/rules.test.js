import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, fmtTime, fmtRatio, fmtInt, fmtMB, fmtKB, parsePhotoNumber, isCameraName } from '../js/rules.js';

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
  assert.equal(fmtRatio(1080, 1350), '4:5');
  assert.equal(fmtRatio(1030, 1000), '5:4');
  assert.equal(parsePhotoNumber('PXL_20260310_123456789.jpg'), null);
  assert.equal(parsePhotoNumber('IMG-20260310-WA0012.jpg'), null);
  assert.equal(parsePhotoNumber('IMG_E8842.JPG'), 8842);
  assert.equal(parsePhotoNumber('P1000123.JPG'), 1000123);
  assert.equal(isCameraName('PXL_20260310_123456789.jpg'), true);
  assert.equal(isCameraName('IMG-20260310-WA0012.jpg'), true);
  assert.equal(isCameraName('final2.jpg'), false);
  assert.equal(isCameraName('Party.jpg'), false);
});

test('every rule is complete', () => {
  assert.ok(RULES.length >= 34, `only ${RULES.length} rules`);
  const ids = new Set();
  for (const r of RULES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(CATEGORIES.has(r.category), r.id);
    assert.equal(typeof r.when, 'function', r.id);
    assert.equal(typeof r.evidence, 'function', r.id);
    assert.equal(r.deductions.length, 3, r.id);
    assert.equal(r.whys.length, 2, r.id);
    for (const s of [base, { ...base, reopenCount: 1 }]) {
      for (const line of [r.evidence(s), ...r.deductions, ...r.whys].map((v) => (typeof v === 'function' ? v(s) : v))) {
        assert.equal(typeof line, 'string', r.id);
        assert.doesNotMatch(line, /undefined|null|NaN|\[object/, `${r.id}: ${line}`);
        assert.doesNotMatch(line, /\b(probably|might|seems|maybe|perhaps)\b/i, `${r.id}: ${line}`);
      }
    }
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
  assert.equal(byId('landscape').when({ ...shot, orientation: 'landscape' }), false);
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

test('device evidence never prints null and never doubles the brand', () => {
  const cam = (make, model) => ({ ...base, make, model, deviceKind: 'camera' });
  assert.equal(byId('real-camera').evidence(cam('Canon', null)), 'Shot on a Canon.');
  assert.equal(byId('real-camera').evidence(cam(null, 'ILCE-7M4')), 'Shot on an ILCE-7M4.');
  assert.equal(byId('real-camera').evidence(cam('NIKON CORPORATION', 'NIKON D850')), 'Shot on a NIKON D850.');
  assert.equal(byId('real-camera').evidence(cam('Canon', 'Canon EOS 80D')), 'Shot on a Canon EOS 80D.');
  assert.equal(byId('real-camera').evidence(cam('Sony', 'ILCE-7M4')), 'Shot on a Sony ILCE-7M4.');
  assert.equal(byId('android').evidence({ ...base, make: null, model: 'Pixel 7', deviceKind: 'android' }), 'Shot on a Pixel 7.');
});

test('camera-generated names without a sequence number are neither numbered nor custom', () => {
  for (const fileName of ['PXL_20260310_123456789.jpg', 'IMG-20260310-WA0012.jpg']) {
    assert.equal(byId('numbered-name').when({ ...base, fileName }), false, fileName);
    assert.equal(byId('custom-name').when({ ...base, fileName }), false, fileName);
  }
  assert.equal(byId('numbered-name').when({ ...base, fileName: 'IMG_E8842.JPG' }), true);
  assert.equal(byId('custom-name').when({ ...base, fileName: 'my-cat.jpg' }), true);
  assert.equal(byId('custom-name').when({ ...base, fileName: 'my-cat.jpg', screenShaped: true }), false);
  assert.equal(byId('numbered-name').deductions[0]({ ...base, fileName: 'IMG_0000.jpg' }), 'There are 0 photos before this one. You will revisit none of them.');
});

test('every hour of every weekday has at least one time rule, and lunch never overlaps work hours', () => {
  const timeRules = RULES.filter((r) => r.category === 'time');
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const takenAt = new Date(2026, 2, 8 + day, hour, 30); // 2026-03-08 is a Sunday
      const s = { ...base, takenAt, hour, weekday: takenAt.getDay(), yearsAgo: 0.6 };
      const firing = timeRules.filter((r) => r.when(s)).map((r) => r.id);
      assert.ok(firing.length >= 1, `${day} ${hour}: ${firing}`);
      assert.ok(!(firing.includes('lunch') && firing.includes('work-hours')), `${day} ${hour}`);
    }
  }
});

test('when clauses return strict booleans and iphone evidence falls back to the device name', () => {
  for (const r of RULES) {
    for (const s of [base, { ...base, hasExif: undefined, hasGPS: undefined }, { ...base, fileName: null, bytes: 0 }]) {
      assert.equal(typeof r.when(s), 'boolean', r.id);
    }
  }
  assert.equal(byId('no-gps').when({ ...base, hasExif: undefined }), false);
  assert.equal(byId('iphone').evidence({ ...base, model: null, make: 'Apple iPhone', deviceKind: 'iphone' }), 'Shot on Apple iPhone.');
});
