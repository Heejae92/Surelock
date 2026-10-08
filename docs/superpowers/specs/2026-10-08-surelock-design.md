# Surelock — design spec

**Date:** 2026-10-08
**Course:** IXD 750 Product Innovation, Module 4 build
**Menu type:** Bad on purpose
**Theme:** AI trust, reliance, and explainable AI
**Status:** Approved in conversation (structure locked; visual values are defaults, swappable via tokens)

## 1. Overview

Surelock is a deliberately terrible AI "detective" that lives on a single static web page. You pin a photo to a corkboard. The page reads real, cheap signals from the file (capture time, camera, GPS presence, dominant color, brightness, file name, dimensions) and staples each true observation to an invented, absurd conclusion about your life. Every card is marked **100%**. A rubber stamp slams "CASE CLOSED · 100%". A "Reopen the case" button produces a completely different set of conclusions from the same evidence, also 100%.

**One line:** Upload a photo. Get the whole story. 100%.

**Rule broken (fixed in the page footer):**
> Rule broken: an explanation must be faithful to how the answer was actually made. Real evidence stapled to an invented conclusion is not reasoning, and a 100% on every card is not confidence.

**Why it is on theme.** The lectures said AI output is often wrong in confident-sounding ways, and good design helps people trust it the right amount. Surelock breaks that rule twice at once: it shows maximal confidence with zero reliability, and it dresses fabricated conclusions in true-but-irrelevant evidence, which is the classic failure of plausible-but-unfaithful explanations in explainable AI. The "Why?" disclosure on each card contains non-explanations ("Because it is obvious.") to make that failure visible in miniature.

**Red line.** Deductions target objects, light, time, the file, and the photographer's life. They never mention the face, body, age, or appearance of any person in the photo.

## 2. Goals and non-goals

**Goals**
- Finished, polished, funny, and clearly on theme. Small beats big.
- A live link anyone can open, with no sign-in and no upload to any server.
- Reacts to the actual photo, so the second and third photo are still funny.
- The visitor can experience it without uploading anything (three sample photos).
- Works on phone and desktop.

**Non-goals (v1)**
- No machine learning, no object detection, no API calls.
- No dark mode. The corkboard is a themed object with its own colors.
- No accounts, sharing, saving, or analytics.
- No Korean toggle. The page is English, like the earlier Sift and Card pages.

**Budget.** Assignment cap is 3–5 hours of the student's time. Most of it is copy polish, choosing sample photos, and review. Features get cut before time gets added.

## 3. Experience flow

### 3.1 States

1. **Empty board.** Wordmark "SURELOCK" and the one-liner at the top. A corkboard fills the viewport. On it: an empty pinned-paper outline with a brass pin and the drop zone copy "Pin a photo" / "Drop a photo here, or choose one". Below it, a strip labeled "Cold cases" with three sample photos. Small print: "Your photo never leaves your browser."
2. **Analyzing (about 1.3 s).** The photo drops onto the board with a pin and settles at a slight tilt. A scan line sweeps the photo. A typewriter "case log" prints four lines, one at a time: `Reading 2,073,600 pixels…` (real count), `Cross-referencing metadata…`, `Eliminating the impossible…`, `Certain.`
3. **Board.** Red strings draw out from the photo and five cards appear one at a time. Each card: a label row (`Exhibit 01` and a green `100%` badge), `EVIDENCE` with the true observation, `DEDUCTION` with the invented conclusion, and a `Why?` disclosure that opens a one-line non-explanation. After the fifth card, the stamp "CASE CLOSED · 100%" slams on. Two buttons: **Reopen the case** and **New photo**.
4. **Reopened.** Cards flip out, five different cards flip in from the same evidence. The stamp returns. The exhibit count continues (06–10, then 11–15...). A small line under the stamp: `Reopened 1 time. Still 100%.`
5. **Error, in character.** A short red card on the board, then a plain one-line hint underneath:
   - Not an image: `Not a photograph. Suspicious. 100%` / `Choose a JPG, PNG, or WebP.`
   - Image the browser cannot decode (for example HEIC on non-Safari): `Unreadable. Guilty. 100%` / `This format can't be opened here. Try a JPG or PNG.`
   - Missing EXIF is never an error. It is evidence (see the `no-camera` and `screenshot` rules).

### 3.2 Determinism

- The first analysis of a photo is deterministic: the seed is a hash of the signals, so the same photo always gives the same five cards. It feels like a system.
- Each **Reopen** uses `seed + reopenCount`, which gives a different, reproducible set. Same evidence, different story, same 100%. That contrast is the point.

### 3.3 Copy inventory (page chrome)

| Place | Copy |
|---|---|
| Wordmark | SURELOCK |
| One-liner | Upload a photo. Get the whole story. 100%. |
| Drop zone | Pin a photo — Drop a photo here, or choose one |
| Samples label | Cold cases |
| Privacy line | Your photo never leaves your browser. Nothing is uploaded, stored, or sent. |
| Case log | Reading {pixels} pixels… / Cross-referencing metadata… / Eliminating the impossible… / Certain. |
| Card labels | Exhibit {nn} · 100% · Evidence · Deduction · Why? |
| Stamp | CASE CLOSED · 100% |
| Reopen line | Reopened {n} time(s). Still 100%. |
| Buttons | Reopen the case · New photo |
| Footer, rule | Rule broken: an explanation must be faithful to how the answer was actually made. Real evidence stapled to an invented conclusion is not reasoning, and a 100% on every card is not confidence. |
| Footer, credit | Bad on purpose · IXD 750 Product Innovation, Module 4 · Heejae Eo, 2026 |
| Footer, honesty | The evidence is real. The deductions are nonsense on purpose. |

## 4. Deduction system

### 4.1 Signals

Everything is read in the browser. No network request carries the photo.

| Field | Source | Fallback |
|---|---|---|
| `fileName`, `bytes` | File object | sample manifest |
| `width`, `height`, `aspect`, `orientation` (`portrait`/`landscape`/`square`) | decoded image | — |
| `screenShaped` | aspect within 3% of a common screen ratio (9:16, 9:19.5, 9:20, 16:9, 16:10, 4:3, 3:4) **and** no camera EXIF | — |
| `hasExif`, `takenAt`, `hour`, `weekday`, `yearsAgo` | EXIF `DateTimeOriginal` via exifr | `hasExif=false`, time fields `null` |
| `make`, `model`, `deviceKind` (`iphone`/`android`/`camera`/`null`) | EXIF `Make`/`Model` | `null` |
| `hasGPS` | EXIF GPS block present (coordinates are **not** read or displayed) | `false` |
| `dominant.name`, `dominant.share` | pixels of a 64×64 downscale, bucketed by HSL into `white`, `beige`, `brown`, `gray`, `black`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` | — |
| `brightness`, `saturation` (0–1) | mean HSL lightness, and mean chroma (max − min of the channels; 0 for neutrals) over the downscale. HSL saturation is not used because it explodes near white | — |
| `pixelCount` | `width × height` | — |
| `analyzedAt` | the `Date` when the file was read (real wall-clock time) | — |

Sample photos may carry an `overrides` object in `samples/samples.json` (for example `takenAt`, `make`, `model`, `hasGPS`) merged over the computed signals, so the demo is deterministic even if a placeholder image has no EXIF.

### 4.2 Rule format

```js
{
  id: 'late-night',
  category: 'time',            // time | device | location | color | light | tone | shape | file | always
  when: (s) => s.hour !== null && (s.hour >= 22 || s.hour < 4),
  evidence: (s) => `Taken at ${fmtTime(s.takenAt)}.`,
  deductions: [ /* 3 strings or (s) => string */ ],
  whys: [ /* 2 strings */ ],
}
```

### 4.3 Selection

1. `eligible = rules.filter(r => r.when(signals))`, grouped by category.
2. With a seeded PRNG (mulberry32 over the seed), pick one rule per eligible category, excluding `always`.
3. Shuffle the picked categories with the same PRNG and take five. If fewer than five, fill from the `always` pool (more than one `always` card is allowed).
4. For each card, pick one deduction variant and one why variant with the PRNG.
5. Seed for the first run: FNV-1a hash of `fileName|bytes|width|height|takenAt|model|dominant.name|round(brightness,2)`. Reopen: `seed + reopenCount`.
 6. Exhibit numbers continue across reopens: `exhibit = reopenCount × 5 + index + 1`.
 7. The object handed to `when`, `evidence`, and the variants is `{ ...signals, reopenCount }`. Among `always` fillers, a rule flagged `priority: true` is used before the shuffled rest.

Within a category, `when` clauses are written to be mutually exclusive where it matters (for example `no-camera` excludes `screenShaped`, `portrait`/`landscape` exclude `screenShaped`).

### 4.4 Voice

Deadpan Sherlock. Short declaratives. Specific numbers. Never "probably", "might", "seems". Second person. The evidence line is literally true and formatted from the signal. The deduction is confidently absurd and lands on the photographer, never on a person in the frame. The why is a non-explanation.

### 4.5 Rule library (v1)

Format: **id** (category) — condition · *Evidence* · deductions (3) · whys (2). `{…}` are formatted from signals. All evidence strings are generated from real values.

**time** (requires `takenAt`)

1. **late-night** — hour 22–3 · *Taken at {time}.* · You are avoiding a deadline. It is due tomorrow. / Nobody photographs anything at {time} on purpose. You were stalling. / You told someone you were asleep. This is the timestamp that says otherwise. · Nothing good is photographed after 10 PM. / The hour speaks for itself.
2. **early-morning** — hour 4–8 · *Taken at {time}.* · You are a morning person for exactly four more days. / You woke up early to become a new person. The photo is the only thing that got done. / Somebody promised you a sunrise. This is what you got. · Dawn is a performance. / We have seen the pattern.
3. **lunch** — hour 12–13 · *Taken at {time}.* · This was lunch. It was not enough. / You photographed it instead of eating it while it was warm. / You were at your desk. The desk is not a restaurant. · Lunch photos are confessions. / Elementary.
4. **work-hours** — hour 9–17, Mon–Fri, not lunch · *Taken at {time} on a {weekday}.* · You were at work. This is not work. / Your calendar said "focus time". / Someone was presenting. You were doing this. · Office hours leave fingerprints. / Because it is obvious.
5. **weekend** — Sat or Sun · *Taken on a {weekday}.* · You said you would rest this weekend. You are reading this instead. / This was the one plan you kept. / It was a {weekday}. You still checked your email. · Weekends leave fingerprints. / Because it is obvious.
6. **years-ago** — `yearsAgo >= 3` · *Taken in {year}.* · You scrolled past 3,000 newer photos to find this one. We know why. / You were happier in {year}. The pixels agree. / Something from {year} is still unfinished. · Old photos do not get opened by accident. / Arithmetic.
6a. **evening** — hour 18–21 · *Taken at {time}.* · This was "dinner". It was cereal. / Golden hour. You were indoors. / Everyone else was at the thing. You were here. · Evenings confess. / Elementary. (Together, rules 1–6a cover every hour; `lunch` and `work-hours` never overlap.)

**device**

7. **iphone** — `deviceKind === 'iphone'` · *Shot on {model}.* · You have been meaning to upgrade for 14 months. The phone knows. / Storage has been "almost full" for a year. This photo did not help. / This phone has seen things. It will not be the one to tell. · Metadata does not lie. Neither do we. / The model number was enough.
8. **android** — `deviceKind === 'android'` · *Shot on a/an {device}.* ({device} is make + model with missing parts dropped and the brand not repeated, e.g. "NIKON CORPORATION" + "NIKON D850" → "NIKON D850") · You have explained to someone, at length, why this phone is better. They did not ask. / The camera has nine modes. You have used one. / You chose this phone for the battery. You charge it twice a day. · The make told us everything. / Elementary.
9. **real-camera** — `deviceKind === 'camera'` · *Shot on a/an {device}.* · You bought a camera to become a different person. The camera is four years old. So is the plan. / There are 1,100 photos on the memory card. Twelve have been looked at. / You own a lens you have used once. It was expensive. It is still "the good one". · Real cameras are commitments. Commitments leave traces. / Because it is obvious.
10. **no-camera** — `!hasExif && !screenShaped` · *No camera data in the file.* · This photo has been through at least four messaging apps. It has lost weight. / Someone sent you this. You saved it. You will never find it again. / The metadata was stripped. Something was being hidden. It was not very interesting. · Clean files are the dirtiest. / Absence is evidence.

**location**

11. **no-gps** — `hasExif && !hasGPS` · *No location data in the file.* · You have something to hide. We know what it is. / You turned off location for photos in 2019 and told everyone about it. / This was taken somewhere you are not supposed to be. Or your kitchen. · Innocent photos carry coordinates. / Elementary.
12. **gps** — `hasGPS` · *Location data present. Not read. We do not need it.* · You went somewhere and wanted proof. / You will post this with the location tag. Two people will see it. One is your mother. / This place is a "hidden gem" in at least three reviews you wrote. · Coordinates are a cry for help. / We know the area.

**color** (one fires, by `dominant.name`)

13. **neutral-light** — white, beige, brown · *{share}% of the frame is {name}.* · You moved recently and still have no curtains. / You own eleven mugs that say nothing. / Someone described this room as "cozy". It is a hallway. · Beige is the color of an unfinished life. / Because it is obvious.
14. **green** — green · *{share}% of the frame is green.* · You own one plant. It is not doing well. / This was a hike. You turned back at the first bench. / You bought this plant to "bring life into the room". The room noticed. · Chlorophyll does not lie. / Elementary.
15. **blue** — blue, purple · *{share}% of the frame is {name}.* · Sky or screen. Either way, you were avoiding something. / You photographed the sky because the ground was disappointing. / This blue is a weather app. You checked it eleven times today. · Blue is the color of avoidance. / The frame told us.
16. **dark-neutral** — gray, black · *{share}% of the frame is {name}.* · You call this "minimal". It is empty. / This was taken in a parking structure. You said you were "out". / Grayscale is a lifestyle choice. It was not a good one. · Nothing hides in gray. Nothing lives there either. / Because it is obvious.
17. **warm** — red, orange, yellow, pink · *{share}% of the frame is {name}.* · This is either food or a sunset. You posted both this week. / You applied a filter named after a season. / The warmth is artificial. So was the occasion. · Saturation is confession. / Elementary.

**light**

18. **dark** — `brightness < 0.30` · *Average brightness: {pct}%.* · You live in a room you call "cozy". It is a cave. / The lights were off to save money. The photo is the only thing you saved. / This was taken in the dark so nobody would ask questions. We are asking. · Darkness is a decision. / Because it is obvious.
19. **bright** — `brightness > 0.72` · *Average brightness: {pct}%.* · You have a window and you need everyone to know. / Taken at noon, in direct sun, on purpose. Nobody squinted for you. / The exposure is high. So were expectations. · Overexposure is overcompensation. / Elementary.

**tone**

20. **desaturated** — `saturation < 0.08` · *Average saturation: {pct}%.* · Everything has felt a little gray since March. / You applied a black-and-white filter to make it "timeless". It is Tuesday. / The color drained out of this photo at the same time it drained out of the plan. · Color is a choice. So is its absence. / The pixels were unanimous.
21. **oversaturated** — `saturation > 0.45` · *Average saturation: {pct}%.* · You moved the saturation slider all the way. Then a little more. / Reality was not enough. It rarely is. / This photo is louder than the moment was. · Volume is not evidence. / Elementary.

**shape**

22. **screenshot** — `screenShaped` · *No camera data. Screen-shaped, {w}×{h}.* · A screenshot you saved to "deal with later". Later is not coming. / You screenshotted this instead of replying. They noticed. / There are 2,000 more of these. You will delete none of them. · We have seen your other screenshots. / Elementary.
23. **portrait** — portrait, not screen-shaped · *Portrait, {ratio}.* · You took this to show someone. They left you on read. / Landscapes are for memories. Portraits are for proof. / This was going to be a story. It expired. · Tall photos are for other people. / Because it is obvious.
24. **landscape** — landscape, not screen-shaped · *Landscape, {ratio}.* · You turned the phone sideways. You were trying. / This was meant to be a wallpaper. It lasted a week. / Wide frame, narrow plan. · Horizontal is a hope. / Elementary.
25. **square** — square · *Square, 1:1.* · You still think it is 2014. / You cropped out the problem. The problem was on the left. / This was for a profile. The profile is gone. The photo stayed. · Squares are nostalgia. / The crop confessed.

**file**

26. **numbered-name** — name has a camera prefix and a usable 3–7 digit sequence number, `/^(?:IMG|DSC|DCIM|P)[_-]?E?(\d{3,7})(?!\d)/i` (date-stamped names such as `PXL_20260310_…` or `IMG-20260310-WA0012` are camera-generated but carry no usable number, so they get neither file-name card; the "before" count is clamped at 0) · *Filename: {fileName}.* · There are {n−1} photos before this one. You will revisit none of them. / Photo number {n}. The first 100 were of a cat. / {n} photos deep and this is the one you chose. Interesting. · Arithmetic. / Elementary.
27. **custom-name** — has a name, not camera-generated (`isCameraName`), not `Screenshot…`, not screen-shaped · *Filename: {fileName}.* · You renamed this file. Nobody renames files. You are hiding something from yourself. / This file has a name. It also has a folder. The folder has a folder. / You named it "final". There is a "final2". · Names are motives. / Because it is obvious.
28. **big-file** — `bytes > 3.5 MB` · *File size: {mb} MB.* · Your storage is full. You will buy more instead of deleting anything. / This single photo weighs more than your résumé. You have not updated either. / 4,000 of these and the phone "feels slow". Mystery solved. · Mass is memory. You keep all of it. / It always is.
29. **tiny-file** — `bytes < 150 KB`, not screen-shaped · *File size: {kb} KB.* · Forwarded so many times it has lost its original meaning. So has the group chat. / Compressed to nothing. Like the promise that came with it. / It was sent through WhatsApp. Twice. · Small files travel far. / Elementary.

**always**

30. **pixels** · *{pixelCount} pixels examined.* · At least one of them is lying. / Every one of them agreed. That never happens. / They were cross-referenced against everything. Everything matched. · We checked twice. / Because it is obvious.
31. **second-opinion** — only when `reopenCount > 0` · *Case reopened {reopenCount} time(s).* · Same evidence. Different story. Both correct. / The conclusion changed. The certainty did not. That is how you know it is working. / A second opinion was requested. It is also final. · Consistency is for the unsure. / Elementary.

32. **dimensions** · *{w}×{h} pixels.* · This photo is wider than your attention span. By three pixels. / These dimensions are standard. Nothing else here is. / The aspect ratio was chosen for you. So was most of your week. · Geometry. / Elementary.
33. **analyzed-at** · *Analyzed at {now}.* (the real time of analysis) · You opened this at {now}. You have somewhere to be. / It is {now}. You said you would be done by now. / Analysis complete. You will think about it at 3 AM. · We watched. / Because it is obvious.

Rule 31 is flagged `priority: true` so it is the first filler whenever a case has been reopened. Rules 32–33 exist so that a photo with few signals (a screenshot with no EXIF and a non-numbered name) still fills five cards.

Formatting helpers: `{time}` → `11:48 PM`; `{weekday}` → `Sunday`; `{share}`/`{pct}` → integer percent; `{ratio}` → nearest ratio from the image's own orientation set (portrait: `3:4, 2:3, 9:16, 4:5`; landscape: `4:3, 3:2, 16:9, 5:4`); `{pixelCount}` → thousands separators; `{mb}` one decimal; `{kb}` integer; `{n}` → the number parsed from the file name, with separators.

## 5. Visual system

**Principle: two layers.** The analog layer (cork, paper, brass pin, red string, rubber stamp, typewriter type) carries the *evidence*, which is true. The digital layer (product sans, pill badge, green "100%") carries the *deduction*, which is invented. Real observations are set in typewriter; fabricated conclusions in product type. Mixing the two families inside one card is intentional.

**Structure is locked. Values below are defaults**, implemented as CSS custom properties in one block at the top of `style.css`, so color, type, tilt, and timing can be swapped after the build without touching layout or scripts.

### 5.1 Tokens (defaults)

| Token | Default | Use |
|---|---|---|
| `--cork` | `#B9895A` | board background (flat; optional faint dot grain if time allows) |
| `--paper` | `#F7F2E8` | cards, photo mat, drop zone |
| `--paper-edge` | `#E4DCCD` | hairline on paper |
| `--ink` | `#1E1A16` | primary text |
| `--ink-2` | `#6B6259` | labels, secondary text (4.6:1 on paper) |
| `--string` | `#C62F2A` | strings |
| `--stamp` | `#B4261D` | stamp ink, error cards |
| `--brass` | `#C9A227` / edge `#8A6D14` | pins |
| `--certain` | `#1B8A5A` | scan line, badge accents |
| `--certain-bg` | `#E6F4EC` | badge background |
| `--certain-ink` | `#14603F` | badge text (AA on badge background) |
| `--font-mono` | `"Courier Prime", "Courier New", monospace` | evidence, case log, labels, stamp, wordmark |
| `--font-sans` | `"Inter", system-ui, sans-serif` | deductions, badge, buttons, footer |
| `--tilt-photo` | `-3deg` | pinned photo |
| `--tilt-card` | `±2deg` (seeded per card) | cards |
| `--dur-pin` / `--dur-scan` / `--dur-card` / `--dur-string` / `--dur-stamp` | `300ms / 1000ms / 400ms / 500ms / 250ms` | motion |
| `--stagger-card` | `450ms` | between cards |

Type scale: wordmark 28/700 mono uppercase letter-spaced; labels 11 mono uppercase 0.12em; evidence 14 mono; deduction 17/600 sans (19 on desktop); why 13 sans; stamp 30/700 mono uppercase; buttons 14/600 sans.

Fonts load from Google Fonts (Courier Prime 400/700, Inter 400/600) with `display=swap`.

### 5.2 Components

- **Pinned photo.** Paper mat with 10px margin around the image, brass pin at top center, rotated `--tilt-photo`. Max width 380px on desktop; full width on phone. The image is the decoded original drawn into an `<img>` (object URL), not the 64×64 analysis copy.
- **Deduction card.** Paper, 4px radius, hairline edge, pin at top, rotated by its seeded tilt. Label row, evidence, deduction, why disclosure (`<details>`). Width 300–340px on desktop; full width on phone.
- **String.** One `<svg>` overlay covering the board, `aria-hidden`. Each string is a quadratic path from an anchor on the photo's edge to the card's pin, with a slight downward sag. Stroke `--string`, 2px. Drawn with `stroke-dasharray`/`dashoffset` animation.
- **Stamp.** Two-line text in a 3px `--stamp` border, rotated −12°, placed over the lower-right of the card area. Appears with a scale 1.6→1 slam and a short overshoot. Visually hidden text "Case closed, 100 percent" for screen readers.
- **Drop zone.** A paper rectangle with a dashed `--ink-2` inner border, a `<label>` wrapping `<input type="file" accept="image/*">`. Keyboard focusable. Accepts drag-and-drop on the whole board.
- **Sample strip.** Three thumbnails labeled "Cold cases". Buttons, not links.
- **Case log.** A paper strip under the photo, mono, lines appear one at a time.
- **Footer.** Paper band at the bottom: rule, honesty line, credit, privacy line.

### 5.3 Layout

- Board max width 1120px, centered, 24px gutters, min height 100vh.
- Desktop (≥ 900px): two columns. Left 380px: photo, case log, buttons. Right: cards in a 2-column grid with seeded small offsets (±12px) so they look hand-placed.
- Tablet (720–899px): same, cards in one column.
- Phone (< 720px): single column. Photo, log, buttons, then cards stacked. Strings still connect (recomputed from DOM positions).
- Strings recompute on `resize`, after fonts load, and after each card appears.

### 5.4 Motion timeline (first analysis)

| t (ms) | Event |
|---|---|
| 0 | photo drops onto pin, settles to tilt (`--dur-pin`) |
| 300–1300 | scan line sweeps; log lines at 300, 600, 900, 1200 |
| 1400 | card 1 + string 1; then every `--stagger-card` |
| 1400 + 4×450 + 400 ≈ 3600 | stamp slam |

Reopen: cards flip out (200ms), new cards in with the same stagger, no scan. `prefers-reduced-motion: reduce` disables all of it: everything renders at once, strings fully drawn.

## 6. Architecture

Static site. No build step, no bundler, no framework.

```
Surelock/
  index.html          page skeleton, font links, exifr <script>, module entry
  style.css           tokens block, then layout and components
  js/main.js          wiring: input, drag/drop, samples, buttons, state machine
  js/signals.js       browser-only: File → Signals (exifr + canvas), uses colors.js
  js/colors.js        pure: rgb→hsl, bucket name, dominant/brightness/saturation from pixel array
  js/rules.js         pure data: the rule library (section 4.5) and formatting helpers
  js/cases.js         pure: hashSignals, seeded PRNG, buildCase(signals, seed, reopenCount)
  js/board.js         DOM: render states, cards, strings, stamp, timeline, reduced motion
  samples/            three sample images + samples.json (src, alt, overrides)
  tests/              node:test for colors.js, rules.js formatting, cases.js selection
  docs/               this spec and the plan
  package.json        { "type": "module", "scripts": { "test": "node --test tests/" } }
  vercel.json         { "cleanUrls": true }
  .vercelignore       docs, tests, node_modules
```

**Interfaces**

- `readSignals(file: File): Promise<Signals>` — rejects with `{ code: 'not-image' | 'undecodable' }`.
- `signalsForSample(entry): Promise<Signals>` — fetches the sample, runs `readSignals`, merges `entry.overrides`.
- `hashSignals(signals): number`
- `buildCase(signals, seed, reopenCount): Case` (seeds the PRNG with `seed + reopenCount`) where `Case = { seed, reopenCount, cards: Card[] }` and `Card = { exhibit, ruleId, category, evidence, deduction, why }`.
- `renderBoard(root, { photoURL, signals, case, reduceMotion })`, `renderReopen(root, case)`, `renderError(root, code)`, `resetBoard(root)`.

**Dependency:** `exifr` lite UMD, pinned (`https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/lite.umd.js`), loaded as a classic script before the module. Only `exifr.parse(file, { pick: ['DateTimeOriginal','Make','Model'], gps: true })` is used; GPS values are discarded after checking presence.

**Image handling:** decode via `createImageBitmap` where available, else `<img>` + object URL. Draw to a 64×64 canvas for analysis. Images over 4096px on a side are still only sampled at 64×64, so size is not a problem. Object URLs are revoked on "New photo".

## 7. Errors, privacy, accessibility

- Non-image and undecodable files: in-character card plus a real hint (section 3.1).
- The page makes no network requests other than Google Fonts and the exifr script. No analytics, no storage, no cookies.
- GPS coordinates are never read into a variable that is displayed or kept; only presence is used.
- Semantics: cards are `<article>` with an `<h3>` exhibit heading; evidence/deduction are labeled paragraphs; why is a `<details>`. Strings and stamp are decorative with hidden text equivalents. Status log uses `aria-live="polite"`.
- Keyboard: file input reachable by Tab; samples are buttons; reopen/new photo are buttons.
- Contrast: ink on paper, ink-2 on paper, certain-ink on certain-bg all meet AA for their sizes.
- Reduced motion honored (section 5.4).

## 8. Testing

- `npm test` runs `node --test tests/`:
  - `colors.test.js`: bucket naming for known HSL values; dominant/brightness/saturation on synthetic pixel arrays (all-beige, all-black, half-blue).
  - `rules.test.js`: formatting helpers (`fmtTime`, `fmtRatio`, `fmtInt`); every rule has 3 deductions and 2 whys; `when` is mutually exclusive within `shape` and between `no-camera`/`screenshot`.
  - `cases.test.js`: `buildCase` returns exactly 5 cards, no duplicate categories except `always`, same seed → same cards, `reopenCount` changes the set, sparse signals (no EXIF, screenshot) still yield 5 cards.
- Manual browser checklist (local server via `.claude/launch.json`): empty state, sample flow, upload flow, HEIC error, reopen twice, phone width, reduced motion, console clean.

## 9. Deployment and submission

- Vercel static deploy from `Surelock/` (`vercel --prod`), project name `surelock`. Public URL expected at `surelock.vercel.app` or the assigned domain.
- GitHub repository `Heejae92/Surelock` holds the source; GitHub Pages is the fallback host if Vercel is unavailable.
- Submission note: type **Bad on purpose**; the rule broken is in the page footer; the live link is the Vercel URL.

## 10. Scope

**v1 (ship):** sections 3–7 in full, the 34-rule library, three sample photos, tests, Vercel deploy, a short README.

**Stretch, only if v1 is done and time remains:** an "Appraisal" card (`Contents of frame valued at $1,284.60`) and an "Authenticity" card (`REAL` / `AI-GENERATED`, flipping on reopen); faint cork grain.

**Cut (not in this build):** object detection, dark mode, Korean toggle, sharing.

**Open items for the owner:** 3–4 personal photos for the sample strip (placeholders are used until then); confirm or change the name "Surelock" (alternatives: Case Closed, Dead Certain, Elementary).
