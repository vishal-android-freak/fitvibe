import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { accent, font, fontSize, surface, text } from '@/theme';

/**
 * Lightweight markdown renderer for assistant chat text. Zero dependencies (a
 * full lib like markdown-it pulls Node stdlib that RN lacks). Supports the subset
 * the coach actually emits: headings, bold/italic, inline code, links, bullet +
 * numbered lists, blockquotes, and paragraphs.
 */
export function MarkdownText({ children, color = text.secondary }: { children: string; color?: string }) {
  const blocks = parseBlocks(children ?? '');
  return (
    <View>
      {blocks.map((b, i) => (
        <Block key={i} block={b} color={color} />
      ))}
    </View>
  );
}

// --- block model ---
type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // fenced code
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      blocks.push({ type: 'ol', items });
      continue;
    }
    // paragraph: gather consecutive non-blank, non-special lines
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6}\s|>\s?|\s*[-*+]\s+|\s*\d+\.\s+|```)/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}

function Block({ block, color }: { block: Block; color: string }) {
  switch (block.type) {
    case 'h':
      return (
        <Text style={[styles.h, block.level <= 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3]}>
          <Inline text={block.text} color={text.primary} />
        </Text>
      );
    case 'ul':
      return (
        <View style={styles.list}>
          {block.items.map((it, i) => (
            <View key={i} style={styles.li}>
              <Text style={[styles.bullet, { color: accent.base }]}>•</Text>
              <Text style={[styles.liText, { color }]}>
                <Inline text={it} color={color} />
              </Text>
            </View>
          ))}
        </View>
      );
    case 'ol':
      return (
        <View style={styles.list}>
          {block.items.map((it, i) => (
            <View key={i} style={styles.li}>
              <Text style={[styles.bullet, { color: accent.base }]}>{i + 1}.</Text>
              <Text style={[styles.liText, { color }]}>
                <Inline text={it} color={color} />
              </Text>
            </View>
          ))}
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={[styles.p, { color }]}>
            <Inline text={block.text} color={color} />
          </Text>
        </View>
      );
    case 'code':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{block.text}</Text>
        </View>
      );
    default:
      return (
        <Text style={[styles.p, { color }]}>
          <Inline text={block.text} color={color} />
        </Text>
      );
  }
}

/** Inline spans: **bold**, *italic*, `code`, [link](url). */
function Inline({ text: src, color }: { text: string; color: string }) {
  const tokens = tokenizeInline(src);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === 'code') return <Text key={i} style={styles.codeInline}>{t.text}</Text>;
        if (t.kind === 'link')
          return (
            <Text key={i} style={styles.link} onPress={() => t.href && Linking.openURL(t.href)}>
              {t.text}
            </Text>
          );
        const style = [
          t.bold ? styles.bold : null,
          t.italic ? styles.italic : null,
          { color: t.bold ? text.primary : color },
        ];
        return (
          <Text key={i} style={style}>
            {t.text}
          </Text>
        );
      })}
    </>
  );
}

type InlineToken =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

function tokenizeInline(src: string): InlineToken[] {
  const out: InlineToken[] = [];
  // Order matters: code, link, bold, italic.
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(__[^_]+__)|(_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: src.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('`')) out.push({ kind: 'code', text: tok.slice(1, -1) });
    else if (tok.startsWith('[')) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (lm) out.push({ kind: 'link', text: lm[1], href: lm[2] });
    } else if (tok.startsWith('**') || tok.startsWith('__')) out.push({ kind: 'text', text: tok.slice(2, -2), bold: true });
    else out.push({ kind: 'text', text: tok.slice(1, -1), italic: true });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ kind: 'text', text: src.slice(last) });
  return out;
}

const styles = StyleSheet.create({
  p: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, marginBottom: 8 },
  h: { marginTop: 4, marginBottom: 6 },
  h1: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
  h2: { fontFamily: font.sansBold, fontSize: fontSize.md, color: text.primary },
  h3: { fontFamily: font.sansSemibold, fontSize: fontSize.base, color: text.primary },
  list: { marginBottom: 8, gap: 4 },
  li: { flexDirection: 'row', gap: 8 },
  bullet: { fontFamily: font.sansSemibold, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, minWidth: 16 },
  liText: { flex: 1, fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  bold: { fontFamily: font.sansBold },
  italic: { fontStyle: 'italic' },
  codeInline: { fontFamily: font.mono, fontSize: fontSize.sm, color: text.primary },
  codeBlock: { backgroundColor: surface.inset, borderRadius: 8, padding: 10, marginBottom: 8 },
  codeText: { fontFamily: font.mono, fontSize: fontSize.sm, color: text.primary },
  link: { color: accent.base, textDecorationLine: 'underline' },
  quote: { borderLeftWidth: 3, borderLeftColor: accent.base, paddingLeft: 10, marginBottom: 8 },
});
