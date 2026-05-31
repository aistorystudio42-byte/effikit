<!-- @keywords: figma, design, tokens, component, mcp setup, figma api, plugin, design system, export -->
<!-- @domain: Figma MCP Server — Setup & Configuration -->

# Figma MCP Server — Setup & Configuration

## What This Is

The Figma MCP server lets Claude read your Figma files directly — extracting design tokens, component specs, styles, and layer data. Instead of manually copying values from Figma to code, you ask Claude to read the file and translate it.

---

## Installation

### Prerequisites
- A Figma account (free or Professional)
- A Figma Personal Access Token

### Step 1 — Generate Access Token

**Figma → Account Settings → Personal access tokens → Generate new token**

- Description: `claude-mcp`
- Expiration: Set one (tokens don't auto-expire by default, set 90 days for safety)
- Scope: `File content` (read-only is sufficient for most use cases)

### Step 2 — Get Your File Key

Open any Figma file. The URL looks like:
```
https://www.figma.com/design/ABCD1234EFGH5678/My-Design-System
                            ^^^^^^^^^^^^^^^^
                            This is the file key
```

### Step 3 — Add to claude_desktop_config.json

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_token_here"
      }
    }
  }
}
```

### Step 4 — Verify

Restart Claude Desktop. Ask:
> "Get the Figma file with key ABCD1234EFGH5678 and list its top-level pages"

---

## Available Tools

| Tool | What It Does |
|------|-------------|
| `get_file` | Full file tree — pages, frames, components, styles |
| `get_file_nodes` | Specific nodes by ID (faster than full file) |
| `get_component` | A published component's full spec |
| `get_component_set` | A component set (variants) |
| `get_style` | A published style (color, text, effect) |
| `get_image` | Export a node as PNG/SVG/PDF/JPEG |
| `get_comments` | All comments on the file |
| `get_file_versions` | Version history |
| `get_team_components` | All published components in a team library |
| `get_team_styles` | All published styles in a team library |

---

## Key Figma Concepts

### Node Types

| Node Type | What It Represents |
|-----------|-------------------|
| `DOCUMENT` | The root — contains pages |
| `PAGE` | A page in the file |
| `FRAME` | A container — screens, cards, sections |
| `COMPONENT` | A reusable component definition |
| `INSTANCE` | A placed copy of a component |
| `TEXT` | A text layer |
| `RECTANGLE` | A shape |
| `GROUP` | A non-layout grouping |
| `VECTOR` | A vector path |

### Design Token Locations

Tokens live in the `styles` object of the file response:
- **Color styles** → `styles[id].styleType === "FILL"`
- **Text styles** → `styles[id].styleType === "TEXT"`
- **Effect styles** → `styles[id].styleType === "EFFECT"` (shadows, blur)
- **Grid styles** → `styles[id].styleType === "GRID"`

---

## Common Prompt Examples

```
Get the Figma file "ABCD1234" and extract all color styles — 
show name, hex value, and opacity for each
```

```
Extract all text styles from Figma file "ABCD1234" — 
show font family, size, weight, line height, and letter spacing for each
```

```
Get the component named "Button/Primary" from Figma file "ABCD1234" — 
describe its variants, props, and visual spec so I can implement it in React
```

```
Get all components in the "Cards" frame of Figma file "ABCD1234" — 
list their names, dimensions, and what states/variants they have
```

```
Export the "hero-illustration" node from Figma file "ABCD1234" as SVG
```

```
Get all comments on Figma file "ABCD1234" and show unresolved ones only
```

```
Compare the "Mobile" and "Desktop" frames in Figma file "ABCD1234" — 
what layout and spacing differences exist?
```

---

## Token Extraction Output Format

When you ask Claude to extract tokens, request a specific output format:

```
Extract all design tokens from Figma file "ABCD1234" and format them as:

1. CSS custom properties (for direct use in stylesheets)
2. A TypeScript const object (for use in a design system)
3. A Tailwind CSS config extension (colors and typography)
```

Example output Claude will produce:
```css
/* CSS custom properties */
:root {
  --color-brand-primary: #6366F1;
  --color-brand-secondary: #8B5CF6;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --font-size-body: 16px;
  --font-weight-semibold: 600;
}
```
