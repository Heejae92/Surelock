// Wiring. This version only renders the sample strip; Task 6 replaces it with the full flow.
const strip = document.getElementById('samples-strip');

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
      strip.appendChild(button);
    });
  } catch {
    strip.replaceChildren();
    document.getElementById('samples').hidden = true;
  }
}

loadSamples();
