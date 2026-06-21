# FitVibe — Feature Image (Remotion)

The marketing/feature artwork for FitVibe, built with [Remotion](https://remotion.dev). An Apple WWDC-style **feature grid**: a tile mosaic of FitVibe features around a central hero ("FitVibe" over the signature aurora sunburst gradient), animated with a staggered spring entrance and a gentle gradient drift.

## Compositions

| Id | Size | Use |
|----|------|-----|
| `FeatureImage` | 2560×1440 (16:9) | README hero banner, website, social cards. |
| `SocialPreview` | 1280×640 (2:1) | GitHub repo social preview. |

Both run 10s at 30fps — render a **still** at a settled frame, or the full clip as an **MP4 loop**.

## Develop

```bash
npm install
npx remotion studio          # live preview / edit
```

## Render

```bash
# Stills (PNG) into the docs assets used by the root README
npx remotion still FeatureImage  ../docs/assets/feature-image.png  --frame=150
npx remotion still SocialPreview ../docs/assets/social-preview.png --frame=150

# Animated loops (MP4)
npx remotion render FeatureImage  out/fitvibe-feature.mp4
npx remotion render SocialPreview out/social.mp4
```

`out/` and `node_modules/` are gitignored; the committed PNGs live in `../docs/assets/`.

## Setting the GitHub social preview

`docs/assets/social-preview.png` is the 1280×640 image GitHub uses for link previews. Upload it once in **Settings → General → Social preview** on the repository (GitHub doesn't pick it up from the repo automatically).

## Structure

- `src/theme.ts` — FitVibe brand tokens (mirrors `appV2/src/theme/tokens.ts`).
- `src/primitives.tsx` — the in-tile visuals (ring, hypnogram, sparkline, bars, macro/activity rings, chat bubble, gauge), drawn as lightweight SVG.
- `src/Tile.tsx` — the captioned glass-card wrapper + spring entrance.
- `src/Hero.tsx` — the central aurora-sunburst hero block.
- `src/FeatureGrid.tsx` — the full 16:9 mosaic layout.
- `src/Social.tsx` — the 2:1 social-preview layout.
- `public/` — logo assets referenced via `staticFile()`.
