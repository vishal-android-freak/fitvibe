// FitVibe brand tokens (mirrors appV2/src/theme/tokens.ts) for the feature image.

export const hue = {
  move: "#4ADE80",
  heart: "#FF5C7A",
  sleep: "#888CF9",
  oxygen: "#38E0D8",
  energy: "#FFB020",
  hydration: "#4380FF",
  nutrition: "#FF844C",
  mind: "#C792EA",
  sky: "#60A5FA",
} as const;

export const surface = {
  bgApp: "#0A0E1A",
  card: "#131A2B",
  raised: "#1A2236",
  overlay: "#0E1424",
  inset: "#070B14",
} as const;

export const accent = {
  base: "#A78BFA",
  hover: "#C4B5FD",
  press: "#8B5CF6",
  cyan: "#22D3EE",
} as const;

// The AI / aurora gradient — the signature FitVibe look.
export const ai = {
  from: "#A78BFA",
  mid: "#22D3EE",
  to: "#67E8F9",
} as const;

export const text = {
  primary: "#F8FAFC",
  secondary: "#9CA9BD",
  tertiary: "#8390A6",
  onGradient: "#05131F",
} as const;

export const font = {
  display: "Sora",
  sans: "Sora",
} as const;

// A soft tint of a hue for fills.
export function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
