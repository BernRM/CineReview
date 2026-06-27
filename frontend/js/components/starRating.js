/**
 * Creates a star rating widget (5 stars, half-star steps = scale 1–10).
 * All DOM construction uses textContent/setAttribute — no innerHTML.
 *
 * @param {object} opts
 * @param {number} [opts.value] - Current value (1–10)
 * @param {boolean} [opts.readonly]
 * @param {Function} [opts.onChange] - Called with numeric value 1–10
 * @returns {HTMLElement}
 */
export function createStarRating({ value = 0, readonly = false, onChange } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'star-rating';
  wrap.setAttribute('role', readonly ? 'img' : 'radiogroup');
  wrap.setAttribute('aria-label', `Nota: ${value ? value.toFixed(1) : 'sem nota'}`);

  const stars = [];
  const render = (numericValue) => {
    const normalized = Math.max(0, Math.min(10, Number(numericValue) || 0));
    wrap.dataset.value = String(normalized);
    wrap.setAttribute(
      'aria-label',
      normalized ? `Nota: ${(normalized / 2).toFixed(1)} de 5 estrelas` : 'Sem nota',
    );
    stars.forEach((star, index) => {
      const lower = index * 2;
      const fill = normalized >= lower + 2 ? 100 : normalized === lower + 1 ? 50 : 0;
      star.style.setProperty('--star-fill', `${fill}%`);
    });
  };

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement(readonly ? 'span' : 'button');
    star.className = 'star';
    star.textContent = '★';
    stars.push(star);

    if (readonly) {
      star.setAttribute('aria-hidden', 'true');
    } else {
      star.type = 'button';
      star.setAttribute('role', 'radio');
      star.setAttribute('aria-label', `${i} estrelas`);
      star.addEventListener('click', (event) => {
        const rect = star.getBoundingClientRect();
        const isLeftHalf = event.clientX - rect.left < rect.width / 2;
        const next = i * 2 - (isLeftHalf ? 1 : 0);
        render(next);
        onChange?.(next);
      });
    }
    wrap.appendChild(star);
  }

  render(value);

  // Keyboard support
  if (!readonly) {
    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', e => {
      const cur = parseInt(wrap.dataset.value || '0', 10);
      let next = cur;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(10, cur + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, cur - 1);
      if (next !== cur) {
        e.preventDefault();
        render(next);
        onChange?.(next);
      }
    });
  }

  return wrap;
}

/** Returns the numeric value (1–10) from a star rating element. */
export function getStarValue(el) {
  return parseInt(el.dataset.value || '0', 10) || null;
}
