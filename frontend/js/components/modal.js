let _current = null;
let _previousFocus = null;

/**
 * Opens a modal dialog.
 * @param {object} opts
 * @param {string} opts.title - Modal title (used as textContent)
 * @param {string|Node} opts.body - Body content: string (textContent) or DOM Node
 * @param {Function} [opts.onConfirm] - Called when confirm button clicked
 * @param {string} [opts.confirmLabel]
 * @param {boolean} [opts.danger]
 */
export function openModal({ title, body, onConfirm, confirmLabel = 'Confirmar', danger = false }) {
  closeModal();
  _previousFocus = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'modal-title');

  const modal = document.createElement('div');
  modal.className = 'modal';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.id = 'modal-title';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closeModal);
  header.append(titleEl, closeBtn);

  // Body — accepts string (textContent) or DOM Node
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (body instanceof Node) {
    bodyEl.appendChild(body);
  } else {
    bodyEl.textContent = String(body ?? '');
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-ghost';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', closeModal);
  footer.appendChild(cancel);

  if (onConfirm) {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', async () => {
      if (confirmBtn.disabled) return;
      confirmBtn.disabled = true;
      const originalLabel = confirmBtn.textContent;
      confirmBtn.textContent = 'Aguarde…';
      try {
        const shouldClose = await onConfirm();
        if (shouldClose !== false) closeModal();
      } finally {
        if (_current === backdrop) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalLabel;
        }
      }
    });
    footer.appendChild(confirmBtn);
  }

  modal.append(header, bodyEl, footer);
  backdrop.appendChild(modal);
  document.getElementById('modal-root').appendChild(backdrop);
  _current = backdrop;

  // Focus trap
  const getFocusable = () =>
    Array.from(modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  getFocusable()[0]?.focus();

  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const els = getFocusable();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
}

export function closeModal() {
  _current?.remove();
  _current = null;
  _previousFocus?.focus();
  _previousFocus = null;
}

/** Convenience: confirm with a plain-text message. */
export function confirmDialog(message, onConfirm, opts = {}) {
  const p = document.createElement('p');
  p.textContent = message;
  openModal({ title: opts.title || 'Confirmar', body: p, onConfirm, ...opts });
}
