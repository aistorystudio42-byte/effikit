<!-- @keywords: component design, UI component, card, table, form, navigation, modal, dropdown, design pattern -->
<!-- @domain: UI Component Design Prompts -->

# UI Component Design Prompts

## Card Component Design

```
Design a card component system for: [content type]

**Card variants needed:**
- [VariantA]: [description — e.g., "product card with image, title, price, CTA"]
- [VariantB]: [description — e.g., "user profile card with avatar, name, role, actions"]
- [VariantC]: [description — e.g., "stat card with metric, label, trend indicator"]

**For the most complex variant — full spec:**

**Anatomy:**
```
┌─────────────────────────────┐
│ [image / media area]        │ ← optional, 16:9 or 1:1 ratio
├─────────────────────────────┤
│ [badge / label]             │ ← optional, top of content
│ [title]                     │ ← required, 1-2 lines max, truncate
│ [description]               │ ← optional, 2-3 lines, truncate
│                             │
│ [metadata row]              │ ← icon + text, multiple items
│                             │
│ [actions row]               │ ← primary CTA + secondary action
└─────────────────────────────┘
```

**States:**
- Default: [shadow-sm, border-border]
- Hover: [shadow-md, slight y-lift: -1px]
- Selected: [border-primary, bg-primary/5]
- Disabled: [opacity-50, no hover effect]
- Loading: [skeleton version of the card]

**Tailwind implementation:**
```tsx
function Card({ title, description, image, actions, selected, loading }: CardProps) {
  if (loading) return <CardSkeleton />;
  
  return (
    <article className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      "transition-all duration-150",
      "hover:shadow-md hover:-translate-y-px",
      selected && "border-primary bg-primary/5",
    )}>
      {image && <img src={image} className="rounded-t-lg w-full aspect-video object-cover" alt="" />}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold truncate">{title}</h3>
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
      </div>
      {actions && <div className="px-4 pb-4 flex gap-2">{actions}</div>}
    </article>
  );
}
```

Design all card variants for: [your specific content types].
```

---

## Data Table Design

```
Design a data table for: [what data it displays]

**Data shape:**
[describe columns — field name, type, what it represents]

**Table requirements:**
- Sortable columns: [which columns]
- Filterable: [which columns / global search]
- Selectable rows: [yes/no — bulk actions?]
- Paginated: [yes / infinite scroll]
- Expandable rows: [yes/no — what expands?]
- Fixed header: [yes/no — for long tables]

**Column specifications:**

| Column | Type | Width | Sortable | Renderable as |
|--------|------|-------|---------|--------------|
| [Name] | text | auto | yes | truncated text + link |
| [Status] | enum | 100px | yes | colored badge |
| [Date] | date | 140px | yes | relative + tooltip with exact |
| [Amount] | number | 100px | yes | formatted currency |
| [Actions] | — | 80px | no | icon buttons |

**Row states:**
- Default: [bg-background]
- Hover: [bg-muted/50]
- Selected: [bg-primary/5]
- Loading: [skeleton rows]
- Empty: [empty state component]

**Responsive behavior:**
- Desktop: full table
- Tablet: hide [lowest priority columns]
- Mobile: card layout (one row = one card)

Design with TanStack Table + shadcn Table components.
```

---

## Navigation Design

```
Design the navigation system for: [application type]

**Application:** [SaaS / e-commerce / blog / dashboard / marketing site]
**Navigation complexity:** [5 top-level items / deep hierarchy / user-specific]

**Desktop navigation:**

**Top navbar:**
```
[Logo]  [Nav links]  [Search]  [Notifications]  [Avatar menu]
```
- Height: 56px
- Sticky: yes (stays on scroll)
- Active state: [underline / filled background / bold]
- Dropdown on hover: [yes for items with children]

**Sidebar (for dashboards):**
```
Width: 240px collapsed to 64px (icon only)
Sections:
  - [Section 1]: [items]
  - [Section 2]: [items]
  - Bottom: [Settings, Help, User]
```

**Mobile navigation:**
```
Bottom tab bar (apps) or hamburger menu (content sites)
Bottom tabs: max 5 items (primary actions only)
Hamburger: full-screen overlay or slide-in drawer
```

**Breadcrumbs (for deep hierarchy):**
```
Home > Category > Subcategory > Current page
- Truncate middle items on mobile
- Last item: current page (not a link)
- Separator: / or › 
```

**Active state logic:**
```typescript
// Next.js — detect current path
'use client';
import { usePathname } from 'next/navigation';

function NavItem({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  
  return (
    <Link href={href} className={cn("nav-item", isActive && "nav-item-active")}>
      {children}
    </Link>
  );
}
```

Design navigation for: [your specific application structure].
```

---

## Modal & Dialog Design

```
Design modal/dialog patterns for: [application]

**Modal types needed:**

**1. Confirmation dialog (most critical):**
```
Size: sm (400px)
Structure:
  - Icon: [warning/danger colored icon]
  - Title: "[Action] [Object]?" — e.g., "Delete project?"
  - Body: "This will permanently delete [thing] and all its [children]. This cannot be undone."
  - Actions: [Cancel] [Delete] (destructive variant, right-aligned)

Rules:
  - Default focus: "Cancel" (safer action)
  - Escape key: closes (same as Cancel)
  - Background click: closes
  - Keyboard trap: yes — Tab cycles through Cancel and Delete only
```

**2. Form dialog:**
```
Size: md (560px) or lg (720px) depending on form complexity
Structure:
  - Header: [Title] [X close button]
  - Body: [scrollable if needed]
  - Footer: [Cancel] [Save] (right-aligned)

Rules:
  - Enter: submits form (not close)
  - Escape: closes WITHOUT saving (warn if dirty)
  - Scroll: body scrolls, header/footer stay fixed
```

**3. Information/preview dialog:**
```
Size: lg (800px) or full-screen
Structure:
  - Header: [Title] [X close button]
  - Body: [content — image, video, document]
  - Footer: optional actions

Rules:
  - Background click: closes
  - Escape: closes
```

**Backdrop:** semi-transparent, blocks interaction with page behind
**Animation:** scale from 0.95 + fade, 200-250ms spring

Implement with shadcn Dialog + Framer Motion for the animations.
```

---

## Form Design Patterns

```
Design the form patterns for: [application]

**Form principles:**
- One column (never side-by-side unless related fields — name: first + last)
- Labels above inputs (not inside)
- Group related fields with visual separation
- Show errors immediately when user leaves a field (on blur)

**Input field states:**
```
Default: border-input bg-background
Focus:   border-primary ring-2 ring-primary/20
Error:   border-destructive ring-2 ring-destructive/20
Disabled: opacity-50 cursor-not-allowed bg-muted
Success: border-success ring-2 ring-success/20 (optional)
```

**Field component pattern:**
```tsx
interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;       // helper text below input
  error?: string;      // validation error (replaces hint when present)
  children: ReactNode; // the actual input
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
```

**Multi-step form:**
```
Step indicator: [1. Account ●━━ 2. Profile ○━━ 3. Done ○]
Progress: stored in URL params (survives refresh)
Validation: validate current step before proceeding
Back: allowed without validation
Submit: only on last step
```

Design form patterns for: [your specific forms].
```
