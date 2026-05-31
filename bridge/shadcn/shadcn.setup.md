<!-- @keywords: shadcn, shadcn/ui, radix, component, ui library, tailwind, cva, installation, theming, cli -->
<!-- @domain: shadcn/ui — Setup & Component System -->

# shadcn/ui — Setup & Component System

## What This Is

shadcn/ui is not a traditional component library — it's a collection of re-usable components you copy into your project. Unlike `npm install some-ui-library`, shadcn gives you full ownership of the component source. You can read it, modify it, and learn from it.

Built on: **Radix UI** (headless, accessible primitives) + **Tailwind CSS** (styling) + **class-variance-authority** (variant management).

**No MCP server** — runs in your project. Claude helps you install, customize, and extend shadcn components.

---

## Installation

### New Project (with Next.js)

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint
cd my-app
npx shadcn@latest init
```

### Existing Project

```bash
# Install dependencies
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge

# Install Radix UI utilities
npm install @radix-ui/react-icons lucide-react

# Init shadcn
npx shadcn@latest init
```

### Init Questions Explained

```
Which style would you like to use? 
→ "Default" for most projects, "New York" for denser UI

Which color would you like to use as the base color?
→ Pick your brand color — you can change it later via CSS variables

Would you like to use CSS variables for theming?
→ Always yes — this enables dark mode and easy theming
```

---

## Project Structure After Init

```
my-app/
├── components/
│   └── ui/          ← shadcn components live here
│       ├── button.tsx
│       ├── input.tsx
│       └── ...
├── lib/
│   └── utils.ts     ← cn() helper function
├── globals.css       ← CSS variables for theming
└── tailwind.config.ts ← updated with shadcn config
```

### The cn() utility — use it everywhere

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Usage:
```tsx
<div className={cn(
  'base-class other-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class',
  className  // allow external override
)} />
```

---

## Installing Components

```bash
# Install a specific component
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form

# Install multiple at once
npx shadcn@latest add button input label form

# See all available components
npx shadcn@latest add --help
```

**Most-used components and what they depend on:**

| Component | Radix Primitive | Common Use |
|-----------|----------------|------------|
| `button` | none | Primary action, form submit |
| `dialog` | Dialog | Modals, confirmations |
| `popover` | Popover | Dropdowns, pickers |
| `tooltip` | Tooltip | Hover hints |
| `select` | Select | Dropdown selects |
| `checkbox` | Checkbox | Multi-select, toggles |
| `radio-group` | RadioGroup | Single-select |
| `input` | none (HTML input) | Text input |
| `textarea` | none | Multi-line text |
| `form` | none (react-hook-form) | Form validation wiring |
| `sheet` | Dialog | Slide-in side panels |
| `tabs` | Tabs | Tab navigation |
| `accordion` | Accordion | Collapsible sections |
| `toast` | none (sonner) | Notification toasts |
| `table` | none (TanStack) | Data tables |
| `command` | CMDK | Command palettes, search |
| `calendar` | none (date-fns) | Date pickers |
| `card` | none | Container cards |

---

## Basic Usage Examples

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Settings</Button>
<Button variant="link">Learn more</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// Loading state (add to your custom extension)
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Edit Profile</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    {/* form content */}
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Component File Structure

When you install a shadcn component, you own the file. Understand what's inside:

```tsx
// components/ui/button.tsx — annotated
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"           // enables asChild prop
import { cva, type VariantProps } from "class-variance-authority"  // variant management
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",        // base classes
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        destructive: "bg-destructive...",
        // ...
      },
      size: { sm: "h-9...", default: "h-10...", lg: "h-11..." }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean   // render as child element (e.g., <Button asChild><a href="...">)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```
