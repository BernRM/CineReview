const container = () => document.getElementById('toast-container');

export function toast(message, type = 'info', duration = 4000) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  // Use textContent — message comes from internal code, not user input
  el.textContent = message;
  container()?.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export const toastOk    = msg => toast(msg, 'ok');
export const toastError = msg => toast(msg, 'error');
export const toastInfo  = msg => toast(msg, 'info');
