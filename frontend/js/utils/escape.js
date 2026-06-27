/**
 * HTML-escape for safe insertion via innerHTML in static templates.
 * All user-supplied strings MUST pass through this before innerHTML.
 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Set text content safely — use for any untrusted string.
 * Prefer this over esc() + innerHTML wherever possible.
 */
export function setText(el, value) {
  el.textContent = String(value ?? '');
}

/**
 * Validate that a URL is http/https only (block javascript:, data:, etc.)
 */
export function safeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}
