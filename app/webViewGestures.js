// Keep injected code as text: Hermes does not preserve function source for toString().
export const pullToRefreshScript = String.raw`
(function installPullToRefresh() {
  const post = payload => window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
  const postPath = () => post({ type: 'WT_PATH', path: location.pathname });
  postPath();
  if (window.__wtPullAttached) return;
  window.__wtPullAttached = true;
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) { const result = original.apply(this, args); postPath(); reset(); return result; };
  }
  window.addEventListener('popstate', () => { postPath(); reset(); });
  let startX = 0, startY = 0, tracking = false, pulling = false, progress = 0;
  let busy = false, frame = 0, timeout;
  const eligible = () => /^\/(feed|notifications)(\/|$)/.test(location.pathname);
  function reset() {
    tracking = pulling = busy = false;
    progress = 0;
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    post({ type: 'WT_PTR_HIDE' });
  }
  window.addEventListener('wt_refresh_complete', reset);
  window.addEventListener('touchstart', event => {
    if (busy) return;
    tracking = false;
    if (!eligible() || event.touches.length !== 1 || window.scrollY > 1 || document.body.hasAttribute('data-scroll-locked')) return;
    let node = event.target;
    if (node.closest('input,textarea,select,button,a,[role="dialog"],[role="button"]')) return;
    // A nested scroller owns its gestures, including at its top edge.
    while (node && node !== document.body) {
      if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
      node = node.parentElement;
    }
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    progress = 0;
    tracking = true;
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (!tracking || busy) return;
    if (event.touches.length !== 1 || !eligible()) { reset(); return; }
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;
    if (!pulling) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 1) { tracking = false; return; }
      pulling = true;
      post({ type: 'WT_PTR_VISIBLE', visible: true });
    }
    if (event.cancelable) event.preventDefault();
    progress = Math.min(1, Math.max(0, (dy - 8) / 110));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => post({ type: 'WT_PTR_PROGRESS', progress }));
  }, { passive: false });
  window.addEventListener('touchend', () => {
    if (!tracking || busy) return;
    cancelAnimationFrame(frame);
    tracking = false;
    if (pulling && progress >= 1) {
      busy = true;
      post({ type: 'WT_PTR_TRIGGER' });
      timeout = setTimeout(reset, 30000);
    } else reset();
  }, { passive: true });
  window.addEventListener('touchcancel', () => { if (!busy) reset(); }, { passive: true });
})(); true;
`;
