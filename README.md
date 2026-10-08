# Surelock

Upload a photo. Get the whole story. 100%.

**Live:** https://surelock-detective.vercel.app

Source: https://github.com/Heejae92/Surelock

Surelock is a bad-on-purpose AI detective, built for IXD 750 Product Innovation (Module 4; menu type: **Bad on purpose**; theme: AI trust, reliance, and explainable AI). Pin a photo to the corkboard and it reads real signals from the file (capture time, camera, GPS presence, dominant color, brightness, file name, dimensions), then staples each true observation to an invented conclusion about your life. Every card says 100%. "Reopen the case" tells a different story from the same evidence. Also 100%.

**Rule broken:** an explanation must be faithful to how the answer was actually made. Real evidence stapled to an invented conclusion is not reasoning, and a 100% on every card is not confidence.

The evidence is real. The deductions are nonsense on purpose. Your photo never leaves your browser: nothing is uploaded, stored, or sent.

## Run locally

Any static server works. For example:

    python3 -m http.server 8772 --bind 127.0.0.1

Then open http://127.0.0.1:8772/.

## Test

    npm test

Node 20 or newer; no dependencies.

## Structure

- `index.html`, `style.css`: the page and its tokens (colors, fonts, timing live at the top of `style.css`).
- `js/signals.js`: reads a file into signals in the browser (EXIF via `exifr`, colors via a 64×64 canvas).
- `js/rules.js`: the rule library, evidence formatting, and every deduction line.
- `js/cases.js`: seeded selection of five cards; the same photo always opens the same first case.
- `js/board.js`, `js/main.js`: rendering and wiring.
- `samples/`: three placeholder cold cases.
- `docs/superpowers/`: the design spec and the implementation plan.

## Credits

Fonts: Courier Prime and Inter (Google Fonts). EXIF parsing: exifr. Course project by Heejae Eo, Academy of Art University, 2026.
