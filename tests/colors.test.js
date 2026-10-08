import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHsl, nameColor, analyzePixels, COLOR_NAMES } from '../js/colors.js';

const px = (r, g, b, n) => Array.from({ length: n }, () => [r, g, b, 255]).flat();

test('rgbToHsl converts primaries and grays', () => {
  assert.deepEqual(rgbToHsl(255, 0, 0), { h: 0, s: 1, l: 0.5 });
  const green = rgbToHsl(0, 255, 0);
  assert.equal(green.h, 120);
  assert.equal(green.s, 1);
  const gray = rgbToHsl(128, 128, 128);
  assert.equal(gray.s, 0);
});

test('nameColor buckets hue, saturation, and lightness into 12 names', () => {
  assert.deepEqual(COLOR_NAMES, ['white', 'beige', 'brown', 'gray', 'black', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']);
  const cases = [
    [{ h: 0, s: 1, l: 0.5 }, 'red'],
    [{ h: 350, s: 0.8, l: 0.8 }, 'pink'],
    [{ h: 25, s: 0.9, l: 0.55 }, 'orange'],
    [{ h: 30, s: 0.4, l: 0.78 }, 'beige'],
    [{ h: 28, s: 0.42, l: 0.3 }, 'brown'],
    [{ h: 55, s: 0.8, l: 0.5 }, 'yellow'],
    [{ h: 120, s: 0.6, l: 0.4 }, 'green'],
    [{ h: 210, s: 0.8, l: 0.5 }, 'blue'],
    [{ h: 280, s: 0.5, l: 0.5 }, 'purple'],
    [{ h: 320, s: 0.6, l: 0.5 }, 'pink'],
    [{ h: 0, s: 0, l: 0.5 }, 'gray'],
    [{ h: 0, s: 0, l: 0.98 }, 'white'],
    [{ h: 0, s: 0, l: 0.05 }, 'black'],
  ];
  for (const [hsl, name] of cases) assert.equal(nameColor(hsl), name, JSON.stringify(hsl));
});

test('analyzePixels finds the dominant bucket and averages lightness and saturation', () => {
  const data = new Uint8ClampedArray([...px(222, 205, 180, 30), ...px(20, 20, 20, 10)]);
  const out = analyzePixels(data);
  assert.equal(out.dominant.name, 'beige');
  assert.equal(out.dominant.share, 0.75);
  assert.ok(out.brightness > 0.5 && out.brightness < 0.7, `brightness ${out.brightness}`);
  assert.ok(out.saturation > 0.1 && out.saturation < 0.15, `saturation ${out.saturation}`);
});

test('analyzePixels ignores transparent pixels', () => {
  const data = new Uint8ClampedArray([0, 0, 255, 255, 255, 0, 0, 0]);
  assert.equal(analyzePixels(data).dominant.name, 'blue');
  assert.equal(analyzePixels(data).dominant.share, 1);
});

test('near-white pixels are white, not hue-named', () => {
  for (const rgb of [[255, 250, 240], [248, 248, 255], [253, 254, 255], [230, 230, 236], [245, 247, 250]]) {
    assert.equal(nameColor(rgbToHsl(...rgb)), 'white', rgb.join(','));
  }
  const wall = new Uint8ClampedArray([...px(250, 252, 254, 10), ...px(254, 252, 250, 10), ...px(252, 250, 254, 10)]);
  const out = analyzePixels(wall);
  assert.equal(out.dominant.name, 'white');
  assert.equal(out.dominant.share, 1);
  assert.ok(out.saturation < 0.02, `saturation ${out.saturation}`);
});

test('warm near-whites are beige, saddle brown stays brown, pale orange stays orange', () => {
  for (const rgb of [[250, 240, 215], [255, 245, 225], [240, 225, 200], [250, 240, 224], [255, 250, 200]]) {
    assert.equal(nameColor(rgbToHsl(...rgb)), 'beige', rgb.join(','));
  }
  assert.equal(nameColor(rgbToHsl(150, 100, 60)), 'brown');
  assert.equal(nameColor(rgbToHsl(255, 200, 150)), 'orange');
  assert.equal(nameColor(rgbToHsl(255, 140, 0)), 'orange');
});
