import { Capacitor } from '@capacitor/core';

const waitForTarget = (selector, timeout = 1800) => new Promise(resolve => {
  const startedAt = performance.now();
  const find = () => {
    const target = document.querySelector(selector);
    if (target || performance.now() - startedAt >= timeout) {
      resolve(target);
      return;
    }
    window.requestAnimationFrame(find);
  };
  window.requestAnimationFrame(find);
});

export async function navigateWithNativeSharedElement({ source, targetSelector, navigate, to }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body.classList.contains('reduce-motion');
  if (!Capacitor.isNativePlatform() || reducedMotion || !source) {
    navigate(to);
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height) {
    navigate(to);
    return;
  }

  const clone = source.cloneNode(true);
  Object.assign(clone.style, {
    position: 'fixed',
    zIndex: '2147483000',
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    contain: 'paint',
  });
  clone.setAttribute('aria-hidden', 'true');
  document.body.appendChild(clone);

  // App skips its regular push animation for this navigation. The image itself
  // is the transition surface, so combining both would look like a double move.
  window.__wpNativeSharedTransitionPending = true;
  navigate(to);

  const target = await waitForTarget(targetSelector);
  if (!target) {
    clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' })
      .finished.catch(() => {}).finally(() => clone.remove());
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const previousOpacity = target.style.opacity;
  target.style.opacity = '0';
  const dx = targetRect.left - sourceRect.left;
  const dy = targetRect.top - sourceRect.top;
  const scaleX = targetRect.width / sourceRect.width;
  const scaleY = targetRect.height / sourceRect.height;
  const animation = clone.animate([
    { transform: 'translate3d(0, 0, 0) scale(1, 1)', borderRadius: getComputedStyle(source).borderRadius },
    { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scaleX}, ${scaleY})`, borderRadius: getComputedStyle(target).borderRadius },
  ], {
    duration: 320,
    easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
    fill: 'forwards',
  });
  animation.finished.catch(() => {}).finally(() => {
    target.style.opacity = previousOpacity;
    clone.remove();
  });
}
