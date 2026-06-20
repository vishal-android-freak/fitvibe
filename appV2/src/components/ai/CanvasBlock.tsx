import React from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Image,
  Line,
  LinearGradient,
  Path,
  Points,
  RoundedRect,
  Rect,
  Skia,
  Text as SkText,
  matchFont,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { hue as hues, surface, text as textTok, radius } from '@/theme';
import type { CanvasBlockSpec, DrawOp } from '@/data/blocks';

/**
 * Renders a Vaidya `canvas` block (the gen-UI escape hatch) with Skia. Draw ops
 * are replayed faithfully; any unset color/font defaults to the app theme so a
 * bespoke canvas still looks native. The virtual width×height space is scaled to
 * the available card width.
 */

const FONT_FAMILY = {
  // Registered RN font families; matchFont resolves the Skia typeface.
  display: 'Sora_700Bold',
  sans: 'Sora_400Regular',
  mono: 'JetBrainsMono_400Regular',
} as const;

const WEIGHT_TO_FAMILY: Record<string, string> = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
};

/** Resolve a hue token name or hex to a hex color (theme-consistent). */
function color(c: string | undefined, fallback: string): string {
  if (!c) return fallback;
  return (hues as Record<string, string>)[c] ?? c;
}

function paintProps(
  fill: string | undefined,
  stroke: string | undefined,
  strokeWidth: number | undefined,
  opacity: number | undefined,
  defaultFill: string,
) {
  // Skia: a shape with `color` fills; with `style="stroke"` it strokes. We
  // render fill and stroke as needed via two elements where both are present.
  return { fill, stroke, strokeWidth, opacity, defaultFill };
}

function OpView({ op, k }: { op: DrawOp; k: string }): React.ReactElement | null {
  switch (op.op) {
    case 'rect': {
      const fill = color(op.fill, op.stroke ? 'transparent' : textTok.secondary);
      const els: React.ReactElement[] = [];
      if (op.fill || !op.stroke) {
        els.push(
          op.rx
            ? <RoundedRect key={`${k}f`} x={op.x} y={op.y} width={op.w} height={op.h} r={op.rx} color={fill} opacity={op.opacity ?? 1} />
            : <Rect key={`${k}f`} x={op.x} y={op.y} width={op.w} height={op.h} color={fill} opacity={op.opacity ?? 1} />,
        );
      }
      if (op.stroke) {
        const common = { color: color(op.stroke, textTok.secondary), style: 'stroke' as const, strokeWidth: op.strokeWidth ?? 1, opacity: op.opacity ?? 1 };
        els.push(
          op.rx
            ? <RoundedRect key={`${k}s`} x={op.x} y={op.y} width={op.w} height={op.h} r={op.rx} {...common} />
            : <Rect key={`${k}s`} x={op.x} y={op.y} width={op.w} height={op.h} {...common} />,
        );
      }
      return <Group key={k}>{els}</Group>;
    }
    case 'circle': {
      const els: React.ReactElement[] = [];
      if (op.fill || !op.stroke) els.push(<Circle key={`${k}f`} cx={op.cx} cy={op.cy} r={op.r} color={color(op.fill, textTok.secondary)} opacity={op.opacity ?? 1} />);
      if (op.stroke) els.push(<Circle key={`${k}s`} cx={op.cx} cy={op.cy} r={op.r} color={color(op.stroke, textTok.secondary)} style="stroke" strokeWidth={op.strokeWidth ?? 1} opacity={op.opacity ?? 1} />);
      return <Group key={k}>{els}</Group>;
    }
    case 'line':
      return (
        <Line
          key={k}
          p1={vec(op.x1, op.y1)}
          p2={vec(op.x2, op.y2)}
          color={color(op.stroke, textTok.secondary)}
          style="stroke"
          strokeWidth={op.strokeWidth ?? 1.5}
          opacity={op.opacity ?? 1}
        />
      );
    case 'path': {
      const path = Skia.Path.MakeFromSVGString(op.d);
      if (!path) return null;
      const els: React.ReactElement[] = [];
      if (op.fill) els.push(<Path key={`${k}f`} path={path} color={color(op.fill, textTok.secondary)} opacity={op.opacity ?? 1} />);
      if (op.stroke || !op.fill) els.push(<Path key={`${k}s`} path={path} color={color(op.stroke, textTok.secondary)} style="stroke" strokeWidth={op.strokeWidth ?? 1.5} opacity={op.opacity ?? 1} />);
      return <Group key={k}>{els}</Group>;
    }
    case 'poly': {
      const pts = op.points.map(([x, y]) => vec(x, y));
      if (op.closed && pts.length) pts.push(pts[0]);
      const els: React.ReactElement[] = [];
      if (op.fill) {
        // Build a closed path for fill.
        const p = Skia.Path.Make();
        op.points.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
        p.close();
        els.push(<Path key={`${k}f`} path={p} color={color(op.fill, textTok.secondary)} opacity={op.opacity ?? 1} />);
      }
      els.push(<Points key={`${k}s`} points={pts} mode="polygon" color={color(op.stroke, op.fill ? 'transparent' : textTok.secondary)} style="stroke" strokeWidth={op.strokeWidth ?? 1.5} opacity={op.opacity ?? 1} />);
      return <Group key={k}>{els}</Group>;
    }
    case 'text': {
      const family = op.weight ? WEIGHT_TO_FAMILY[op.weight] : FONT_FAMILY[op.font ?? 'sans'];
      const size = op.size ?? 13;
      const font = matchFont({ fontFamily: family, fontSize: size });
      // Skia Text anchors at the baseline-left; approximate align by shifting x.
      let x = op.x;
      if (op.align && font) {
        const w = font.getTextWidth(op.text);
        if (op.align === 'center') x -= w / 2;
        else if (op.align === 'right') x -= w;
      }
      return <SkText key={k} x={x} y={op.y} text={op.text} font={font} color={color(op.color, textTok.primary)} opacity={op.opacity ?? 1} />;
    }
    case 'image':
      return <CanvasImage key={k} op={op} />;
    case 'group': {
      const t = op.transform;
      const transform = t
        ? [
            ...(t.translate ? [{ translateX: t.translate[0] }, { translateY: t.translate[1] }] : []),
            ...(t.rotate ? [{ rotate: (t.rotate * Math.PI) / 180 }] : []),
            ...(t.scale != null
              ? Array.isArray(t.scale)
                ? [{ scaleX: t.scale[0] }, { scaleY: t.scale[1] }]
                : [{ scale: t.scale }]
              : []),
          ]
        : undefined;
      return (
        <Group key={k} transform={transform as never}>
          {op.ops.map((child, i) => (
            <OpView key={`${k}.${i}`} op={child} k={`${k}.${i}`} />
          ))}
        </Group>
      );
    }
    case 'lineargradient':
      // Gradients are referenced by fill "url(#id)" on shapes; we don't render a
      // standalone element. Skia gradients attach as children of a painted shape,
      // which our flat op model doesn't wire — treat as a no-op for now and let
      // shapes use solid colors. (Kept in the schema for forward-compat.)
      return null;
    default:
      return null;
  }
}

function CanvasImage({ op }: { op: Extract<DrawOp, { op: 'image' }> }) {
  const img = useImage(op.src);
  if (!img) return null;
  return (
    <Image
      image={img}
      x={op.x}
      y={op.y}
      width={op.w}
      height={op.h}
      fit={op.fit ?? 'contain'}
      opacity={op.opacity ?? 1}
    />
  );
}

export function CanvasBlock({ block, maxWidth }: { block: CanvasBlockSpec; maxWidth: number }) {
  const scale = Math.min(1, maxWidth / block.width);
  const w = block.width * scale;
  const h = block.height * scale;
  return (
    <View style={{ width: w, height: h, borderRadius: radius.lg, overflow: 'hidden' }}>
      <Canvas style={{ width: w, height: h }}>
        <Group transform={[{ scale }]}>
          {block.background ? (
            <Rect x={0} y={0} width={block.width} height={block.height} color={color(block.background, surface.card)} />
          ) : null}
          {block.ops.map((op, i) => (
            <OpView key={String(i)} op={op} k={String(i)} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
