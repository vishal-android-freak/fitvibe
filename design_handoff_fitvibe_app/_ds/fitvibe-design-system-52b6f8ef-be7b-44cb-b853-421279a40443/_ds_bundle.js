/* @ds-bundle: {"format":3,"namespace":"FitVibeDesignSystem_52b6f8","components":[{"name":"ChatMessage","sourcePath":"components/ai/ChatMessage.jsx"},{"name":"InsightCard","sourcePath":"components/ai/InsightCard.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"ProgressRing","sourcePath":"components/data/ProgressRing.jsx"},{"name":"Sparkline","sourcePath":"components/data/Sparkline.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"}],"sourceHashes":{"components/ai/ChatMessage.jsx":"adf5d0e338af","components/ai/InsightCard.jsx":"d608d2439397","components/core/Avatar.jsx":"80502f5729ac","components/core/Badge.jsx":"8450c12dd6bc","components/core/Button.jsx":"2123e5e54074","components/core/Card.jsx":"d4b4534dbcc3","components/core/Chip.jsx":"ef7ba76df66d","components/core/IconButton.jsx":"13dc2547e57a","components/core/Switch.jsx":"73f020e40ea5","components/data/BarChart.jsx":"042c8c62b067","components/data/ProgressRing.jsx":"ae5c0f01a210","components/data/Sparkline.jsx":"37648906435d","components/data/StatTile.jsx":"1a08cfd6a132","ui_kits/app/AppShell.jsx":"2ac5db81dc6d","ui_kits/app/ChatScreen.jsx":"da4994992266","ui_kits/app/InsightsScreen.jsx":"05c8dbc0a1ae","ui_kits/app/MetricDetailScreen.jsx":"4640b90ebb9f","ui_kits/app/OnboardingScreen.jsx":"4d04bfc22952","ui_kits/app/ProfileScreen.jsx":"3305bb5aa0de","ui_kits/app/TodayScreen.jsx":"a1a5daf26853","ui_kits/app/TrendsScreen.jsx":"7369e467d6a5","ui_kits/app/data.jsx":"5226d196ecf0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FitVibeDesignSystem_52b6f8 = window.FitVibeDesignSystem_52b6f8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/ai/ChatMessage.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ChatMessage — a chat bubble for the Ask FitVibe surface. User messages are
 * accent-filled and right-aligned; assistant messages are a soft surface and
 * can host generative UI (charts, tiles) passed as children below the text.
 */
function ChatMessage({
  role = "assistant",
  children,
  text,
  generative = null,
  avatar = true,
  style = {},
  ...rest
}) {
  const isUser = role === "user";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      gap: 9,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end",
      ...style
    }
  }, rest), avatar && !isUser && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "0 0 auto",
      width: 28,
      height: 28,
      borderRadius: "var(--radius-pill)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ai-gradient)",
      color: "#05131F"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l1.8 5.6a4 4 0 0 0 2.6 2.6L22 12l-5.6 1.8a4 4 0 0 0-2.6 2.6L12 22l-1.8-5.6a4 4 0 0 0-2.6-2.6L2 12l5.6-1.8a4 4 0 0 0 2.6-2.6L12 2z"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "84%",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignItems: isUser ? "flex-end" : "flex-start"
    }
  }, (text || children) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "11px 15px",
      borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
      fontSize: "var(--text-md)",
      lineHeight: "var(--leading-normal)",
      background: isUser ? "var(--accent)" : "var(--surface-raised)",
      color: isUser ? "var(--text-on-accent)" : "var(--text-body)",
      fontWeight: isUser ? "var(--weight-semibold)" : "var(--weight-regular)",
      boxShadow: isUser ? "var(--glow-soft)" : "var(--ring-hairline)"
    }
  }, text || children), generative && /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      minWidth: 220
    }
  }, generative)));
}
Object.assign(__ds_scope, { ChatMessage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ai/ChatMessage.jsx", error: String((e && e.message) || e) }); }

// components/ai/InsightCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * InsightCard — an AI-generated insight. Gradient hairline + soft tint signal
 * "this came from FitVibe AI". Sparkle eyebrow, headline, body, optional footer.
 */
function InsightCard({
  title,
  children,
  eyebrow = "FitVibe AI",
  icon = null,
  tone = "ai",
  footer = null,
  style = {},
  ...rest
}) {
  const ai = tone === "ai";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-5)",
      background: ai ? "linear-gradient(var(--surface-card), var(--surface-card)) padding-box, var(--ai-gradient) border-box" : "var(--surface-card)",
      border: ai ? "1px solid transparent" : "1px solid var(--border-subtle)",
      boxShadow: ai ? "var(--glow-ai)" : "var(--shadow-md)",
      overflow: "hidden",
      ...style
    }
  }, rest), ai && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--ai-gradient-soft)",
      opacity: 0.5,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: "var(--radius-sm)",
      background: "var(--ai-gradient)",
      color: "#05131F"
    }
  }, icon || /*#__PURE__*/React.createElement(SparkGlyph, null)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-caps)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, eyebrow)), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-xl)",
      color: "var(--text-strong)",
      marginBottom: 6,
      letterSpacing: "var(--tracking-tight)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-md)",
      lineHeight: "var(--leading-relaxed)",
      color: "var(--text-body)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, footer)));
}
function SparkGlyph() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l1.8 5.6a4 4 0 0 0 2.6 2.6L22 12l-5.6 1.8a4 4 0 0 0-2.6 2.6L12 22l-1.8-5.6a4 4 0 0 0-2.6-2.6L2 12l5.6-1.8a4 4 0 0 0 2.6-2.6L12 2z"
  }));
}
Object.assign(__ds_scope, { InsightCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ai/InsightCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Avatar — user image or initials, with optional accent ring.
 */
function Avatar({
  src,
  name = "",
  size = 40,
  ring = false,
  style = {},
  ...rest
}) {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "var(--radius-pill)",
      flex: "0 0 auto",
      overflow: "hidden",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-bold)",
      fontSize: size * 0.4,
      color: "var(--text-on-accent)",
      background: "var(--ai-gradient)",
      boxShadow: ring ? "0 0 0 2px var(--bg-page), 0 0 0 4px var(--accent)" : "none",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status/label badge. `hue` accepts a metric token name or any CSS color.
 */
function Badge({
  children,
  tone = "neutral",
  hue,
  solid = false,
  style = {},
  ...rest
}) {
  const tokenHues = {
    move: "var(--hue-move)",
    heart: "var(--hue-heart)",
    sleep: "var(--hue-sleep)",
    oxygen: "var(--hue-oxygen)",
    energy: "var(--hue-energy)",
    hydration: "var(--hue-hydration)",
    mind: "var(--hue-mind)",
    nutrition: "var(--hue-nutrition)"
  };
  const tones = {
    neutral: "var(--text-muted)",
    positive: "var(--positive)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    info: "var(--info)",
    accent: "var(--accent)"
  };
  const c = hue ? tokenHues[hue] || hue : tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 22,
      padding: "0 9px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-wide)",
      lineHeight: 1,
      color: solid ? "var(--text-on-accent)" : c,
      background: solid ? c : `color-mix(in oklab, ${c} 16%, transparent)`,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FitVibe Button — pillowy, sporty CTA.
 * Variants: primary (bright accent), secondary (raised ink), ghost, ai (gradient).
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 36,
      padding: "0 14px",
      font: "var(--text-sm)",
      radius: "var(--radius-md)"
    },
    md: {
      height: 46,
      padding: "0 20px",
      font: "var(--text-md)",
      radius: "var(--radius-md)"
    },
    lg: {
      height: 54,
      padding: "0 26px",
      font: "var(--text-lg)",
      radius: "var(--radius-lg)"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      boxShadow: "var(--glow-soft)",
      border: "1px solid transparent"
    },
    secondary: {
      background: "var(--surface-raised)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-strong)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    ai: {
      background: "var(--ai-gradient)",
      color: "#05131F",
      boxShadow: "var(--glow-ai)",
      border: "1px solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: block ? "100%" : "auto",
      height: s.height,
      padding: s.padding,
      borderRadius: s.radius,
      fontFamily: "var(--font-sans)",
      fontSize: s.font,
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-snug)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      ...(variants[variant] || variants.primary),
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container — the pillowy card used across FitVibe.
 * `tone="ai"` paints the signature gradient hairline + tint for AI moments.
 */
function Card({
  children,
  tone = "default",
  pad = "lg",
  interactive = false,
  style = {},
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "var(--space-3)",
    md: "var(--space-4)",
    lg: "var(--card-pad)",
    xl: "var(--space-6)"
  };
  const tones = {
    default: {
      background: "var(--surface-card)",
      boxShadow: "var(--ring-hairline), var(--ring-card), var(--shadow-md)"
    },
    raised: {
      background: "var(--surface-raised)",
      boxShadow: "var(--ring-hairline), var(--shadow-lg)"
    },
    inset: {
      background: "var(--surface-inset)",
      boxShadow: "inset 0 0 0 1px var(--border-subtle)"
    },
    ai: {
      background: "linear-gradient(var(--surface-card), var(--surface-card)) padding-box, var(--ai-gradient) border-box",
      border: "1px solid transparent",
      boxShadow: "var(--glow-ai)"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      borderRadius: "var(--radius-xl)",
      padding: pads[pad] ?? pads.lg,
      color: "var(--text-body)",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      cursor: interactive ? "pointer" : "default",
      ...(tones[tone] || tones.default),
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.transform = "translateY(-2px)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.transform = "translateY(0)";
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Filter / segment chip. Tappable pill that toggles selected state.
 */
function Chip({
  children,
  selected = false,
  iconLeft = null,
  onClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 34,
      padding: "0 14px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "all var(--dur-base) var(--ease-out)",
      color: selected ? "var(--text-on-accent)" : "var(--text-body)",
      background: selected ? "var(--accent)" : "var(--surface-raised)",
      border: `1px solid ${selected ? "transparent" : "var(--border-strong)"}`,
      boxShadow: selected ? "var(--glow-soft)" : "none",
      ...style
    }
  }, rest), iconLeft, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular/rounded icon button for toolbars, nav, and card actions.
 * Pass a Lucide (or any) icon node as children.
 */
function IconButton({
  children,
  variant = "ghost",
  size = "md",
  round = true,
  active = false,
  disabled = false,
  label,
  style = {},
  ...rest
}) {
  const dims = {
    sm: 36,
    md: 44,
    lg: 52
  };
  const d = dims[size] || dims.md;
  const variants = {
    ghost: {
      background: active ? "var(--accent-soft)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-body)",
      border: "1px solid transparent"
    },
    solid: {
      background: "var(--surface-raised)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-strong)"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      border: "1px solid transparent",
      boxShadow: "var(--glow-soft)"
    },
    glass: {
      background: "var(--glass-bg)",
      color: "var(--text-strong)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: d,
      height: d,
      borderRadius: round ? "var(--radius-pill)" : "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
      ...(variants[variant] || variants.ghost),
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.9)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Toggle switch. Controlled via `checked` + `onChange(next)`.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: "relative",
      width: 50,
      height: 30,
      borderRadius: "var(--radius-pill)",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      background: checked ? "var(--accent)" : "var(--ink-4)",
      boxShadow: checked ? "var(--glow-soft)" : "inset 0 0 0 1px var(--border-subtle)",
      transition: "background var(--dur-base) var(--ease-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 23 : 3,
      width: 24,
      height: 24,
      borderRadius: "var(--radius-pill)",
      background: "#fff",
      boxShadow: "var(--shadow-sm)",
      transition: "left var(--dur-base) var(--ease-spring)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * BarChart — vertical bars for daily/weekly trends. Highlights the max bar,
 * supports a dashed goal line and x-axis labels.
 */
function BarChart({
  data = [],
  labels = [],
  hue = "var(--accent)",
  height = 140,
  goal,
  highlightMax = true,
  rounded = true,
  style = {},
  ...rest
}) {
  const max = Math.max(...data, goal || 0) || 1;
  const maxIdx = data.indexOf(Math.max(...data));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: "100%",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      gap: 6,
      height
    }
  }, goal != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: `${goal / max * 100}%`,
      borderTop: "1.5px dashed var(--border-strong)",
      opacity: 0.7
    }
  }), data.map((d, i) => {
    const isMax = highlightMax && i === maxIdx;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: "100%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: `${Math.max(2, d / max * 100)}%`,
        borderRadius: rounded ? "var(--radius-sm) var(--radius-sm) 4px 4px" : 0,
        background: isMax ? hue : `color-mix(in oklab, ${hue} 30%, var(--surface-raised))`,
        boxShadow: isMax ? `0 0 14px color-mix(in oklab, ${hue} 50%, transparent)` : "none",
        transition: "height var(--dur-slow) var(--ease-out)"
      }
    }));
  })), labels.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, labels.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      textAlign: "center",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-semibold)",
      color: i === maxIdx && highlightMax ? "var(--text-body)" : "var(--text-faint)"
    }
  }, l))));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Activity ring(s) — the signature FitVibe metric viz. Apple-style concentric
 * progress rings with a glowing rounded cap. Pass one ring or several.
 */
function ProgressRing({
  rings,
  value,
  hue = "var(--accent)",
  size = 160,
  thickness,
  trackOpacity = 0.16,
  glow = true,
  children,
  style = {},
  ...rest
}) {
  const data = rings || [{
    value: value ?? 0,
    hue
  }];
  const stroke = thickness || Math.max(8, size * 0.085);
  const gap = stroke * 0.55;
  const cx = size / 2;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      width: size,
      height: size,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      transform: "rotate(-90deg)"
    }
  }, data.map((ring, i) => {
    const r = cx - stroke / 2 - i * (stroke + gap);
    if (r <= 0) return null;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, ring.value));
    const c = ring.hue || hue;
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("circle", {
      cx: cx,
      cy: cx,
      r: r,
      fill: "none",
      stroke: c,
      strokeOpacity: trackOpacity,
      strokeWidth: stroke
    }), /*#__PURE__*/React.createElement("circle", {
      cx: cx,
      cy: cx,
      r: r,
      fill: "none",
      stroke: c,
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeDasharray: circ,
      strokeDashoffset: circ * (1 - pct),
      style: {
        transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)",
        filter: glow ? `drop-shadow(0 0 6px color-mix(in oklab, ${c} 60%, transparent))` : "none"
      }
    }));
  })), children != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center"
    }
  }, children));
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/data/Sparkline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sparkline — compact line/area trend. Renders a smooth path with an optional
 * gradient fill and an end dot. Pure SVG, scales to its container width.
 */
function Sparkline({
  data = [],
  hue = "var(--accent)",
  width = 120,
  height = 40,
  fill = true,
  dot = true,
  strokeWidth = 2,
  style = {},
  ...rest
}) {
  if (data.length < 2) return /*#__PURE__*/React.createElement("svg", _extends({
    width: width,
    height: height,
    style: style
  }, rest));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth + 1;
  const stepX = (width - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => [pad + i * stepX, pad + (height - pad * 2) * (1 - (d - min) / span)]);

  // Smooth path (Catmull-Rom → cubic Bézier)
  let path = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  const gid = "sl" + Math.random().toString(36).slice(2, 8);
  const end = pts[pts.length - 1];
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: width,
    height: height,
    viewBox: `0 0 ${width} ${height}`,
    style: {
      overflow: "visible",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: gid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: hue,
    stopOpacity: "0.32"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: hue,
    stopOpacity: "0"
  }))), fill && /*#__PURE__*/React.createElement("path", {
    d: `${path} L ${end[0]},${height} L ${pts[0][0]},${height} Z`,
    fill: `url(#${gid})`,
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: hue,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), dot && /*#__PURE__*/React.createElement("circle", {
    cx: end[0],
    cy: end[1],
    r: strokeWidth + 1.4,
    fill: hue,
    style: {
      filter: `drop-shadow(0 0 4px ${hue})`
    }
  }));
}
Object.assign(__ds_scope, { Sparkline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Sparkline.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatTile — a metric tile: icon + label, big tabular value with unit, an
 * optional delta badge and a sparkline. The dense building block of dashboards.
 */
function StatTile({
  label,
  value,
  unit,
  hue = "var(--accent)",
  icon = null,
  delta,
  deltaDir = "up",
  spark,
  goal,
  style = {},
  ...rest
}) {
  const deltaGood = deltaDir === "up";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "var(--card-pad)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-card)",
      boxShadow: "var(--ring-hairline), var(--ring-card)",
      minWidth: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: "var(--radius-sm)",
      color: hue,
      background: `color-mix(in oklab, ${hue} 16%, transparent)`
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-muted)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-3xl)",
      lineHeight: 1
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      fontWeight: "var(--weight-semibold)"
    }
  }, unit)), (delta != null || spark) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    }
  }, delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-bold)",
      color: deltaGood ? "var(--positive)" : "var(--danger)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11
    }
  }, deltaGood ? "▲" : "▼"), delta), goal != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, goal), spark && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Spark, {
    data: spark,
    hue: hue
  }))));
}

/* lightweight internal sparkline so StatTile is self-contained */
function Spark({
  data,
  hue
}) {
  const w = 76,
    h = 26;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data),
    max = Math.max(...data),
    span = max - min || 1;
  const stepX = w / (data.length - 1);
  const pts = data.map((d, i) => `${i * stepX},${h - 2 - (h - 4) * (d - min) / span}`).join(" ");
  return /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: h,
    style: {
      overflow: "visible"
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: hue,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
/* FitVibe UI kit — device frame + shared chrome (status bar, tab bar, headers). */

function PhoneFrame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 402,
      height: 858,
      borderRadius: 56,
      padding: 12,
      background: "linear-gradient(160deg, #20262F, #0A0D12)",
      boxShadow: "0 50px 120px rgba(0,0,0,.6), inset 0 0 0 1.5px rgba(255,255,255,.06)",
      position: "relative",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fv-field",
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: 44,
      overflow: "hidden",
      background: "var(--bg-app)",
      backgroundImage: "var(--field-glow)"
    }
  }, children));
}
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 54,
      zIndex: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 30px",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--text-strong)"
    }
  }, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      color: "var(--text-strong)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 16,
    stroke: 2.4
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 16,
    stroke: 2.4
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 20,
    stroke: 2.2
  })));
}

/* Scrollable content region; leaves room for status bar + tab bar. */
function Scroll({
  children,
  pad = true,
  refEl
}) {
  return /*#__PURE__*/React.createElement("div", {
    ref: refEl,
    style: {
      position: "absolute",
      inset: 0,
      overflowY: "auto",
      overflowX: "hidden",
      paddingTop: 54,
      paddingBottom: 104,
      WebkitOverflowScrolling: "touch"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad ? "0 var(--screen-gutter)" : 0
    }
  }, children));
}

/* Sticky glass header used on detail/sub screens. */
function ScreenHeader({
  title,
  sub,
  onBack,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      margin: "0 calc(-1 * var(--screen-gutter))",
      padding: "10px var(--screen-gutter) 12px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--glass-bg)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, onBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    "aria-label": "Back",
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-pill)",
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
      color: "var(--text-strong)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--text-xl)",
      color: "var(--text-strong)",
      letterSpacing: "var(--tracking-tight)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, sub)), right);
}
function SectionLabel({
  children,
  action,
  onAction
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      margin: "22px 2px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-eyebrow"
  }, children), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      background: "none",
      border: "none",
      color: "var(--accent)",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: "var(--text-xs)",
      cursor: "pointer",
      letterSpacing: "var(--tracking-wide)"
    }
  }, action));
}
const TABS = [{
  id: "today",
  icon: "house",
  label: "Today"
}, {
  id: "trends",
  icon: "chart-line",
  label: "Trends"
}, {
  id: "chat",
  icon: "sparkles",
  label: "Ask"
}, {
  id: "insights",
  icon: "lightbulb",
  label: "Insights"
}, {
  id: "profile",
  icon: "user",
  label: "You"
}];
function TabBar({
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 14,
      right: 14,
      bottom: 14,
      zIndex: 40,
      height: 72,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      padding: "0 8px",
      borderRadius: "var(--radius-2xl)",
      background: "var(--glass-bg)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)",
      boxShadow: "var(--shadow-lg)"
    }
  }, TABS.map(t => {
    const on = active === t.id;
    const isAi = t.id === "chat";
    if (isAi) {
      return /*#__PURE__*/React.createElement("button", {
        key: t.id,
        onClick: () => onChange(t.id),
        "aria-label": t.label,
        style: {
          width: 54,
          height: 54,
          marginTop: -22,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--ai-gradient)",
          color: "#05131F",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--glow-ai)",
          transition: "transform var(--dur-fast) var(--ease-out)"
        },
        onMouseDown: e => e.currentTarget.style.transform = "scale(.92)",
        onMouseUp: e => e.currentTarget.style.transform = "scale(1)",
        onMouseLeave: e => e.currentTarget.style.transform = "scale(1)"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: t.icon,
        size: 24,
        stroke: 2.4
      }));
    }
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onChange(t.id),
      "aria-label": t.label,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px 6px",
        color: on ? "var(--accent)" : "var(--text-faint)",
        transition: "color var(--dur-base) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      stroke: on ? 2.4 : 2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: on ? 700 : 600,
        letterSpacing: ".02em"
      }
    }, t.label));
  }));
}
Object.assign(window, {
  PhoneFrame,
  StatusBar,
  Scroll,
  ScreenHeader,
  SectionLabel,
  TabBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ChatScreen.jsx
try { (() => {
/* Ask FitVibe — chat with generative UI replies. */
function ChatScreen() {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    ChatMessage,
    Card,
    BarChart,
    Sparkline,
    StatTile,
    Chip
  } = D;
  const {
    Icon,
    FV
  } = window;
  const [msgs, setMsgs] = React.useState(FV.chat);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [msgs, typing]);
  function genUI(name) {
    if (name === "sleepWeek") {
      return /*#__PURE__*/React.createElement(Card, {
        tone: "inset",
        pad: "md"
      }, /*#__PURE__*/React.createElement("span", {
        className: "fv-eyebrow",
        style: {
          display: "block",
          marginBottom: 8
        }
      }, "Sleep \xB7 minutes"), /*#__PURE__*/React.createElement(BarChart, {
        data: FV.metrics.sleep.week,
        labels: FV.days,
        hue: "var(--hue-sleep)",
        height: 92
      }));
    }
    if (name === "vo2") {
      return /*#__PURE__*/React.createElement(Card, {
        tone: "inset",
        pad: "md"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "fv-eyebrow"
      }, "VO\u2082 max \xB7 30 days"), /*#__PURE__*/React.createElement("span", {
        className: "fv-stat",
        style: {
          color: "var(--hue-move)",
          fontSize: "var(--text-xl)"
        }
      }, "44", /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)"
        }
      }, " ml/kg"))), /*#__PURE__*/React.createElement(Sparkline, {
        data: [42, 42, 43, 42, 43, 43, 44, 43, 44, 44],
        hue: "var(--hue-move)",
        width: 300,
        height: 56
      }));
    }
    return null;
  }
  function send(text) {
    const q = (text || draft).trim();
    if (!q) return;
    setMsgs(m => [...m, {
      role: "user",
      text: q
    }]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, {
        role: "assistant",
        text: "Here's what your data shows. Over the last week your numbers are trending in a healthy direction — want me to break any of these down further?",
        gen: "sleepWeek"
      }]);
    }, 1200);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      paddingTop: 54,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 20px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-pill)",
      background: "var(--ai-gradient)",
      color: "#05131F",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--glow-soft)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      color: "var(--text-strong)",
      fontSize: "var(--text-lg)"
    }
  }, "Ask FitVibe"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--hue-move)",
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--hue-move)"
    }
  }), " Knows your last 90 days"))), /*#__PURE__*/React.createElement("div", {
    ref: endRef,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "18px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, msgs.map((m, i) => /*#__PURE__*/React.createElement(ChatMessage, {
    key: i,
    role: m.role,
    text: m.text,
    generative: m.gen ? genUI(m.gen) : null
  })), typing && /*#__PURE__*/React.createElement(ChatMessage, {
    role: "assistant",
    text: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Dot, {
      d: 0
    }), /*#__PURE__*/React.createElement(Dot, {
      d: 150
    }), /*#__PURE__*/React.createElement(Dot, {
      d: 300
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "0 16px 10px",
      overflowX: "auto"
    }
  }, FV.prompts.map(p => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    onClick: () => send(p),
    style: {
      flex: "0 0 auto"
    }
  }, p))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 16px 16px",
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 6px 0 16px",
      height: 50,
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-input)",
      border: "1px solid var(--border-strong)"
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => e.key === "Enter" && send(),
    placeholder: "Ask about your health\u2026",
    style: {
      flex: 1,
      background: "none",
      border: "none",
      outline: "none",
      color: "var(--text-strong)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => send(),
    "aria-label": "Send",
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-pill)",
      border: "none",
      background: draft.trim() ? "var(--accent)" : "var(--ink-4)",
      color: draft.trim() ? "var(--text-on-accent)" : "var(--text-faint)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "background var(--dur-base)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up",
    size: 20,
    stroke: 2.6
  })))));
}
function Dot({
  d
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--text-muted)",
      display: "inline-block",
      animation: `fvBlink 1s ${d}ms infinite ease-in-out`
    }
  });
}
window.ChatScreen = ChatScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ChatScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/InsightsScreen.jsx
try { (() => {
/* Insights feed — a scroll of AI insight cards. */
function InsightsScreen({
  onAsk
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    InsightCard,
    Badge,
    Button
  } = D;
  const {
    Icon,
    FV
  } = window;
  return /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "fv-eyebrow",
    style: {
      marginBottom: 4
    }
  }, "This week"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-3xl)"
    }
  }, "Insights")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-pill)",
      background: "var(--ai-gradient)",
      color: "#05131F",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--glow-ai)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 22
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      margin: "10px 2px 4px"
    }
  }, "FitVibe reviewed 7 days of your data and found 3 things worth knowing."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      marginTop: 14
    }
  }, FV.insights.map(ins => /*#__PURE__*/React.createElement(InsightCard, {
    key: ins.id,
    title: ins.title,
    tone: ins.tone || "ai",
    icon: ins.tone === "plain" ? /*#__PURE__*/React.createElement(Icon, {
      name: ins.icon,
      size: 13,
      color: "#05131F"
    }) : undefined,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, ins.tags.map(([txt, hue]) => /*#__PURE__*/React.createElement(Badge, {
      key: txt,
      hue: hue
    }, txt)), /*#__PURE__*/React.createElement("button", {
      onClick: onAsk,
      style: {
        marginLeft: "auto",
        background: "none",
        border: "none",
        color: "var(--accent)",
        fontWeight: 700,
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3
      }
    }, "Ask more ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    })))
  }, ins.body))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 18
    }),
    onClick: onAsk
  }, "Ask FitVibe about your week")));
}
window.InsightsScreen = InsightsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/InsightsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/MetricDetailScreen.jsx
try { (() => {
/* Metric detail — deep dive. Sleep gets a stage breakdown; all metrics get a
   week chart, range chips, related stats and an AI note. */
function MetricDetailScreen({
  metricKey = "sleep",
  onBack,
  onAsk
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    BarChart,
    Card,
    Chip,
    InsightCard,
    Badge,
    StatTile
  } = D;
  const {
    Icon,
    FV,
    fmtMin
  } = window;
  const [range, setRange] = React.useState("W");
  const m = FV.metrics[metricKey] || FV.metrics.sleep;
  const isSleep = metricKey === "sleep";
  const titles = {
    restingHr: "Resting heart rate",
    sleep: "Sleep",
    steps: "Steps",
    hrv: "Heart rate variability",
    spo2: "Blood oxygen",
    energy: "Energy burned",
    hydration: "Hydration",
    vo2: "VO₂ max"
  };
  const title = titles[metricKey] || "Metric";
  const totalSleep = FV.sleepStages.reduce((a, s) => a + s.min, 0) - FV.sleepStages[0].min;
  return /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: title,
    sub: "Last 7 days",
    onBack: onBack,
    right: /*#__PURE__*/React.createElement("button", {
      onClick: onAsk,
      "aria-label": "Ask AI",
      style: {
        width: 40,
        height: 40,
        borderRadius: "var(--radius-pill)",
        border: "none",
        background: "var(--ai-gradient)",
        color: "#05131F",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "var(--glow-soft)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 18
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: 18,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "fv-eyebrow",
    style: {
      marginBottom: 6
    }
  }, isSleep ? "Last night" : "Today"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-5xl)",
      color: m.hue
    }
  }, m.value), m.unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-lg)",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, m.unit))), /*#__PURE__*/React.createElement(Badge, {
    tone: m.dir === "up" ? "positive" : "danger"
  }, m.dir === "up" ? "▲" : "▼", " ", m.delta)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      margin: "14px 0 6px"
    }
  }, ["D", "W", "M", "6M", "Y"].map(r => /*#__PURE__*/React.createElement(Chip, {
    key: r,
    selected: range === r,
    onClick: () => setRange(r),
    style: {
      flex: 1,
      justifyContent: "center",
      padding: 0
    }
  }, r))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: m.week,
    labels: FV.days,
    hue: m.hue,
    height: 150,
    goal: metricKey === "steps" ? 10000 : undefined
  })), isSleep && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionLabel, null, "Stages \xB7 last night"), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 14,
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      marginBottom: 16
    }
  }, FV.sleepStages.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.type,
    style: {
      width: `${s.min / (totalSleep + FV.sleepStages[0].min) * 100}%`,
      background: s.hue
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, FV.sleepStages.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.type,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: s.hue
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      flex: 1
    }
  }, s.type), /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-sm)"
    }
  }, fmtMin(s.min))))))), /*#__PURE__*/React.createElement(SectionLabel, null, isSleep ? "Related" : "This week"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, (isSleep ? ["hrv", "restingHr"] : ["steps", "energy"]).map(k => {
    const r = FV.metrics[k];
    return /*#__PURE__*/React.createElement(StatTile, {
      key: k,
      label: k === "hrv" ? "HRV" : k === "restingHr" ? "Resting HR" : k === "steps" ? "Steps" : "Energy",
      value: r.value,
      unit: r.unit,
      hue: r.hue,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: r.icon,
        size: 17
      }),
      delta: r.delta,
      deltaDir: r.dir,
      spark: r.week
    });
  })), /*#__PURE__*/React.createElement(InsightCard, {
    title: isSleep ? "Why last night was good" : "What FitVibe sees",
    style: {
      marginTop: 18
    },
    footer: /*#__PURE__*/React.createElement("button", {
      onClick: onAsk,
      style: {
        background: "none",
        border: "none",
        color: "var(--accent)",
        fontWeight: 700,
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3
      }
    }, "Ask a follow-up ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    }))
  }, isSleep ? "You got 66 min of deep sleep — 18% above your average — and woke only once. Your wind-down started earlier than usual, which likely helped." : `Your ${title.toLowerCase()} is trending in a healthy direction this week. Thursday was your standout day.`));
}
window.MetricDetailScreen = MetricDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/MetricDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/OnboardingScreen.jsx
try { (() => {
/* Onboarding / Google Health connect. */
function OnboardingScreen({
  onConnect
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    Button
  } = D;
  const {
    Icon
  } = window;
  const [connecting, setConnecting] = React.useState(false);
  const handle = () => {
    setConnecting(true);
    setTimeout(onConnect, 1100);
  };
  const syncs = [{
    icon: "heart",
    label: "Heart rate & HRV",
    hue: "var(--hue-heart)"
  }, {
    icon: "moon",
    label: "Sleep stages",
    hue: "var(--hue-sleep)"
  }, {
    icon: "footprints",
    label: "Steps & distance",
    hue: "var(--hue-move)"
  }, {
    icon: "flame",
    label: "Energy & activity",
    hue: "var(--hue-energy)"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      paddingTop: 54,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 32px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/app-icon.svg",
    width: "92",
    height: "92",
    alt: "FitVibe",
    style: {
      borderRadius: 24,
      boxShadow: "var(--glow-ai)",
      marginBottom: 26
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-3xl)",
      marginBottom: 12
    }
  }, "Your data, finally", /*#__PURE__*/React.createElement("br", null), "making sense."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-md)",
      color: "var(--text-body)",
      lineHeight: "var(--leading-relaxed)",
      maxWidth: 300,
      margin: 0
    }
  }, "FitVibe brings your Fitbit and Google Health data to life \u2014 with insights you can actually understand, and an AI you can ask anything."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      marginTop: 30,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, syncs.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-card)",
      boxShadow: "var(--ring-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.hue
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      fontWeight: 600,
      textAlign: "left"
    }
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 24px 30px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ai",
    size: "lg",
    block: true,
    disabled: connecting,
    iconLeft: connecting ? null : /*#__PURE__*/React.createElement(Icon, {
      name: "heart-pulse",
      size: 20
    }),
    onClick: handle
  }, connecting ? "Connecting…" : "Connect Google Health"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 16,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)"
    }
  }, "Your data stays private. Synced to your own device."))));
}
window.OnboardingScreen = OnboardingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProfileScreen.jsx
try { (() => {
/* Profile / settings. Hosts the theme + accent + dashboard-layout controls. */
function ProfileScreen({
  theme,
  accent,
  layout,
  setTheme,
  setAccent,
  setLayout,
  onReset
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    Card,
    Switch,
    Avatar,
    Badge
  } = D;
  const {
    Icon,
    FV
  } = window;
  const [push, setPush] = React.useState(true);
  const [metricUnits, setMetricUnits] = React.useState(true);
  const Seg = ({
    value,
    options,
    onChange
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      padding: 3,
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-inset)",
      border: "1px solid var(--border-subtle)"
    }
  }, options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    onClick: () => onChange(o.v),
    style: {
      padding: "6px 14px",
      borderRadius: "var(--radius-pill)",
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: "var(--text-xs)",
      background: value === o.v ? "var(--accent)" : "transparent",
      color: value === o.v ? "var(--text-on-accent)" : "var(--text-muted)",
      transition: "all var(--dur-base)"
    }
  }, o.label)));
  const Row = ({
    icon,
    hue,
    label,
    sub,
    right
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 13,
      padding: "13px 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-md)",
      background: `color-mix(in oklab, ${hue || "var(--accent)"} 16%, transparent)`,
      color: hue || "var(--accent)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-md)",
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, sub)), right);
  return /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 22,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: FV.user.name,
    size: 84,
    ring: true
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-2xl)",
      marginTop: 14
    }
  }, FV.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    hue: "move"
  }, "6-day move streak"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Member since 2024"))), /*#__PURE__*/React.createElement(SectionLabel, null, "Connected"), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, FV.devices.map((dv, i) => /*#__PURE__*/React.createElement("div", {
    key: dv.name
  }, /*#__PURE__*/React.createElement(Row, {
    icon: dv.icon,
    hue: "var(--hue-move)",
    label: dv.name,
    sub: dv.status,
    right: dv.battery != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: "var(--text-muted)",
        fontSize: "var(--text-xs)",
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "battery-medium",
      size: 18
    }), dv.battery, "%") : /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: "var(--hue-move)",
        boxShadow: "0 0 8px var(--hue-move)"
      }
    })
  }), i < FV.devices.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)"
    }
  })))), /*#__PURE__*/React.createElement(SectionLabel, null, "Appearance"), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "moon-star",
    label: "Theme",
    sub: "Dark is FitVibe's home",
    right: /*#__PURE__*/React.createElement(Seg, {
      value: theme,
      onChange: setTheme,
      options: [{
        v: "dark",
        label: "Dark"
      }, {
        v: "light",
        label: "Light"
      }]
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "palette",
    hue: "var(--accent-2)",
    label: "Accent",
    sub: "Signature color",
    right: /*#__PURE__*/React.createElement(Seg, {
      value: accent,
      onChange: setAccent,
      options: [{
        v: "default",
        label: "Vital"
      }, {
        v: "sunset",
        label: "Sunset"
      }]
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "layout-dashboard",
    hue: "var(--hue-sleep)",
    label: "Dashboard",
    sub: "Today layout",
    right: /*#__PURE__*/React.createElement(Seg, {
      value: layout,
      onChange: setLayout,
      options: [{
        v: "a",
        label: "Rings"
      }, {
        v: "b",
        label: "Focus"
      }]
    })
  })), /*#__PURE__*/React.createElement(SectionLabel, null, "Preferences"), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "bell",
    hue: "var(--hue-energy)",
    label: "Insight notifications",
    sub: "Daily summary at 8am",
    right: /*#__PURE__*/React.createElement(Switch, {
      checked: push,
      onChange: setPush
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "ruler",
    hue: "var(--hue-oxygen)",
    label: "Metric units",
    sub: "km, kg, \xB0C",
    right: /*#__PURE__*/React.createElement(Switch, {
      checked: metricUnits,
      onChange: setMetricUnits
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "shield-check",
    hue: "var(--hue-mind)",
    label: "Data & privacy",
    sub: "Stored on your device",
    right: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 18,
      color: "var(--text-faint)"
    })
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onReset,
    style: {
      width: "100%",
      marginTop: 18,
      padding: "14px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-subtle)",
      background: "transparent",
      color: "var(--text-muted)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rotate-ccw",
    size: 16
  }), " Replay onboarding"));
}
window.ProfileScreen = ProfileScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TodayScreen.jsx
try { (() => {
/* Today — the dashboard. `layout` toggles two variations (rings-hero vs compact). */
function TodayScreen({
  layout = "a",
  onOpenMetric,
  onAsk
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    ProgressRing,
    StatTile,
    InsightCard,
    Card,
    Badge,
    Button
  } = D;
  const {
    Icon,
    FV
  } = window;
  const t = FV.today;
  const ringLegend = [{
    label: "Move",
    val: `${t.moveKcal}`,
    unit: "kcal",
    goal: t.moveGoal,
    hue: "var(--hue-move)"
  }, {
    label: "Exercise",
    val: `${t.exerciseMin}`,
    unit: "min",
    goal: t.exerciseGoal,
    hue: "var(--hue-heart)"
  }, {
    label: "Active",
    val: `${t.activeHr}`,
    unit: "hr",
    goal: t.activeGoal,
    hue: "var(--hue-oxygen)"
  }];
  const tiles = [{
    k: "restingHr",
    label: "Resting HR"
  }, {
    k: "sleep",
    label: "Sleep"
  }, {
    k: "steps",
    label: "Steps"
  }, {
    k: "hrv",
    label: "HRV"
  }];
  const Greeting = /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 8,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "fv-eyebrow",
    style: {
      marginBottom: 4
    }
  }, t.dateLabel), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-3xl)"
    }
  }, "Hi ", FV.user.first)), /*#__PURE__*/React.createElement("button", {
    onClick: onAsk,
    "aria-label": "Notifications",
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-pill)",
      border: "1px solid var(--border-strong)",
      background: "var(--surface-card)",
      color: "var(--text-body)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 11,
      right: 12,
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--accent)",
      boxShadow: "0 0 0 2px var(--bg-page)"
    }
  })));
  const Rings = /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(ProgressRing, {
    size: layout === "a" ? 150 : 120,
    rings: [{
      value: t.rings.move,
      hue: "var(--hue-move)"
    }, {
      value: t.rings.exercise,
      hue: "var(--hue-heart)"
    }, {
      value: t.rings.active,
      hue: "var(--hue-oxygen)"
    }]
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-2xl)"
    }
  }, Math.round(t.rings.move * 100), "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      fontWeight: 700,
      letterSpacing: ".1em"
    }
  }, "MOVE")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, ringLegend.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.label
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: r.hue,
      boxShadow: `0 0 8px ${r.hue}`
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, r.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 4,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-lg)"
    }
  }, r.val), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, r.unit, " / ", r.goal)))))));
  const featured = FV.insights[0];
  const Insight = /*#__PURE__*/React.createElement(InsightCard, {
    title: featured.title,
    style: {
      marginTop: layout === "a" ? 22 : 18
    },
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, featured.tags.map(([txt, hue]) => /*#__PURE__*/React.createElement(Badge, {
      key: txt,
      hue: hue
    }, txt)), /*#__PURE__*/React.createElement("button", {
      onClick: onAsk,
      style: {
        marginLeft: "auto",
        background: "none",
        border: "none",
        color: "var(--accent)",
        fontWeight: 700,
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3
      }
    }, "Ask more ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    })))
  }, featured.body);
  const Workout = /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    pad: "md",
    style: {
      marginTop: 12
    },
    onClick: () => onOpenMetric("steps")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-md)",
      background: "color-mix(in oklab, var(--hue-move) 16%, transparent)",
      color: "var(--hue-move)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "footprints",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "var(--text-strong)",
      fontSize: "var(--text-md)"
    }
  }, FV.workout.type), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, FV.workout.dist, " \xB7 ", FV.workout.dur, " \xB7 ", FV.workout.pace)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-lg)",
      color: "var(--hue-move)"
    }
  }, FV.workout.kcal), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-faint)",
      fontWeight: 700,
      letterSpacing: ".08em"
    }
  }, "KCAL"))));
  const Tiles = /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, tiles.map(({
    k,
    label
  }) => {
    const m = FV.metrics[k];
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      onClick: () => onOpenMetric(k),
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(StatTile, {
      label: label,
      value: m.value,
      unit: m.unit,
      hue: m.hue,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: m.icon,
        size: 17
      }),
      delta: m.delta,
      deltaDir: m.dir,
      spark: m.week,
      goal: m.goal
    }));
  }));
  return /*#__PURE__*/React.createElement(Scroll, null, Greeting, layout === "a" ? /*#__PURE__*/React.createElement(React.Fragment, null, Rings, /*#__PURE__*/React.createElement(SectionLabel, {
    action: "All metrics",
    onAction: () => onOpenMetric("sleep")
  }, "Today"), Tiles, Insight, /*#__PURE__*/React.createElement(SectionLabel, null, "Latest activity"), Workout) : /*#__PURE__*/React.createElement(React.Fragment, null, Insight, Rings, /*#__PURE__*/React.createElement(SectionLabel, {
    action: "All metrics",
    onAction: () => onOpenMetric("sleep")
  }, "Today"), Tiles, /*#__PURE__*/React.createElement(SectionLabel, null, "Latest activity"), Workout));
}
window.TodayScreen = TodayScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TodayScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TrendsScreen.jsx
try { (() => {
/* Trends — pick a metric, range, and compare. */
function TrendsScreen({
  onOpenMetric
}) {
  const D = window.FitVibeDesignSystem_52b6f8;
  const {
    BarChart,
    Card,
    Chip,
    Badge
  } = D;
  const {
    Icon,
    FV
  } = window;
  const metricList = [{
    k: "steps",
    label: "Steps"
  }, {
    k: "sleep",
    label: "Sleep"
  }, {
    k: "restingHr",
    label: "Resting HR"
  }, {
    k: "hrv",
    label: "HRV"
  }, {
    k: "energy",
    label: "Energy"
  }, {
    k: "hydration",
    label: "Hydration"
  }];
  const [sel, setSel] = React.useState("steps");
  const [range, setRange] = React.useState("W");
  const m = FV.metrics[sel];
  const avg = Math.round(m.week.reduce((a, b) => a + b, 0) / m.week.length);
  const max = Math.max(...m.week),
    min = Math.min(...m.week);
  const fmt = v => sel === "hydration" ? `${v} L` : sel === "sleep" ? window.fmtMin(v) : v.toLocaleString();
  const label = metricList.find(x => x.k === sel).label;
  const summary = [{
    l: "Average",
    v: fmt(avg)
  }, {
    l: "Best",
    v: fmt(max)
  }, {
    l: "Lowest",
    v: fmt(min)
  }];
  return /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fv-eyebrow",
    style: {
      marginBottom: 4
    }
  }, "Patterns over time"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "var(--text-3xl)"
    }
  }, "Trends")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      margin: "16px 0 4px",
      overflowX: "auto",
      paddingBottom: 4
    }
  }, metricList.map(x => /*#__PURE__*/React.createElement(Chip, {
    key: x.k,
    selected: sel === x.k,
    onClick: () => setSel(x.k),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: FV.metrics[x.k].icon,
      size: 15
    }),
    style: {
      flex: "0 0 auto"
    }
  }, x.label))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "fv-eyebrow"
  }, label, " \xB7 avg"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 5,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-4xl)",
      color: m.hue
    }
  }, fmt(avg)), m.unit && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, m.unit))), /*#__PURE__*/React.createElement(Badge, {
    tone: m.dir === "up" ? "positive" : "danger"
  }, m.dir === "up" ? "▲" : "▼", " ", m.delta)), /*#__PURE__*/React.createElement(BarChart, {
    data: m.week,
    labels: FV.days,
    hue: m.hue,
    height: 150,
    goal: sel === "steps" ? 10000 : undefined
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 16
    }
  }, ["W", "M", "6M", "Y"].map(r => /*#__PURE__*/React.createElement(Chip, {
    key: r,
    selected: range === r,
    onClick: () => setRange(r),
    style: {
      flex: 1,
      justifyContent: "center",
      padding: 0
    }
  }, r)))), /*#__PURE__*/React.createElement(SectionLabel, null, "Summary"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12
    }
  }, summary.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.l,
    pad: "md",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fv-stat",
    style: {
      fontSize: "var(--text-xl)"
    }
  }, s.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-muted)",
      fontWeight: 700,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      marginTop: 4
    }
  }, s.l)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenMetric(sel),
    style: {
      width: "100%",
      marginTop: 14,
      padding: "14px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-strong)",
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    }
  }, "Open ", label, " detail ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 16
  })));
}
window.TrendsScreen = TrendsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TrendsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.jsx
try { (() => {
/* FitVibe UI kit — shared data, icon helper, and small utilities.
   Exported to window so each Babel screen file can use them. */

/* ---- Lucide icon as a clean React SVG (no DOM mutation) -------------- */
function toPascal(name) {
  return String(name).split(/[-_ ]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}
function Icon({
  name,
  size = 20,
  stroke = 2,
  color,
  style,
  ...rest
}) {
  const node = window.lucide && window.lucide.icons && window.lucide.icons[toPascal(name)] || [];
  const children = node.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  }));
  return React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color || "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "block",
      flex: "0 0 auto",
      ...style
    },
    ...rest
  }, children);
}

/* ---- Fake but realistic health data --------------------------------- */
const FV = {
  user: {
    name: "Maya Okonkwo",
    first: "Maya",
    device: "Fitbit Charge 6"
  },
  today: {
    dateLabel: "Monday, June 15",
    rings: {
      move: 0.82,
      exercise: 0.64,
      active: 0.47
    },
    moveKcal: 612,
    moveGoal: 750,
    exerciseMin: 32,
    exerciseGoal: 50,
    activeHr: 9,
    activeGoal: 12
  },
  metrics: {
    restingHr: {
      value: 54,
      unit: "bpm",
      delta: "3 bpm",
      dir: "down",
      hue: "var(--hue-heart)",
      icon: "heart",
      week: [58, 57, 57, 56, 55, 54, 54]
    },
    steps: {
      value: "8,240",
      unit: "",
      delta: "12%",
      dir: "up",
      hue: "var(--hue-move)",
      icon: "footprints",
      goal: "/ 10k",
      week: [6200, 9100, 7400, 12030, 8800, 6400, 8240]
    },
    sleep: {
      value: "7h 12m",
      unit: "",
      delta: "24m",
      dir: "up",
      hue: "var(--hue-sleep)",
      icon: "moon",
      week: [402, 418, 395, 470, 441, 388, 432]
    },
    spo2: {
      value: 97,
      unit: "%",
      delta: "stable",
      dir: "up",
      hue: "var(--hue-oxygen)",
      icon: "wind",
      week: [96, 97, 96, 97, 98, 97, 97]
    },
    energy: {
      value: "1,940",
      unit: "kcal",
      delta: "6%",
      dir: "up",
      hue: "var(--hue-energy)",
      icon: "flame",
      week: [1820, 2010, 1760, 2240, 1980, 1700, 1940]
    },
    hydration: {
      value: "1.6",
      unit: "L",
      delta: "0.4 L",
      dir: "down",
      hue: "var(--hue-hydration)",
      icon: "glass-water",
      goal: "/ 2.5L",
      week: [2.1, 2.4, 1.9, 2.6, 2.2, 1.4, 1.6]
    },
    hrv: {
      value: 62,
      unit: "ms",
      delta: "12%",
      dir: "up",
      hue: "var(--hue-mind)",
      icon: "activity",
      week: [52, 55, 54, 58, 60, 61, 62]
    },
    vo2: {
      value: 44,
      unit: "ml/kg",
      delta: "1",
      dir: "up",
      hue: "var(--hue-move)",
      icon: "gauge",
      week: [42, 42, 43, 43, 43, 44, 44]
    }
  },
  sleepStages: [{
    type: "Awake",
    min: 24,
    hue: "var(--hue-heart)"
  }, {
    type: "REM",
    min: 96,
    hue: "var(--hue-mind)"
  }, {
    type: "Light",
    min: 246,
    hue: "var(--hue-sleep)"
  }, {
    type: "Deep",
    min: 66,
    hue: "var(--sky-400)"
  }],
  workout: {
    type: "Outdoor run",
    icon: "footprints",
    dist: "5.2 km",
    dur: "27:41",
    pace: "5:19 /km",
    kcal: 384,
    hr: 156,
    hue: "var(--hue-move)"
  },
  insights: [{
    id: 1,
    title: "Your recovery is trending up",
    icon: "trending-up",
    body: "Resting HR dropped 3 bpm and HRV rose 12% this week — your training load looks well matched to recovery. Consider a harder session tomorrow.",
    tags: [["HRV ▲12%", "mind"], ["Resting HR ▼", "heart"]]
  }, {
    id: 2,
    title: "Sleep is paying off",
    icon: "moon",
    body: "You've hit 7+ hours four nights running. Deep sleep is up 18% vs last week, which tracks with your higher HRV.",
    tags: [["Deep ▲18%", "sleep"]]
  }, {
    id: 3,
    title: "Hydration dipped on the weekend",
    icon: "droplet",
    tone: "plain",
    body: "Saturday and Sunday came in under 1.6 L. On low-water days your resting HR ran ~4 bpm higher. Worth topping up earlier in the day.",
    tags: [["−0.9 L vs goal", "hydration"]]
  }],
  chat: [{
    role: "user",
    text: "How did I sleep last week?"
  }, {
    role: "assistant",
    text: "You averaged 7h 12m across the week — Thursday was your best night at 7h 50m. Deep sleep is trending up, which lines up with your higher HRV.",
    gen: "sleepWeek"
  }, {
    role: "user",
    text: "Is my running fitness improving?"
  }, {
    role: "assistant",
    text: "Yes — your VO₂ max nudged from 42 to 44 ml/kg over the last month and your easy-run pace dropped ~15 s/km at the same heart rate. Steady, healthy progress.",
    gen: "vo2"
  }],
  prompts: ["How's my recovery?", "Compare my sleep to last week", "Why is my resting HR up?", "Plan tomorrow's workout"],
  devices: [{
    name: "Fitbit Charge 6",
    status: "Synced 4 min ago",
    battery: 72,
    icon: "watch"
  }, {
    name: "Google Health",
    status: "Connected",
    battery: null,
    icon: "heart-pulse"
  }],
  days: ["M", "T", "W", "T", "F", "S", "S"]
};
function fmtMin(min) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
Object.assign(window, {
  Icon,
  FV,
  fmtMin,
  toPascal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ChatMessage = __ds_scope.ChatMessage;

__ds_ns.InsightCard = __ds_scope.InsightCard;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.Sparkline = __ds_scope.Sparkline;

__ds_ns.StatTile = __ds_scope.StatTile;

})();
