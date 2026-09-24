/**
 * Safely switches theme without triggering transition smears across the DOM.
 *
 * Injects a temporary stylesheet that forces `transition: none !important` on
 * every element, flushes a synchronous layout reflow so the new theme styles
 * commit instantly, then removes the override on the frame after paint so all
 * other transitions keep working.
 */
export function setDarkModeWithoutTransitions(isDark: boolean): void {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode('*, *::before, *::after { transition: none !important; }')
  );
  document.head.appendChild(style);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Force synchronous layout reflow so new theme styles commit immediately
  const _reflow = document.body.offsetHeight;

  // Restore transitions on the next frame after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove();
    });
  });
}
