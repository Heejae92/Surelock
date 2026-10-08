// Pure color helpers. No DOM. Used by signals.js in the browser and by tests in Node.
// analyzePixels reports `saturation` as mean chroma (0–1), not mean HSL saturation.

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export const COLOR_NAMES = [
  'white', 'beige', 'brown', 'gray', 'black',
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
];

// Chroma is max − min of the normalized channels (0 for neutrals, 1 for pure hues).
// HSL saturation is not used for neutral detection or averaging because it explodes near white.
export function chromaOf({ s, l }) {
  return (1 - Math.abs(2 * l - 1)) * s;
}

export function nameColor({ h, s, l }) {
  const chroma = chromaOf({ s, l });
  if (l <= 0.12) return 'black';
  if (chroma < 0.1) return l >= 0.85 ? 'white' : 'gray';
  if (h >= 15 && h < 60 && s < 0.5) return l >= 0.55 ? 'beige' : 'brown';
  if (h < 15 || h >= 340) return l >= 0.7 ? 'pink' : 'red';
  if (h < 45) return l < 0.35 ? 'brown' : 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}

export function analyzePixels(data) {
  const counts = Object.fromEntries(COLOR_NAMES.map((name) => [name, 0]));
  let n = 0;
  let sumL = 0;
  let sumChroma = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    counts[nameColor(hsl)] += 1;
    sumL += hsl.l;
    sumChroma += chromaOf(hsl);
    n += 1;
  }
  if (n === 0) return { dominant: { name: 'gray', share: 1 }, brightness: 0.5, saturation: 0 };
  let best = COLOR_NAMES[0];
  for (const name of COLOR_NAMES) if (counts[name] > counts[best]) best = name;
  return {
    dominant: { name: best, share: counts[best] / n },
    brightness: sumL / n,
    saturation: sumChroma / n,
  };
}
