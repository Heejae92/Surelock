// DOM rendering for the corkboard. No analysis logic here. All user-derived text goes through textContent.

const ERRORS = {
  'not-image': ['Not a photograph. Suspicious. 100%', 'Choose a JPG, PNG, or WebP.'],
  undecodable: ['Unreadable. Guilty. 100%', "This format can't be opened here. Try a JPG or PNG."],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function cardElement(card) {
  const n = card.exhibit;
  const article = el('article', 'card');
  article.style.setProperty('--tilt', `${((n * 7) % 5) - 2}deg`);
  article.style.setProperty('--dx', `${((n * 11) % 21) - 10}px`);
  article.style.setProperty('--dy', `${((n * 13) % 17) - 8}px`);

  const pin = el('span', 'pin');
  pin.setAttribute('aria-hidden', 'true');

  const head = el('div', 'card-head');
  head.append(el('h3', 'exhibit', `Exhibit ${String(n).padStart(2, '0')}`), el('span', 'badge', '100%'));

  const why = el('details', 'why');
  why.append(el('summary', '', 'Why?'), el('p', '', card.why));

  article.append(
    pin,
    head,
    el('p', 'label', 'Evidence'),
    el('p', 'evidence', card.evidence),
    el('p', 'label', 'Deduction'),
    el('p', 'deduction', card.deduction),
    why,
  );
  return article;
}

export function createBoard(root) {
  const q = (id) => root.querySelector(`#${id}`);
  const ui = {
    strings: q('strings'),
    dropzone: q('dropzone'),
    pinned: q('pinned'),
    photo: q('photo'),
    caselog: q('caselog'),
    actions: q('actions'),
    reopened: q('reopened'),
    exhibits: q('exhibits'),
    stamp: q('stamp'),
  };
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (name) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
  const wait = (t) => (reduced() ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, t)));
  const strings = new Map(); // card element → path element

  function anchorOnPhoto(photoRect, target) {
    const cx = photoRect.left + photoRect.width / 2;
    const cy = photoRect.top + photoRect.height / 2;
    const dx = target.x - cx;
    const dy = target.y - cy;
    const sx = dx === 0 ? Infinity : (photoRect.width / 2) / Math.abs(dx);
    const sy = dy === 0 ? Infinity : (photoRect.height / 2) / Math.abs(dy);
    const scale = Math.min(sx, sy);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function pathFor(card) {
    const boardRect = root.getBoundingClientRect();
    const p = ui.photo.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const photoRect = { left: p.left - boardRect.left, top: p.top - boardRect.top, width: p.width, height: p.height };
    const to = { x: c.left + c.width / 2 - boardRect.left, y: c.top - boardRect.top };
    const from = anchorOnPhoto(photoRect, to);
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const sag = Math.hypot(to.x - from.x, to.y - from.y) * 0.12;
    return `M ${from.x} ${from.y} Q ${mx} ${my + sag} ${to.x} ${to.y}`;
  }

  function drawString(card, animate) {
    let path = strings.get(card);
    if (!path) {
      path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'string');
      ui.strings.appendChild(path);
      strings.set(card, path);
    }
    path.setAttribute('d', pathFor(card));
    const length = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = `${length}`;
    if (animate && !reduced()) {
      path.style.strokeDashoffset = `${length}`;
      path.getBoundingClientRect();
      path.style.transition = '';
      path.style.strokeDashoffset = '0';
    } else {
      path.style.strokeDashoffset = '0';
    }
  }

  function redrawStrings() {
    for (const card of strings.keys()) drawString(card, false);
  }

  function clearExhibits() {
    ui.exhibits.replaceChildren();
    ui.strings.replaceChildren();
    strings.clear();
  }

  window.addEventListener('resize', redrawStrings);
  ui.photo.addEventListener('load', redrawStrings);
  ui.exhibits.addEventListener('toggle', redrawStrings, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawStrings);

  return {
    async showPhoto(url, alt) {
      ui.dropzone.hidden = true;
      ui.photo.src = url;
      ui.photo.alt = alt || '';
      ui.pinned.hidden = false;
      ui.pinned.classList.add('is-dropping');
      await wait(ms('--dur-pin'));
      ui.pinned.classList.remove('is-dropping');
    },

    async playScan(lines) {
      ui.caselog.replaceChildren();
      ui.pinned.classList.add('is-scanning');
      for (const line of lines) {
        const item = el('li', '', line);
        ui.caselog.appendChild(item);
        item.getBoundingClientRect();
        item.classList.add('is-visible');
        await wait(ms('--stagger-log'));
      }
      await wait(Math.max(0, ms('--dur-scan') - lines.length * ms('--stagger-log')));
      ui.pinned.classList.remove('is-scanning');
    },

    async showCards(cards) {
      clearExhibits();
      for (const card of cards) {
        const node = cardElement(card);
        ui.exhibits.appendChild(node);
        node.getBoundingClientRect();
        node.classList.add('is-in');
        drawString(node, true);
        await wait(ms('--stagger-card'));
      }
      await wait(ms('--dur-card'));
      redrawStrings();
    },

    async flipOutCards() {
      for (const card of ui.exhibits.querySelectorAll('.card')) card.classList.add('is-out');
      await wait(200);
      clearExhibits();
    },

    async showStamp(reopenCount) {
      ui.stamp.hidden = false;
      ui.stamp.classList.remove('is-slam');
      ui.stamp.getBoundingClientRect();
      ui.stamp.classList.add('is-slam');
      ui.actions.hidden = false;
      ui.reopened.textContent = reopenCount > 0
        ? `Reopened ${reopenCount} ${reopenCount === 1 ? 'time' : 'times'}. Still 100%.`
        : '';
      redrawStrings();
      await wait(ms('--dur-stamp'));
    },

    hideStamp() {
      ui.stamp.hidden = true;
    },

    showError(code) {
      const [headline, hint] = ERRORS[code] || ERRORS.undecodable;
      clearExhibits();
      const article = el('article', 'card card-error is-in');
      article.append(el('p', 'label', 'Verdict'), el('p', 'deduction', headline), el('p', 'hint', hint));
      ui.exhibits.appendChild(article);
    },

    reset() {
      clearExhibits();
      ui.caselog.replaceChildren();
      ui.stamp.hidden = true;
      ui.actions.hidden = true;
      ui.reopened.textContent = '';
      ui.pinned.hidden = true;
      ui.pinned.classList.remove('is-scanning', 'is-dropping');
      ui.photo.removeAttribute('src');
      ui.photo.alt = '';
      ui.dropzone.hidden = false;
    },

    redrawStrings,
  };
}
