import React, { useMemo } from 'react';
import Markdown from 'react-native-markdown-display';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';

/**
 * Renders assistant chat text as themed markdown (headings, bold/italic, lists,
 * code, links). Pure-JS — no native module, so it works without a dev build.
 */
export function MarkdownText({ children, color = text.secondary }: { children: string; color?: string }) {
  const styles = useMemo(() => makeStyles(color), [color]);
  return <Markdown style={styles}>{children}</Markdown>;
}

function makeStyles(color: string) {
  return {
    body: { color, fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
    paragraph: { marginTop: 0, marginBottom: 10, color, flexWrap: 'wrap' as const },
    heading1: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary, marginTop: 6, marginBottom: 8 },
    heading2: { fontFamily: font.sansBold, fontSize: fontSize.md, color: text.primary, marginTop: 6, marginBottom: 6 },
    heading3: { fontFamily: font.sansSemibold, fontSize: fontSize.base, color: text.primary, marginTop: 4, marginBottom: 4 },
    strong: { fontFamily: font.sansBold, color: text.primary },
    em: { fontStyle: 'italic' as const },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4, color },
    bullet_list_icon: { color: accent.base },
    ordered_list_icon: { color: accent.base, fontFamily: font.sansSemibold },
    code_inline: { fontFamily: font.mono, fontSize: fontSize.sm, backgroundColor: surface.inset, color: text.primary, borderRadius: 4, paddingHorizontal: 4 },
    code_block: { fontFamily: font.mono, fontSize: fontSize.sm, backgroundColor: surface.inset, color: text.primary, borderRadius: radius.sm, padding: 10 },
    fence: { fontFamily: font.mono, fontSize: fontSize.sm, backgroundColor: surface.inset, color: text.primary, borderRadius: radius.sm, padding: 10 },
    link: { color: accent.base },
    blockquote: { backgroundColor: surface.inset, borderLeftColor: accent.base, borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
    hr: { backgroundColor: border.subtle, height: 1, marginVertical: 8 },
    table: { borderColor: border.subtle, borderWidth: 1, borderRadius: radius.sm },
    th: { fontFamily: font.sansSemibold, color: text.primary, padding: 6 },
    td: { color, padding: 6, borderColor: border.subtle },
  };
}
