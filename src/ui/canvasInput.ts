/** DOM controls must not also trigger Phaser's window mouse/touch listeners. */
export function isolateCanvasInput(element: HTMLElement): void {
  for (const event of ["mousedown", "mouseup", "touchstart", "touchend"])
    element.addEventListener(event, (input) => input.stopPropagation());
}
