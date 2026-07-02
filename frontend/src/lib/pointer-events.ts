/** Radix Select/Dialog can leave `pointer-events: none` on body after nested dismiss. */
export function restoreBodyPointerEvents() {
  document.body.style.pointerEvents = ''
}
