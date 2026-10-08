// Seeded selection of five cards from the rule library. Pure. No DOM.
import { RULES } from './rules.js';

export const CATEGORIES = ['time', 'device', 'location', 'color', 'light', 'tone', 'shape', 'file'];
export const CARDS_PER_CASE = 5;

export function hashSignals(s) {
  const key = [
    s.fileName, s.bytes, s.width, s.height,
    s.takenAt ? s.takenAt.toISOString() : '',
    s.model || '',
    s.dominant.name,
    Math.round(s.brightness * 100) / 100,
  ].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function shuffle(rand, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function text(value, s) {
  return typeof value === 'function' ? value(s) : value;
}

export function buildCase(signals, seed, reopenCount = 0) {
  const s = { ...signals, reopenCount };
  const rand = mulberry32((seed + reopenCount) >>> 0);
  const eligible = RULES.filter((rule) => rule.when(s));

  const perCategory = [];
  for (const category of CATEGORIES) {
    const pool = eligible.filter((rule) => rule.category === category);
    if (pool.length) perCategory.push(pick(rand, pool));
  }
  const chosen = shuffle(rand, perCategory).slice(0, CARDS_PER_CASE);
  const always = eligible.filter((rule) => rule.category === 'always');
  const fillers = [
    ...always.filter((rule) => rule.priority),
    ...shuffle(rand, always.filter((rule) => !rule.priority)),
  ];
  while (chosen.length < CARDS_PER_CASE && fillers.length) chosen.push(fillers.shift());

  const cards = chosen.map((rule, index) => ({
    exhibit: reopenCount * CARDS_PER_CASE + index + 1,
    ruleId: rule.id,
    category: rule.category,
    evidence: text(rule.evidence, s),
    deduction: text(pick(rand, rule.deductions), s),
    why: text(pick(rand, rule.whys), s),
  }));
  return { seed, reopenCount, cards };
}
