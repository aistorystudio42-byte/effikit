/**
 * @keywords    color, token, theme, typography, font, spacing, radius, shadow, palette, design system, design tokens
 * @domain      Design Tokens
 * @use-when    You need consistent design values across the app: colors, spacing scale, font sizes, shadows
 * @not-when    You need component logic or layout structure — tokens are pure values, not components
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const palette = {
  // Core neutrals — basis for all text and surfaces
  gray: {
    50: "#F9FAFB", 100: "#F3F4F6", 200: "#E5E7EB", 300: "#D1D5DB",
    400: "#9CA3AF", 500: "#6B7280", 600: "#4B5563", 700: "#374151",
    800: "#1F2937", 900: "#111827", 950: "#030712",
  },
  // Primary brand color
  blue: {
    50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
    400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
    800: "#1E40AF", 900: "#1E3A8A",
  },
  // Success states
  green: {
    50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0", 300: "#86EFAC",
    400: "#4ADE80", 500: "#22C55E", 600: "#16A34A", 700: "#15803D",
    800: "#166534", 900: "#14532D",
  },
  // Error / danger states
  red: {
    50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5",
    400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C",
    800: "#991B1B", 900: "#7F1D1D",
  },
  // Warning states
  yellow: {
    50: "#FEFCE8", 100: "#FEF9C3", 200: "#FEF08A", 300: "#FDE047",
    400: "#FACC15", 500: "#EAB308", 600: "#CA8A04", 700: "#A16207",
    800: "#854D0E", 900: "#713F12",
  },
  // Accent / secondary brand
  purple: {
    50: "#FAF5FF", 100: "#F3E8FF", 200: "#E9D5FF", 300: "#D8B4FE",
    400: "#C084FC", 500: "#A855F7", 600: "#9333EA", 700: "#7E22CE",
    800: "#6B21A8", 900: "#581C87",
  },
  // White / Black
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

// ─── Semantic Color Tokens ────────────────────────────────────────────────────
// Maps semantic intent to palette values — use these in components, not raw palette

export const colors = {
  // Text
  text: {
    primary: palette.gray[900],
    secondary: palette.gray[600],
    tertiary: palette.gray[400],
    inverse: palette.white,
    link: palette.blue[600],
    linkHover: palette.blue[700],
    error: palette.red[600],
    success: palette.green[600],
    warning: palette.yellow[700],
  },
  // Backgrounds
  bg: {
    default: palette.white,
    subtle: palette.gray[50],
    muted: palette.gray[100],
    emphasis: palette.gray[900],
    overlay: "rgba(0,0,0,0.5)",
    error: palette.red[50],
    success: palette.green[50],
    warning: palette.yellow[50],
    info: palette.blue[50],
  },
  // Borders
  border: {
    default: palette.gray[200],
    strong: palette.gray[300],
    focus: palette.blue[500],
    error: palette.red[500],
    success: palette.green[500],
  },
  // Brand
  brand: {
    primary: palette.blue[600],
    primaryHover: palette.blue[700],
    primaryLight: palette.blue[50],
    secondary: palette.purple[600],
    secondaryHover: palette.purple[700],
    secondaryLight: palette.purple[50],
  },
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'].join(', '),
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'].join(', '),
    serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'].join(', '),
  },
  // Font sizes — name: [size, line-height]
  fontSize: {
    xs:   { size: '0.75rem',  lineHeight: '1rem' },      // 12px
    sm:   { size: '0.875rem', lineHeight: '1.25rem' },   // 14px
    base: { size: '1rem',     lineHeight: '1.5rem' },    // 16px
    md:   { size: '1rem',     lineHeight: '1.5rem' },    // 16px
    lg:   { size: '1.125rem', lineHeight: '1.75rem' },   // 18px
    xl:   { size: '1.25rem',  lineHeight: '1.75rem' },   // 20px
    "2xl": { size: '1.5rem',  lineHeight: '2rem' },      // 24px
    "3xl": { size: '1.875rem', lineHeight: '2.25rem' },  // 30px
    "4xl": { size: '2.25rem', lineHeight: '2.5rem' },    // 36px
    "5xl": { size: '3rem',    lineHeight: '1' },         // 48px
    "6xl": { size: '3.75rem', lineHeight: '1' },         // 60px
  },
  // Font weights
  fontWeight: {
    thin:       100,
    light:      300,
    regular:    400,
    medium:     500,
    semibold:   600,
    bold:       700,
    extrabold:  800,
    black:      900,
  },
  // Letter spacing
  letterSpacing: {
    tight:  '-0.025em',
    normal: '0em',
    wide:   '0.025em',
    wider:  '0.05em',
    widest: '0.1em',
  },
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────────────
// Base unit: 4px (0.25rem). Scale follows Tailwind convention.

export const spacing = {
  0:    '0px',
  px:   '1px',
  0.5:  '2px',
  1:    '4px',
  1.5:  '6px',
  2:    '8px',
  2.5:  '10px',
  3:    '12px',
  3.5:  '14px',
  4:    '16px',
  5:    '20px',
  6:    '24px',
  7:    '28px',
  8:    '32px',
  9:    '36px',
  10:   '40px',
  11:   '44px',
  12:   '48px',
  14:   '56px',
  16:   '64px',
  20:   '80px',
  24:   '96px',
  28:   '112px',
  32:   '128px',
  36:   '144px',
  40:   '160px',
  48:   '192px',
  56:   '224px',
  64:   '256px',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  none:   '0px',
  sm:     '2px',
  base:   '4px',
  md:     '6px',
  lg:     '8px',
  xl:     '12px',
  "2xl":  '16px',
  "3xl":  '24px',
  full:   '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  none:   'none',
  xs:     '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm:     '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md:     '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg:     '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl:     '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  "2xl":  '0 25px 50px -12px rgba(0,0,0,0.25)',
  inner:  'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  // Colored shadows for elevated brand elements
  brand:  '0 4px 14px 0 rgba(37,99,235,0.3)',
  danger: '0 4px 14px 0 rgba(220,38,38,0.3)',
} as const;

// ─── Z-Index Scale ────────────────────────────────────────────────────────────

export const zIndex = {
  hide:     -1,
  base:      0,
  raised:   10,
  dropdown: 20,
  sticky:   30,
  overlay:  40,
  modal:    50,
  popover:  60,
  toast:    70,
  tooltip:  80,
} as const;

// ─── Transition ───────────────────────────────────────────────────────────────

export const transition = {
  duration: {
    instant:  '50ms',
    fast:     '100ms',
    normal:   '200ms',
    slow:     '300ms',
    slower:   '500ms',
    slowest:  '700ms',
  },
  easing: {
    linear:     'linear',
    easeIn:     'cubic-bezier(0.4, 0, 1, 1)',
    easeOut:    'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut:  'cubic-bezier(0.4, 0, 0.2, 1)',
    // Spring-like easing for UI motion
    spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // Snappy deceleration for dropdowns/tooltips
    snap:       'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const breakpoints = {
  sm:   640,
  md:   768,
  lg:   1024,
  xl:   1280,
  "2xl": 1536,
} as const;

// ─── Theme Object (aggregated) ────────────────────────────────────────────────

export const theme = {
  palette,
  colors,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  transition,
  breakpoints,
} as const;

export type Theme = typeof theme;

// ─── CSS Variable Generator ───────────────────────────────────────────────────
// Call this to inject CSS variables into :root for use in plain CSS or Tailwind CSS vars

export function generateCSSVariables(t: Theme = theme): string {
  const vars: string[] = [];

  // Text colors
  Object.entries(t.colors.text).forEach(([k, v]) => vars.push(`--color-text-${k}: ${v};`));
  // Background colors
  Object.entries(t.colors.bg).forEach(([k, v]) => vars.push(`--color-bg-${k}: ${v};`));
  // Brand colors
  Object.entries(t.colors.brand).forEach(([k, v]) => vars.push(`--color-brand-${k}: ${v};`));
  // Spacing
  Object.entries(t.spacing).forEach(([k, v]) => vars.push(`--spacing-${k}: ${v};`));
  // Radius
  Object.entries(t.radius).forEach(([k, v]) => vars.push(`--radius-${k}: ${v};`));
  // Shadows
  Object.entries(t.shadows).forEach(([k, v]) => vars.push(`--shadow-${k}: ${v};`));
  // Typography
  Object.entries(t.typography.fontSize).forEach(([k, v]) => {
    vars.push(`--font-size-${k}: ${v.size};`);
    vars.push(`--line-height-${k}: ${v.lineHeight};`);
  });

  return `:root {\n  ${vars.join('\n  ')}\n}`;
}

/*
 * Usage Examples:
 *
 * // Direct token usage in styled-components or CSS-in-JS
 * const StyledCard = styled.div`
 *   background: ${colors.bg.default};
 *   border: 1px solid ${colors.border.default};
 *   border-radius: ${radius.lg};
 *   box-shadow: ${shadows.sm};
 *   padding: ${spacing[4]};
 * `;
 *
 * // Generate and inject CSS variables (call once at app root)
 * const css = generateCSSVariables();
 * document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
 *
 * // Use in Tailwind extend config
 * // tailwind.config.js → theme.extend.colors = palette.blue (etc.)
 */
