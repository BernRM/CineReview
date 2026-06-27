export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function lazyImages(root = document) {
  const imgs = root.querySelectorAll('img[data-src]');
  const obs = new IntersectionObserver((entries, o) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
      o.unobserve(img);
    }
  }, { rootMargin: '200px' });
  imgs.forEach(img => obs.observe(img));
}
