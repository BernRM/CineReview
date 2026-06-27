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
  wrap.setAttribute('role', readonly ? 'img' : 'group');
  wrap.setAttribute('aria-label', `Nota: ${value ? value.toFixed(1) : 'sem nota'}`);

  const stars = [];
  for (let i = 1; i <= 10; i++) {
    const isHalf = i % 2 !== 0;
    const starValue = i; // 1–10 scale

    const span = document.createElement('span');
    span.className = 'star';
    span.setAttribute('aria-hidden', 'true');
    // Half stars use ½ glyph, full stars use full glyph
    span.textContent = isHalf ? '½' : '★';
    span.style.display = isHalf ? 'inline' : 'inline';

    if (value && starValue <= value) span.classList.add('filled');

    if (!readonly) {
      span.style.cursor = 'pointer';
      span.setAttribute('title', `${starValue % 2 === 0 ? starValue / 2 : starValue / 2} estrelas`);
      span.addEventListener('click', () => {
        onChange?.(starValue);
        wrap.setAttribute('aria-label', `Nota: ${starValue}`);
        stars.forEach((s, idx) => s.classList.toggle('filled', idx < starValue));
      });
      span.addEventListener('mouseover', () => {
        stars.forEach((s, idx) => s.classList.toggle('filled', idx < starValue));
      });
      span.addEventListener('mouseout', () => {
        const current = parseInt(wrap.dataset.value || '0', 10);
        stars.forEach((s, idx) => s.classList.toggle('filled', idx < current));
      });
    }

    stars.push(span);
    wrap.appendChild(span);
  }

  wrap.dataset.value = String(value || 0);

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
        wrap.dataset.value = String(next);
        onChange?.(next);
        stars.forEach((s, idx) => s.classList.toggle('filled', idx < next));
        wrap.setAttribute('aria-label', `Nota: ${next}`);
      }
    });
  }

  return wrap;
}

/** Returns the numeric value (1–10) from a star rating element. */
export function getStarValue(el) {
  return parseInt(el.dataset.value || '0', 10) || null;
}
