<!-- @keywords: figma, best practices, naming convention, component organization, token, style guide, design handoff, version -->
<!-- @domain: Figma MCP Server — Best Practices & File Organization -->

# Figma MCP Server — Best Practices & File Organization

## File Structure for Optimal MCP Access

When you structure your Figma files well, Claude can navigate them much more efficiently.

### Recommended File Layout

```
📄 Design System (main file)
├── 📑 Cover (file thumbnail page)
├── 📑 Tokens
│   ├── 🖼 Colors
│   ├── 🖼 Typography
│   ├── 🖼 Spacing
│   └── 🖼 Effects
├── 📑 Components
│   ├── 🖼 Foundations (Icon, Avatar, Badge)
│   ├── 🖼 Inputs (Button, Input, Select, Checkbox)
│   ├── 🖼 Feedback (Alert, Toast, Progress, Skeleton)
│   ├── 🖼 Navigation (Navbar, Sidebar, Breadcrumb, Tabs)
│   └── 🖼 Layout (Card, Modal, Drawer, Divider)
├── 📑 Patterns
│   └── 🖼 Forms, Tables, Data Display
└── 📄 Product (linked file — uses components from Design System)
```

---

## Naming Conventions

### Component Names

Follow a `Category/Name/Variant` pattern — this is what Claude will search:

```
✅ Button/Primary/Default
✅ Button/Primary/Hover
✅ Button/Ghost/Disabled
✅ Input/Text/Error
✅ Card/Product/Compact

❌ button
❌ Button copy 2
❌ new button (dark)
```

### Style Names

```
Colors:
✅ brand/primary-500
✅ semantic/bg-surface
✅ semantic/text-primary
✅ feedback/error-500

Typography:
✅ body/md/regular
✅ heading/xl/semibold
✅ label/sm/medium
✅ code/sm/mono

Effects:
✅ shadow/card
✅ shadow/dropdown
✅ shadow/modal
```

### Layer Names

```
✅ Use PascalCase for components: CardHeader, UserAvatar
✅ Use kebab-case for layout layers: content-wrapper, hero-section
✅ Name auto-layout frames by purpose, not position: button-icon, not "Frame 42"

❌ Frame 17, Group 3, Rectangle 8 (Figma defaults — always rename)
```

---

## Token Organization for Claude Extraction

Claude reads token names literally — clear hierarchical naming makes extraction reliable:

```
# Color token naming that extracts cleanly:
color/brand/blue/50    → var(--color-brand-blue-50)
color/brand/blue/500   → var(--color-brand-blue-500)
color/brand/blue/900   → var(--color-brand-blue-900)
color/neutral/gray/100 → var(--color-neutral-gray-100)
color/semantic/bg/page → var(--color-semantic-bg-page)
color/semantic/bg/card → var(--color-semantic-bg-card)
```

When you ask Claude:
```
Extract all tokens from Figma file "ABCD1234" where the style name 
starts with "color/semantic/" — these are my semantic tokens.
Map them to CSS custom properties.
```

---

## Variant & Props Best Practices

### Boolean Props

Use ✓/✗ or True/False for booleans — Figma maps these to checkboxes:

```
Variant property: "Has Icon"
Values: True | False

Variant property: "Is Loading" 
Values: True | False
```

### Interactive States

Always create these states for interactive components:
```
Default → the resting state
Hover   → mouse over
Focus   → keyboard focus (with visible focus ring — accessibility)
Active  → during click/press
Disabled → non-interactive state
```

Ask Claude to verify:
```
Get the "Button/Primary" component from Figma file "ABCD1234".
Does it have all 5 interactive states? (Default, Hover, Focus, Active, Disabled)
If any are missing, describe what they should look like based on the existing states.
```

---

## What Slows Down MCP Reads

| Situation | Problem | Fix |
|-----------|---------|-----|
| Deeply nested components | Full file read is very large | Get specific node IDs instead of the full file |
| Thousands of layers | `get_file` response times out | Use `get_file_nodes` with specific frame IDs |
| Unnamed layers (Frame 42, Group 3) | Claude can't identify what it's looking at | Always name your layers |
| Components not published to library | Can't use `get_team_components` | Publish your component library |
| Multiple files for one system | Requires multiple reads | Consolidate into one design system file |

---

## Getting Specific Node IDs

Instead of reading the entire file, get the node ID for efficiency:

In Figma: Right-click any frame → **Copy/Paste → Copy link**  
The URL contains the node ID:
```
https://www.figma.com/design/ABCD1234/file?node-id=12-345
                                                     ^^^^^^
                                                     node-id=12:345 (replace - with :)
```

Then ask Claude:
```
Get node "12:345" from Figma file "ABCD1234" — 
this is the Button component set. Extract all variants.
```

---

## Handoff Checklist

Before asking Claude to implement a design from Figma, ensure:

- [ ] All components are properly named (Category/Name/Variant)
- [ ] All colors use styles (not hard-coded hex values)
- [ ] All text uses text styles (not manual font settings)  
- [ ] Auto layout is used (not manual positioning)
- [ ] Constraints are set for responsive behavior
- [ ] States are complete (default, hover, focus, disabled at minimum)
- [ ] Content uses realistic text (not Lorem Ipsum)
- [ ] Spacing follows the grid (not arbitrary pixel values)

Then tell Claude:
```
Get the "Checkout Form" frame from Figma file "ABCD1234".
It follows our design system conventions. 
Implement it as a React component with form validation using react-hook-form + zod.
```
