// Constants for editor layout
export const MM_TO_PX_RATIO = 3.7795275591; // 1mm = 3.7795...px (approx 96 DPI)

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX_RATIO;
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX_RATIO;
}
