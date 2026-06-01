<!-- @keywords: accessibility testing, axe, screen reader, NVDA, VoiceOver, automated audit, WCAG compliance -->

# Accessibility — Testing and Auditing

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to testing.

## Principles

### Testing Pyramid for Accessibility
```
Manual screen reader testing  → highest confidence, slowest
  ↑
Automated tools (axe, Lighthouse) → catches ~30% of issues
  ↑
Linting (eslint-plugin-jsx-a11y) → catches common mistakes at write time
```

Automated tools can't catch everything — they can't determine if alt text is meaningful, if the reading order makes sense, or if the interaction is intuitive. Manual testing is essential.

---

### Automated Testing with axe
```typescript
// Unit/integration tests with jest-axe
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('ProductCard accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ProductCard
        name="Widget Pro"
        price={4999}
        imageUrl="/widget.jpg"
        onAddToCart={jest.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in loading state', async () => {
    const { container } = render(<ProductCard isLoading />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations in error state', async () => {
    const { container } = render(<ProductCard error="Failed to load" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

---

### Playwright Accessibility Testing
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Checkout flow accessibility', () => {
  test('checkout page has no critical violations', async ({ page }) => {
    await page.goto('/checkout');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa']) // WCAG 2.1 AA
      .exclude('#third-party-widget')   // exclude known third-party issues
      .analyze();

    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious'))
      .toHaveLength(0);
  });

  test('modal has correct ARIA attributes when open', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Edit shipping address' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');

    // Focus should be inside modal
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A', 'DIV']).toContain(focused);
  });
});
```

---

### ESLint Plugin for Accessibility
```json
// .eslintrc.json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/html-has-lang": "error",
    "jsx-a11y/img-redundant-alt": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-access-key": "error",
    "jsx-a11y/no-autofocus": "warn",
    "jsx-a11y/no-distracting-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/tabindex-no-positive": "error"
  }
}
```

---

### Screen Reader Testing
### Testing with NVDA (Windows) and VoiceOver (Mac)

```
NVDA shortcuts (Windows):
  Insert+F7       → list all links on page
  Insert+F6       → list all headings
  H               → jump to next heading
  B               → jump to next button
  F               → jump to next form field
  Tab             → navigate interactive elements

VoiceOver shortcuts (Mac):
  Cmd+F5          → turn VoiceOver on/off
  VO+U            → open rotor (navigate by heading, link, etc.)
  VO+Left/Right   → move through elements
  VO+Space        → activate element
  VO = Ctrl+Option
```

### Screen Reader Test Checklist

```
Navigation:
  [ ] Can user understand page structure from headings alone?
  [ ] Are landmark regions announced (navigation, main, footer)?
  [ ] Does the skip link work and navigate to main content?

Forms:
  [ ] Are all inputs announced with their label?
  [ ] Are required fields announced as required?
  [ ] Are error messages read when form is submitted with errors?
  [ ] Does focus move to the error summary on submission failure?

Dynamic content:
  [ ] Are status updates announced (loading complete, error occurred)?
  [ ] Do modal dialogs announce their title when opened?
  [ ] Does focus return to trigger when modal closes?

Images:
  [ ] Informative images have meaningful alt text read aloud?
  [ ] Decorative images are skipped?
  [ ] Complex images have descriptions?
```

---

### Accessibility Audit Workflow
```
1. Automated scan (axe in CI)
   → Catch ~30% of issues automatically
   → Block PR if critical violations found

2. Keyboard test (every new feature)
   → Navigate entire feature with keyboard only
   → Verify all actions achievable, focus visible, traps work

3. Screen reader test (before release)
   → Test critical paths with NVDA/VoiceOver
   → Verify announcements make sense

4. Color contrast audit (design review)
   → Run contrast checker on all new color combinations
   → Test with color blindness simulation

5. Zoom test (before release)
   → Set browser zoom to 200%, 400%
   → Verify no horizontal scroll, no overlapping content
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

- [ ] `jest-axe` running in component tests — no critical violations
- [ ] `eslint-plugin-jsx-a11y` configured with recommended ruleset
- [ ] Playwright accessibility tests for critical user flows
- [ ] Manual keyboard test of every new interactive component
- [ ] Screen reader test with NVDA or VoiceOver before major release
- [ ] Color contrast verified for all new colors/combinations
- [ ] Page tested at 200% browser zoom (no broken layout)
- [ ] Accessibility regression prevented by adding a11y tests to CI
