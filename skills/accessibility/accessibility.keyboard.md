<!-- @keywords: accessibility, keyboard navigation, focus management, tab order, keyboard trap, shortcuts -->

# Accessibility — Keyboard Navigation and Focus Management

## Core Philosophy

Every interaction possible with a mouse must be achievable with a keyboard alone. This serves keyboard-only users, power users, and assistive technology users.

```
Core keyboard behaviors:
  Tab         → move focus forward
  Shift+Tab   → move focus backward
  Enter       → activate links and buttons
  Space       → activate buttons and checkboxes
  Arrow keys  → navigate within components (menus, tabs, radios)
  Escape      → close dialogs, menus, popovers
  Home/End    → jump to first/last item in a list
```

---

## When to Activate

> This skill should be activated when you need to resolve issues related to keyboard.

## Principles

### Focus Visibility
Focus indicators must be clearly visible. Never remove the outline without replacing it.

```css
/* ✗ Never do this */
:focus { outline: none; }
*:focus { outline: 0; }

/* ✓ Custom focus ring — visible and branded */
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/* :focus-visible only shows for keyboard navigation, not mouse clicks */
/* This is the modern, correct approach */

/* ✓ For components with custom backgrounds */
.button:focus-visible {
  box-shadow: 0 0 0 3px white, 0 0 0 5px var(--color-primary);
  /* double ring: white gap + colored ring = visible on any background */
}
```

---

### Tab Order
Tab order must follow visual reading order (top-left to bottom-right).

```tsx
// ✗ Wrong: tabIndex creates an unnatural order
<div tabIndex={3}>Third</div>
<div tabIndex={1}>First</div>
<div tabIndex={2}>Second</div>

// ✓ Correct: let DOM order define tab order
// tabIndex="0" = participates in natural order
// tabIndex="-1" = focusable programmatically, not via Tab key
// Positive tabIndex values are almost always wrong

// ✓ Only use tabIndex="-1" for programmatic focus
const dialogRef = useRef<HTMLDivElement>(null);

// When dialog opens, focus it programmatically
useEffect(() => {
  if (isOpen) dialogRef.current?.focus();
}, [isOpen]);

<div
  ref={dialogRef}
  tabIndex={-1}   // receives focus programmatically
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Confirm Delete</h2>
  ...
</div>
```

---

### Focus Trapping (Modal Dialogs)
When a dialog is open, focus must stay inside it.

```tsx
import { useEffect, useRef } from 'react';

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus first focusable element when dialog opens
    getFocusable()[0]?.focus();

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// Usage
function Modal({ isOpen, onClose, children }: ModalProps) {
  const containerRef = useFocusTrap(isOpen);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
```

---

### Keyboard Navigation Within Components
Complex components (menus, tabs, comboboxes) use arrow keys internally.

```tsx
// Roving tabindex pattern for tab panels
function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={i === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === activeIndex ? 0 : -1}  // only active tab in tab order
            onClick={() => setActiveIndex(i)}
            onKeyDown={e => handleKeyDown(e, i)}
            ref={el => { tabRefs.current[i] = el; }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          hidden={i !== activeIndex}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

### Skip Links
Allow keyboard users to skip repetitive navigation.

```tsx
// Visually hidden until focused — first element on every page
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* page content */}
</main>
```

```css
/* sr-only: visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

### Focus Return
When a trigger opens something (modal, dropdown), focus should return to the trigger when it closes.

```tsx
function useReturnFocus(isOpen: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the element that opened the dialog
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      // Return focus when closed
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);
}
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

- [ ] All interactions reachable and operable via keyboard alone
- [ ] Focus indicator is clearly visible (never `outline: none` without replacement)
- [ ] Tab order follows visual reading order
- [ ] Modal dialogs trap focus and close on Escape
- [ ] Focus returns to trigger when dialog/menu closes
- [ ] Arrow keys navigate within menus, tabs, and radio groups
- [ ] Skip link is first focusable element on each page
- [ ] Custom interactive components have correct ARIA roles and keyboard behavior
