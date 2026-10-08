// Browser-side signal extraction: File → Signals. The pure helpers are exported for tests.
// Nothing here sends the image anywhere. GPS is only checked for presence.
import { analyzePixels } from './colors.js';

const SCREEN_RATIOS = [9 / 16, 16 / 9, 9 / 19.5, 19.5 / 9, 9 / 20, 20 / 9, 16 / 10, 10 / 16];

export function isScreenShaped(width, height, hasExif) {
  if (hasExif || !width || !height) return false;
  const aspect = width / height;
  return SCREEN_RATIOS.some((ratio) => Math.abs(aspect - ratio) / ratio <= 0.03);
}

export function classifyDevice(make, model) {
  const text = `${make || ''} ${model || ''}`.trim().toLowerCase();
  if (!text) return null;
  if (/iphone|ipad|apple/.test(text)) return 'iphone';
  if (/samsung|google|pixel|oneplus|xiaomi|huawei|oppo|vivo|motorola|\blg\b|lge|realme|honor|asus|nokia|nothing|xperia|android/.test(text)) return 'android';
  return 'camera';
}

export function deriveTime(takenAt, now = new Date()) {
  if (!(takenAt instanceof Date) || Number.isNaN(takenAt.getTime()) || takenAt.getFullYear() < 1900) {
    // Blank EXIF dates revive as 1899-11-30; treat anything before 1900 as no date.
    return { takenAt: null, hour: null, weekday: null, yearsAgo: null };
  }
  const yearsAgo = (now.getTime() - takenAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return { takenAt, hour: takenAt.getHours(), weekday: takenAt.getDay(), yearsAgo };
}

export function orientationOf(width, height) {
  if (Math.abs(width - height) / Math.max(width, height) < 0.02) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // SVG and some formats are not supported by createImageBitmap; fall back to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('undecodable'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readExif(file) {
  const exifr = globalThis.exifr;
  if (!exifr) return null;
  try {
    // The lite build ships no tag dictionaries, so a global `pick` throws; filter per block instead.
    return await exifr.parse(file, { ifd0: ['Make', 'Model'], exif: ['DateTimeOriginal'], gps: ['GPSLatitude', 'GPSLongitude'] });
  } catch {
    return null;
  }
}

export async function readSignals(file, now = new Date()) {
  if (!file) throw { code: 'not-image' };
  if (file.type && !file.type.startsWith('image/')) throw { code: 'not-image' };

  let image;
  try {
    image = await decode(file);
  } catch {
    throw { code: 'undecodable' };
  }
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  if (!width || !height) throw { code: 'undecodable' };

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 64, 64);
  const pixels = analyzePixels(ctx.getImageData(0, 0, 64, 64).data);
  if (typeof image.close === 'function') image.close();

  const exif = await readExif(file);
  const takenAt = exif && exif.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : null;
  const make = exif && exif.Make ? String(exif.Make).trim() : null;
  const model = exif && exif.Model ? String(exif.Model).trim() : null;
  const hasExif = Boolean(takenAt || make || model);
  const hasGPS = Boolean(exif && (exif.latitude != null || exif.GPSLatitude != null));

  return {
    fileName: file.name || null,
    bytes: file.size || 0,
    width,
    height,
    aspect: width / height,
    orientation: orientationOf(width, height),
    screenShaped: isScreenShaped(width, height, hasExif),
    hasExif,
    ...deriveTime(takenAt, now),
    make,
    model,
    deviceKind: classifyDevice(make, model),
    hasGPS,
    dominant: pixels.dominant,
    brightness: pixels.brightness,
    saturation: pixels.saturation,
    pixelCount: width * height,
    analyzedAt: now,
  };
}

export async function signalsForSample(entry, now = new Date()) {
  const response = await fetch(entry.src);
  if (!response.ok) throw { code: 'undecodable' };
  const blob = await response.blob();
  const name = entry.fileName || entry.src.split('/').pop();
  const file = new File([blob], name, { type: blob.type || 'image/svg+xml' });
  const base = await readSignals(file, now);
  const o = entry.overrides || {};
  const takenAt = o.takenAt ? new Date(o.takenAt) : base.takenAt;
  const make = o.make !== undefined ? o.make : base.make;
  const model = o.model !== undefined ? o.model : base.model;
  const hasExif = Boolean(takenAt || make || model);
  const merged = {
    ...base,
    bytes: o.bytes || base.bytes,
    hasGPS: o.hasGPS !== undefined ? o.hasGPS : base.hasGPS,
    make,
    model,
    hasExif,
    ...deriveTime(takenAt, now),
  };
  merged.deviceKind = classifyDevice(make, model);
  merged.screenShaped = isScreenShaped(merged.width, merged.height, hasExif);
  return merged;
}
