let lockCount = 0;

export function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    if (lockCount === 0) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.setAttribute('data-scroll-locked', 'true');
    }
    lockCount += 1;
  } catch {}
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  try {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.removeAttribute('data-scroll-locked');
    }
  } catch {}
}


