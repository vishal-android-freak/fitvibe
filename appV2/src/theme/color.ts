/** Color helpers approximating the prototypes' CSS `color-mix` usage. */

function parseHex(color: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `color` at the given alpha over transparent — for soft metric-tinted fills. */
export function tint(color: string, alpha: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Mix `color` `pct` (0..1) with an opaque `base` — approximates color-mix over a surface. */
export function mix(color: string, pct: number, base: string): string {
  const a = parseHex(color);
  const b = parseHex(base);
  if (!a || !b) return color;
  const r = Math.round(a[0] * pct + b[0] * (1 - pct));
  const g = Math.round(a[1] * pct + b[1] * (1 - pct));
  const bl = Math.round(a[2] * pct + b[2] * (1 - pct));
  return `rgb(${r}, ${g}, ${bl})`;
}
