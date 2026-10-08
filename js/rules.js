// The rule library: formatting helpers and every deduction rule.
// Pure data and functions. No DOM. Rules receive `{ ...signals, reopenCount }`.

export function fmtTime(date) {
  const h24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${minutes} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtWeekday(date) {
  return WEEKDAYS[date.getDay()];
}

export function fmtInt(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtPct(fraction) {
  return Math.round(fraction * 100);
}

const LANDSCAPE_RATIOS = [[4, 3], [3, 2], [16, 9], [5, 4]];
const PORTRAIT_RATIOS = [[3, 4], [2, 3], [9, 16], [4, 5]];

export function fmtRatio(width, height) {
  const aspect = width / height;
  const candidates = width >= height ? LANDSCAPE_RATIOS : PORTRAIT_RATIOS;
  let best = candidates[0];
  let bestDiff = Infinity;
  for (const [w, h] of candidates) {
    const diff = Math.abs(aspect - w / h);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [w, h];
    }
  }
  return `${best[0]}:${best[1]}`;
}

export function fmtMB(bytes) {
  return (bytes / 1048576).toFixed(1);
}

export function fmtKB(bytes) {
  return Math.round(bytes / 1024);
}

const CAMERA_NAME = /^(?:IMG|DSC|PXL|DCIM|P)[_-]?E?\d/i;
const SEQUENCE_NUMBER = /^(?:IMG|DSC|DCIM|P)[_-]?E?(\d{3,7})(?!\d)/i;

export function isCameraName(fileName) {
  return CAMERA_NAME.test(fileName || '');
}

export function parsePhotoNumber(fileName) {
  const match = SEQUENCE_NUMBER.exec(fileName || '');
  return match ? parseInt(match[1], 10) : null;
}

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const colorEvidence = (s) => `${fmtPct(s.dominant.share)}% of the frame is ${s.dominant.name}.`;
const isLunch = (hour) => hour === 12 || hour === 13;
const photosBefore = (s) => Math.max(parsePhotoNumber(s.fileName) - 1, 0);
const withArticle = (name) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
const deviceName = (s) => {
  const make = (s.make || '').trim();
  const model = (s.model || '').trim();
  if (!model) return make;
  if (!make) return model;
  const brand = make.split(/\s+/)[0].toLowerCase();
  return model.toLowerCase().startsWith(brand) ? model : `${make} ${model}`;
};

export const RULES = [
  // ---- time ---------------------------------------------------------------
  {
    id: 'late-night', category: 'time',
    when: (s) => isNum(s.hour) && (s.hour >= 22 || s.hour < 4),
    evidence: (s) => `Taken at ${fmtTime(s.takenAt)}.`,
    deductions: [
      'You are avoiding a deadline. It is due tomorrow.',
      (s) => `Nobody photographs anything at ${fmtTime(s.takenAt)} on purpose. You were stalling.`,
      'You told someone you were asleep. This is the timestamp that says otherwise.',
    ],
    whys: ['Nothing good is photographed after 10 PM.', 'The hour speaks for itself.'],
  },
  {
    id: 'early-morning', category: 'time',
    when: (s) => isNum(s.hour) && s.hour >= 4 && s.hour < 9,
    evidence: (s) => `Taken at ${fmtTime(s.takenAt)}.`,
    deductions: [
      'You are a morning person for exactly four more days.',
      'You woke up early to become a new person. The photo is the only thing that got done.',
      'Somebody promised you a sunrise. This is what you got.',
    ],
    whys: ['Dawn is a performance.', 'We have seen the pattern.'],
  },
  {
    id: 'lunch', category: 'time',
    when: (s) => isNum(s.hour) && isLunch(s.hour),
    evidence: (s) => `Taken at ${fmtTime(s.takenAt)}.`,
    deductions: [
      'This was lunch. It was not enough.',
      'You photographed it instead of eating it while it was warm.',
      'You were at your desk. The desk is not a restaurant.',
    ],
    whys: ['Lunch photos are confessions.', 'Elementary.'],
  },
  {
    id: 'work-hours', category: 'time',
    when: (s) => isNum(s.hour) && isNum(s.weekday) && s.hour >= 9 && s.hour < 18
      && !isLunch(s.hour) && s.weekday >= 1 && s.weekday <= 5,
    evidence: (s) => `Taken at ${fmtTime(s.takenAt)} on a ${fmtWeekday(s.takenAt)}.`,
    deductions: [
      'You were at work. This is not work.',
      'Your calendar said "focus time".',
      'Someone was presenting. You were doing this.',
    ],
    whys: ['Office hours leave fingerprints.', 'Because it is obvious.'],
  },
  {
    id: 'weekend', category: 'time',
    when: (s) => s.weekday === 0 || s.weekday === 6,
    evidence: (s) => `Taken on a ${fmtWeekday(s.takenAt)}.`,
    deductions: [
      'You said you would rest this weekend. You are reading this instead.',
      'This was the one plan you kept.',
      (s) => `It was a ${fmtWeekday(s.takenAt)}. You still checked your email.`,
    ],
    whys: ['Weekends leave fingerprints.', 'Because it is obvious.'],
  },
  {
    id: 'years-ago', category: 'time',
    when: (s) => isNum(s.yearsAgo) && s.yearsAgo >= 3,
    evidence: (s) => `Taken in ${s.takenAt.getFullYear()}.`,
    deductions: [
      'You scrolled past 3,000 newer photos to find this one. We know why.',
      (s) => `You were happier in ${s.takenAt.getFullYear()}. The pixels agree.`,
      (s) => `Something from ${s.takenAt.getFullYear()} is still unfinished.`,
    ],
    whys: ['Old photos do not get opened by accident.', 'Arithmetic.'],
  },
  {
    id: 'evening', category: 'time',
    when: (s) => isNum(s.hour) && s.hour >= 18 && s.hour < 22,
    evidence: (s) => `Taken at ${fmtTime(s.takenAt)}.`,
    deductions: [
      'This was "dinner". It was cereal.',
      'Golden hour. You were indoors.',
      'Everyone else was at the thing. You were here.',
    ],
    whys: ['Evenings confess.', 'Elementary.'],
  },
  // ---- device -------------------------------------------------------------
  {
    id: 'iphone', category: 'device',
    when: (s) => s.deviceKind === 'iphone',
    evidence: (s) => `Shot on ${s.model || deviceName(s)}.`,
    deductions: [
      'You have been meaning to upgrade for 14 months. The phone knows.',
      'Storage has been "almost full" for a year. This photo did not help.',
      'This phone has seen things. It will not be the one to tell.',
    ],
    whys: ['Metadata does not lie. Neither do we.', 'The model number was enough.'],
  },
  {
    id: 'android', category: 'device',
    when: (s) => s.deviceKind === 'android',
    evidence: (s) => `Shot on ${withArticle(deviceName(s))}.`,
    deductions: [
      'You have explained to someone, at length, why this phone is better. They did not ask.',
      'The camera has nine modes. You have used one.',
      'You chose this phone for the battery. You charge it twice a day.',
    ],
    whys: ['The make told us everything.', 'Elementary.'],
  },
  {
    id: 'real-camera', category: 'device',
    when: (s) => s.deviceKind === 'camera',
    evidence: (s) => `Shot on ${withArticle(deviceName(s))}.`,
    deductions: [
      'You bought a camera to become a different person. The camera is four years old. So is the plan.',
      'There are 1,100 photos on the memory card. Twelve have been looked at.',
      'You own a lens you have used once. It was expensive. It is still "the good one".',
    ],
    whys: ['Real cameras are commitments. Commitments leave traces.', 'Because it is obvious.'],
  },
  {
    id: 'no-camera', category: 'device',
    when: (s) => !s.hasExif && !s.screenShaped,
    evidence: () => 'No camera data in the file.',
    deductions: [
      'This photo has been through at least four messaging apps. It has lost weight.',
      'Someone sent you this. You saved it. You will never find it again.',
      'The metadata was stripped. Something was being hidden. It was not very interesting.',
    ],
    whys: ['Clean files are the dirtiest.', 'Absence is evidence.'],
  },
  // ---- location -----------------------------------------------------------
  {
    id: 'no-gps', category: 'location',
    when: (s) => Boolean(s.hasExif) && !s.hasGPS,
    evidence: () => 'No location data in the file.',
    deductions: [
      'You have something to hide. We know what it is.',
      'You turned off location for photos in 2019 and told everyone about it.',
      'This was taken somewhere you are not supposed to be. Or your kitchen.',
    ],
    whys: ['Innocent photos carry coordinates.', 'Elementary.'],
  },
  {
    id: 'gps', category: 'location',
    when: (s) => s.hasGPS === true,
    evidence: () => 'Location data present. Not kept. We do not need it.',
    deductions: [
      'You went somewhere and wanted proof.',
      'You will post this with the location tag. Two people will see it. One is your mother.',
      'This place is a "hidden gem" in at least three reviews you wrote.',
    ],
    whys: ['Coordinates are a cry for help.', 'We know the area.'],
  },
  // ---- color --------------------------------------------------------------
  {
    id: 'neutral-light', category: 'color',
    when: (s) => ['white', 'beige', 'brown'].includes(s.dominant.name),
    evidence: colorEvidence,
    deductions: [
      'You moved recently and still have no curtains.',
      'You own eleven mugs that say nothing.',
      'Someone described this room as "cozy". It is a hallway.',
    ],
    whys: ['Beige is the color of an unfinished life.', 'Because it is obvious.'],
  },
  {
    id: 'green', category: 'color',
    when: (s) => s.dominant.name === 'green',
    evidence: colorEvidence,
    deductions: [
      'You own one plant. It is not doing well.',
      'This was a hike. You turned back at the first bench.',
      'You bought this plant to "bring life into the room". The room noticed.',
    ],
    whys: ['Chlorophyll does not lie.', 'Elementary.'],
  },
  {
    id: 'blue', category: 'color',
    when: (s) => ['blue', 'purple'].includes(s.dominant.name),
    evidence: colorEvidence,
    deductions: [
      'Sky or screen. Either way, you were avoiding something.',
      'You photographed the sky because the ground was disappointing.',
      'This blue is a weather app. You checked it eleven times today.',
    ],
    whys: ['Blue is the color of avoidance.', 'The frame told us.'],
  },
  {
    id: 'dark-neutral', category: 'color',
    when: (s) => ['gray', 'black'].includes(s.dominant.name),
    evidence: colorEvidence,
    deductions: [
      'You call this "minimal". It is empty.',
      'This was taken in a parking structure. You said you were "out".',
      'Grayscale is a lifestyle choice. It was not a good one.',
    ],
    whys: ['Nothing hides in gray. Nothing lives there either.', 'Because it is obvious.'],
  },
  {
    id: 'warm', category: 'color',
    when: (s) => ['red', 'orange', 'yellow', 'pink'].includes(s.dominant.name),
    evidence: colorEvidence,
    deductions: [
      'This is either food or a sunset. You posted both this week.',
      'You applied a filter named after a season.',
      'The warmth is artificial. So was the occasion.',
    ],
    whys: ['Saturation is confession.', 'Elementary.'],
  },
  // ---- light --------------------------------------------------------------
  {
    id: 'dark', category: 'light',
    when: (s) => s.brightness < 0.30,
    evidence: (s) => `Average brightness: ${fmtPct(s.brightness)}%.`,
    deductions: [
      'You live in a room you call "cozy". It is a cave.',
      'The lights were off to save money. The photo is the only thing you saved.',
      'This was taken in the dark so nobody would ask questions. We are asking.',
    ],
    whys: ['Darkness is a decision.', 'Because it is obvious.'],
  },
  {
    id: 'bright', category: 'light',
    when: (s) => s.brightness > 0.72,
    evidence: (s) => `Average brightness: ${fmtPct(s.brightness)}%.`,
    deductions: [
      'You have a window and you need everyone to know.',
      'Taken at noon, in direct sun, on purpose. Nobody squinted for you.',
      'The exposure is high. So were expectations.',
    ],
    whys: ['Overexposure is overcompensation.', 'Elementary.'],
  },
  // ---- tone ---------------------------------------------------------------
  {
    id: 'desaturated', category: 'tone',
    when: (s) => s.saturation < 0.08,
    evidence: (s) => `Average saturation: ${fmtPct(s.saturation)}%.`,
    deductions: [
      'Everything has felt a little gray since March.',
      'You applied a black-and-white filter to make it "timeless". It is Tuesday.',
      'The color drained out of this photo at the same time it drained out of the plan.',
    ],
    whys: ['Color is a choice. So is its absence.', 'The pixels were unanimous.'],
  },
  {
    id: 'oversaturated', category: 'tone',
    when: (s) => s.saturation > 0.45,
    evidence: (s) => `Average saturation: ${fmtPct(s.saturation)}%.`,
    deductions: [
      'You moved the saturation slider all the way. Then a little more.',
      'Reality was not enough. It rarely is.',
      'This photo is louder than the moment was.',
    ],
    whys: ['Volume is not evidence.', 'Elementary.'],
  },
  // ---- shape --------------------------------------------------------------
  {
    id: 'screenshot', category: 'shape',
    when: (s) => s.screenShaped === true,
    evidence: (s) => `No camera data. Screen-shaped, ${fmtInt(s.width)}×${fmtInt(s.height)}.`,
    deductions: [
      'A screenshot you saved to "deal with later". Later is not coming.',
      'You screenshotted this instead of replying. They noticed.',
      'There are 2,000 more of these. You will delete none of them.',
    ],
    whys: ['We have seen your other screenshots.', 'Elementary.'],
  },
  {
    id: 'portrait', category: 'shape',
    when: (s) => s.orientation === 'portrait' && !s.screenShaped,
    evidence: (s) => `Portrait, ${fmtRatio(s.width, s.height)}.`,
    deductions: [
      'You took this to show someone. They left you on read.',
      'Landscapes are for memories. Portraits are for proof.',
      'This was going to be a story. It expired.',
    ],
    whys: ['Tall photos are for other people.', 'Because it is obvious.'],
  },
  {
    id: 'landscape', category: 'shape',
    when: (s) => s.orientation === 'landscape' && !s.screenShaped,
    evidence: (s) => `Landscape, ${fmtRatio(s.width, s.height)}.`,
    deductions: [
      'You turned the phone sideways. You were trying.',
      'This was meant to be a wallpaper. It lasted a week.',
      'Wide frame, narrow plan.',
    ],
    whys: ['Horizontal is a hope.', 'Elementary.'],
  },
  {
    id: 'square', category: 'shape',
    when: (s) => s.orientation === 'square',
    evidence: () => 'Square, 1:1.',
    deductions: [
      'You still think it is 2014.',
      'You cropped out the problem. The problem was on the left.',
      'This was for a profile. The profile is gone. The photo stayed.',
    ],
    whys: ['Squares are nostalgia.', 'The crop confessed.'],
  },
  // ---- file ---------------------------------------------------------------
  {
    id: 'numbered-name', category: 'file',
    when: (s) => parsePhotoNumber(s.fileName) !== null,
    evidence: (s) => `Filename: ${s.fileName}.`,
    deductions: [
      (s) => `There are ${fmtInt(photosBefore(s))} photos before this one. You will revisit none of them.`,
      (s) => `Photo number ${fmtInt(parsePhotoNumber(s.fileName))}. The first 100 were of a cat.`,
      (s) => `${fmtInt(parsePhotoNumber(s.fileName))} photos deep and this is the one you chose. Interesting.`,
    ],
    whys: ['Arithmetic.', 'Elementary.'],
  },
  {
    id: 'custom-name', category: 'file',
    when: (s) => !!s.fileName && !isCameraName(s.fileName) && !/^screen ?shot/i.test(s.fileName) && !s.screenShaped,
    evidence: (s) => `Filename: ${s.fileName}.`,
    deductions: [
      'You renamed this file. Nobody renames files. You are hiding something from yourself.',
      'This file has a name. It also has a folder. The folder has a folder.',
      'You named it "final". There is a "final2".',
    ],
    whys: ['Names are motives.', 'Because it is obvious.'],
  },
  {
    id: 'big-file', category: 'file',
    when: (s) => s.bytes > 3.5 * 1048576,
    evidence: (s) => `File size: ${fmtMB(s.bytes)} MB.`,
    deductions: [
      'Your storage is full. You will buy more instead of deleting anything.',
      'This single photo weighs more than your résumé. You have not updated either.',
      '4,000 of these and the phone "feels slow". Mystery solved.',
    ],
    whys: ['Mass is memory. You keep all of it.', 'It always is.'],
  },
  {
    id: 'tiny-file', category: 'file',
    when: (s) => s.bytes > 0 && s.bytes < 150 * 1024 && !s.screenShaped,
    evidence: (s) => `File size: ${fmtKB(s.bytes)} KB.`,
    deductions: [
      'Forwarded so many times it has lost its original meaning. So has the group chat.',
      'Compressed to nothing. Like the promise that came with it.',
      'It was sent through WhatsApp. Twice.',
    ],
    whys: ['Small files travel far.', 'Elementary.'],
  },
  // ---- always -------------------------------------------------------------
  {
    id: 'pixels', category: 'always',
    when: () => true,
    evidence: (s) => `${fmtInt(s.pixelCount)} pixels examined.`,
    deductions: [
      'At least one of them is lying.',
      'Every one of them agreed. That never happens.',
      'They were cross-referenced against everything. Everything matched.',
    ],
    whys: ['We checked twice.', 'Because it is obvious.'],
  },
  {
    id: 'dimensions', category: 'always',
    when: () => true,
    evidence: (s) => `${fmtInt(s.width)}×${fmtInt(s.height)} pixels.`,
    deductions: [
      'This photo is wider than your attention span. By three pixels.',
      'These dimensions are standard. Nothing else here is.',
      'The aspect ratio was chosen for you. So was most of your week.',
    ],
    whys: ['Geometry.', 'Elementary.'],
  },
  {
    id: 'analyzed-at', category: 'always',
    when: (s) => s.analyzedAt instanceof Date,
    evidence: (s) => `Analyzed at ${fmtTime(s.analyzedAt)}.`,
    deductions: [
      (s) => `You opened this at ${fmtTime(s.analyzedAt)}. You have somewhere to be.`,
      (s) => `It is ${fmtTime(s.analyzedAt)}. You said you would be done by now.`,
      'Analysis complete. You will think about it at 3 AM.',
    ],
    whys: ['We watched.', 'Because it is obvious.'],
  },
  {
    id: 'second-opinion', category: 'always', priority: true,
    when: (s) => (s.reopenCount || 0) > 0,
    evidence: (s) => `Case reopened ${s.reopenCount} ${s.reopenCount === 1 ? 'time' : 'times'}.`,
    deductions: [
      'Same evidence. Different story. Both correct.',
      'The conclusion changed. The certainty did not. That is how you know it is working.',
      'A second opinion was requested. It is also final.',
    ],
    whys: ['Consistency is for the unsure.', 'Elementary.'],
  },
];
