<!-- @keywords: shadcn, theming, dark mode, CSS variables, customize, accessibility, composition, best practices -->
<!-- @domain: shadcn/ui — Theming, Customization & Best Practices -->

# shadcn/ui — Theming, Customization & Best Practices

## The CSS Variable System

shadcn uses semantic CSS variables — change them once, the entire UI updates:

```css
/* globals.css — the full theme system */
@layer base {
  :root {
    /* Background */
    --background: 0 0% 100%;         /* white in HSL */
    --foreground: 222.2 84% 4.9%;    /* near-black */

    /* Cards */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* Primary (your brand color) */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    /* Secondary */
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* Muted (disabled, placeholder) */
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* Accent (hover states) */
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Destructive (error, delete) */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* Borders and rings */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* Border radius (change this to round/square your UI) */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode overrides ... */
  }
}
```

**All values are in HSL without the `hsl()` wrapper** so Tailwind can apply opacity modifiers (e.g., `bg-primary/80`).

---

## Setting Up Dark Mode

### With next-themes (Next.js)

```bash
npm install next-themes
```

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";

export default function Layout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// Theme toggle component
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

---

## Custom Brand Theme

Replace the default shadcn colors with your brand:

```css
/* Custom theme for brand color: indigo */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 238 76% 62%;           /* indigo-500: hsl(238, 76%, 62%) */
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --accent: 238 76% 96%;            /* very light indigo for hover states */
  --accent-foreground: 238 76% 30%;
  --destructive: 0 72.2% 50.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --ring: 238 76% 62%;              /* focus ring matches primary */
  --radius: 0.75rem;                /* slightly rounder than default */
}
```

**Converting a hex color to HSL for shadcn:**
Use WolframAlpha: `"convert hex #6366f1 to HSL"` → 239° 84% 67%
Then format as: `239 84% 67%` (no `hsl()` wrapper).

---

## Component Composition Patterns

### asChild Prop

The `asChild` prop lets you use a component's behavior on a different element:

```tsx
// ✅ Button as an anchor link (accessible, no nested <a> in <button>)
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>

// ✅ DialogTrigger on a custom element
<DialogTrigger asChild>
  <MyCustomButton>Open</MyCustomButton>
</DialogTrigger>
```

### Composing Complex Components

```tsx
// Build a SelectField that combines Label + Select + error message
interface SelectFieldProps {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  error?: string;
}

function SelectField({ label, placeholder, options, error }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select>
        <SelectTrigger className={cn(error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

---

## Accessibility Checklist

shadcn is built on Radix UI which handles most a11y automatically. Your responsibilities:

- [ ] Always provide `aria-label` for icon-only buttons
- [ ] Always associate `Label` with its `Input` via `htmlFor` or wrapping
- [ ] Use `DialogTitle` and `DialogDescription` in every Dialog
- [ ] Don't hide the focus ring — never `outline-none` without a `ring` replacement
- [ ] Test keyboard navigation: Tab/Shift+Tab, Enter/Space, Escape, Arrow keys

```tsx
// ✅ Accessible icon button
<Button variant="ghost" size="icon" aria-label="Delete item">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>

// ✅ Accessible form field
<FormItem>
  <FormLabel htmlFor="username">Username</FormLabel>
  <FormControl>
    <Input id="username" {...field} />
  </FormControl>
</FormItem>
```

---

## What NOT to Do

| Mistake | Problem | Fix |
|---------|---------|-----|
| Editing node_modules or re-installing to "reset" | Components are in your repo — you own them | Modify `components/ui/` directly |
| Using `!important` to override styles | Breaks maintainability | Use `cn()` to pass className that overrides |
| Inline styles instead of Tailwind | Inconsistent — bypasses the design system | Use theme variables and Tailwind utilities |
| Hard-coding colors (`bg-[#6366f1]`) | Doesn't change with dark mode | Use semantic tokens (`bg-primary`) |
| Copying from multiple shadcn versions | API changes between versions | Stick to one version, `npx shadcn diff` to update |
| Nesting `<button>` inside `<button>` | Invalid HTML, accessibility error | Use `asChild` to render as `<div>` or swap element |
