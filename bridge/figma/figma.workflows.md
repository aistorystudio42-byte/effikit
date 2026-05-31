<!-- @keywords: figma, design to code, token extraction, component spec, variant, auto layout, spacing, responsive, handoff -->
<!-- @domain: Figma MCP Server — Design-to-Code Workflows -->

# Figma MCP Server — Design-to-Code Workflows

## Design-to-Code Pipeline

The core workflow: read Figma → understand the design → generate accurate code.

```
1. Get Figma file structure → identify which frames/components you need
2. Extract design tokens → colors, typography, spacing
3. Read component specs → dimensions, variants, states  
4. Generate code → React, CSS, Tailwind, or styled-components
5. Cross-check → verify generated code matches the spec
```

---

## Token Extraction Workflows

### Complete Design System Extraction

```
Get Figma file "ABCD1234" and do a complete design token extraction:

For colors: extract all fills, group by category (brand, neutral, semantic, 
feedback), include hex values and opacity

For typography: extract all text styles, show: font-family, size, 
weight, line-height, letter-spacing, and text-transform

For spacing: analyze the most common spacing values used across 
all frames — infer the spacing scale (4px, 8px, 16px, etc.)

For border radius: find all cornerRadius values used and group them 
by size (none, sm, md, lg, full)

Output as a Tailwind CSS config object I can paste into tailwind.config.ts
```

### Semantic Color Extraction

```
Get Figma file "ABCD1234" and extract the semantic color system:
- Look for styles named like: "text/primary", "bg/surface", "border/default"
- Map them to semantic tokens: --color-text-primary, --color-bg-surface
- Identify light and dark mode variants if they exist (look for styles 
  prefixed with "light/" and "dark/")

Output as CSS custom properties with both light and dark mode declarations.
```

### Shadow Extraction

```
Get all effect styles from Figma file "ABCD1234".
For each shadow, output a CSS box-shadow value and a Tailwind 
custom shadow class name.
```

---

## Component Implementation Workflow

### Step 1 — Read the Component Spec

```
Get the "Button" component from Figma file "ABCD1234".

For each variant (Primary, Secondary, Ghost, Destructive):
- Background color, text color, border color
- Padding (horizontal and vertical)
- Border radius, border width
- Font size, font weight

For each state (default, hover, focus, disabled, loading):
- What visually changes (color, opacity, cursor)

Output as a structured spec I can implement in TypeScript.
```

### Step 2 — Generate the Implementation

```
Based on this Button spec: [paste spec from step 1]

Generate a React component using Tailwind CSS with:
- TypeScript props interface with all variants and states
- Proper accessibility attributes (role, aria-disabled, aria-busy)
- Compound variants for size + variant combinations
- Loading state with spinner
- Forward ref support

Use class-variance-authority (cva) for variant management.
```

### Step 3 — Verify Against Original

```
Get the "Button/Primary/Default" node from Figma file "ABCD1234" 
and compare it against this component: [paste component code]

Are there any visual discrepancies I should fix?
```

---

## Auto Layout Translation

Auto Layout in Figma maps directly to CSS Flexbox and Grid:

```
Get the "Card" component from Figma file "ABCD1234" and describe 
its Auto Layout structure.

For each frame with Auto Layout enabled, show:
- Direction (horizontal/vertical → flex-row/flex-col)
- Gap between items (gap-*)
- Padding (p-* or px-*/py-*)
- Alignment (items-*, justify-*)
- Whether items fill or hug content (flex-1 vs w-fit)

Translate the entire component tree to Tailwind classes.
```

**Figma → Tailwind mapping:**
| Figma | CSS | Tailwind |
|-------|-----|---------|
| Horizontal Auto Layout | `display: flex; flex-direction: row` | `flex flex-row` |
| Vertical Auto Layout | `display: flex; flex-direction: column` | `flex flex-col` |
| Gap: 8 | `gap: 8px` | `gap-2` |
| Padding: 16 all | `padding: 16px` | `p-4` |
| Fill container | `flex: 1 1 0%` | `flex-1` |
| Hug contents | `width: fit-content` | `w-fit` |
| Align center | `align-items: center` | `items-center` |
| Space between | `justify-content: space-between` | `justify-between` |

---

## Icon Extraction

```
Get all frames inside the "Icons" page of Figma file "ABCD1234".
For each icon:
- Export as SVG
- Convert to a React component with:
  - Size prop (default 24px)
  - Color prop using currentColor
  - Proper aria-hidden="true" for decorative icons
  - Title prop for accessible icons

Output all icons as a single icon library file: src/components/icons/index.tsx
```

---

## Responsive Breakpoint Analysis

```
Get the "Homepage" page from Figma file "ABCD1234".
I can see there are three frames: "Desktop (1440px)", "Tablet (768px)", 
and "Mobile (375px)".

Compare the three frames and document:
1. What changes between desktop and tablet (layout, font sizes, spacing)
2. What changes between tablet and mobile
3. What stays the same across all breakpoints
4. Are there any elements that appear or disappear between breakpoints?

Output as Tailwind responsive class documentation 
(e.g., "text-sm md:text-base lg:text-lg")
```

---

## Variant Mapping to Code

Figma component variants map to TypeScript discriminated unions:

```
Get the "Alert" component set from Figma file "ABCD1234".

List all variants and their properties:
- What are the variant properties? (e.g., "Type", "Size", "Has Icon")
- What values does each property take?
- Map each combination to visual differences

Then generate a TypeScript type for all valid variant combinations.
```

Example output:
```typescript
type AlertVariant = 
  | { type: 'info';    size: 'sm' | 'md'; hasIcon: boolean }
  | { type: 'success'; size: 'sm' | 'md'; hasIcon: boolean }
  | { type: 'warning'; size: 'sm' | 'md'; hasIcon: boolean }
  | { type: 'error';   size: 'sm' | 'md'; hasIcon: boolean };
```
