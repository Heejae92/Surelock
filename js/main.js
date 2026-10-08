// Wiring: input, drag and drop, samples, reopen, new photo. State lives here; rendering lives in board.js.
import { readSignals, signalsForSample } from './signals.js';
import { hashSignals, buildCase } from './cases.js';
import { fmtInt } from './rules.js';
import { createBoard } from './board.js';

const board = createBoard(document.getElementById('board'));
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const strip = document.getElementById('samples-strip');

const state = { signals: null, seed: 0, reopenCount: 0, photoURL: null, busy: false };

function logLines(signals) {
  return [
    `Reading ${fmtInt(signals.pixelCount)} pixels…`,
    'Cross-referencing metadata…',
    'Eliminating the impossible…',
    'Certain.',
  ];
}

function releasePhoto() {
  if (state.photoURL && state.photoURL.startsWith('blob:')) URL.revokeObjectURL(state.photoURL);
  state.photoURL = null;
}

async function runCase(loadSignals, photoURL, alt) {
  if (state.busy) return;
  state.busy = true;
  try {
    board.reset();
    releasePhoto();
    let signals;
    try {
      signals = await loadSignals();
    } catch (err) {
      if (photoURL.startsWith('blob:')) URL.revokeObjectURL(photoURL);
      board.showError(err && err.code ? err.code : 'undecodable');
      return;
    }
    state.signals = signals;
    state.seed = hashSignals(signals);
    state.reopenCount = 0;
    state.photoURL = photoURL;
    await board.showPhoto(photoURL, alt);
    await board.playScan(logLines(signals));
    const first = buildCase(signals, state.seed, 0);
    await board.showCards(first.cards);
    await board.showStamp(0);
  } finally {
    state.busy = false;
  }
}

function handleFile(file) {
  if (!file || state.busy) return;
  const url = URL.createObjectURL(file);
  runCase(() => readSignals(file), url, file.name);
}

fileInput.addEventListener('change', () => {
  handleFile(fileInput.files[0]);
  fileInput.value = '';
});

for (const type of ['dragenter', 'dragover']) {
  document.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-over');
  });
}
for (const type of ['dragleave', 'drop']) {
  document.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-over');
  });
}
document.addEventListener('drop', (event) => {
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) handleFile(file);
});

document.getElementById('reopen').addEventListener('click', async () => {
  if (state.busy || !state.signals) return;
  state.busy = true;
  try {
    state.reopenCount += 1;
    board.hideStamp();
    await board.flipOutCards();
    const next = buildCase(state.signals, state.seed, state.reopenCount);
    await board.showCards(next.cards);
    await board.showStamp(state.reopenCount);
  } finally {
    state.busy = false;
  }
});

document.getElementById('new-photo').addEventListener('click', () => {
  if (state.busy) return;
  board.reset();
  releasePhoto();
  state.signals = null;
  state.reopenCount = 0;
  fileInput.focus();
});

async function loadSamples() {
  try {
    const response = await fetch('samples/samples.json');
    if (!response.ok) throw new Error('samples unavailable');
    const entries = await response.json();
    entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sample';
      button.style.setProperty('--tilt', `${index % 2 ? 2 : -2}deg`);
      button.setAttribute('aria-label', `Open cold case: ${entry.alt || entry.fileName}`);
      const img = document.createElement('img');
      img.src = entry.src;
      img.alt = '';
      img.loading = 'lazy';
      button.appendChild(img);
      button.addEventListener('click', () => runCase(() => signalsForSample(entry), entry.src, entry.alt));
      strip.appendChild(button);
    });
  } catch {
    strip.replaceChildren();
    document.getElementById('samples').hidden = true;
  }
}

loadSamples();
