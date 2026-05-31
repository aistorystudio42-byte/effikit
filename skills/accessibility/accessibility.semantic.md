<!-- @keywords: accessibility, semantic HTML, ARIA, screen reader, WCAG, landmarks, headings -->

# Accessibility — Semantic HTML and ARIA

## Why Semantics Matter

Screen readers, search engines, and browser accessibility tools all rely on HTML semantics to understand page structure. A `<div>` with a click handler is invisible to these tools. A `<button>` is natively keyboard-accessible, focusable, and announced correctly by screen readers — for free.

```
Native HTML elements provide:
  ✓ Keyboard accessibility (focus, Enter/Space activation)
  ✓ Screen reader announcements (role, name, state)
  ✓ Browser built-in behavior (form submission, link navigation)

ARIA fills the gap only when native HTML is insufficient.
Rule: First try to use native HTML. Use ARIA only when you can't.
```

---

## Landmark Regions

Landmarks let screen reader users jump between major page sections.

```html
<!-- Every page should have these landmarks -->
<header role="banner">        <!-- site header, logo, main nav -->
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/products">Products</a></li>
    </ul>
  </nav>
</header>

<main>                        <!-- primary content — ONE per page -->
  <h1>Page Title</h1>
  <!-- page content -->
</main>

<aside aria-label="Related articles">  <!-- complementary content -->
  <!-- sidebar -->
</aside>

<footer role="contentinfo">   <!-- site footer -->
  <!-- footer content -->
</footer>

<!-- Multiple navs: differentiate with aria-label -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Breadcrumb">...</nav>
<nav aria-label="Pagination">...</nav>
```

---

## Heading Hierarchy

Headings are the table of contents for screen reader users. They must follow a logical hierarchy.

```html
<!-- Correct: logical nesting, no skipped levels -->
<h1>Product Catalog</h1>
  <h2>Electronics</h2>
    <h3>Laptops</h3>
    <h3>Tablets</h3>
  <h2>Clothing</h2>
    <h3>Men's</h3>
      <h4>Shirts</h4>

<!-- Wrong: skipping levels for visual styling -->
<h1>Product Catalog</h1>
<h3>Electronics</h3>  <!-- ✗ skipped h2 -->

<!-- Wrong: using headings for bold text -->
<h4>Note:</h4>  <!-- ✗ not a structural heading -->
<strong>Note:</strong>  <!-- ✓ bold text -->
```

---

## Interactive Elements

```tsx
// Always use semantic elements for interactive content

// ✗ Non-semantic click handler
<div onClick={handleSubmit} className="btn">Submit</div>
// Not keyboard accessible, no role, no focus

// ✓ Button: triggers actions
<button type="submit" onClick={handleSubmit}>Submit</button>
// Keyboard: Tab to focus, Enter/Space to activate
// Screen reader: "Submit, button"

// ✓ Link: navigates
<a href="/products">View Products</a>
// Keyboard: Tab to focus, Enter to activate
// Screen reader: "View Products, link"

// ✓ Select: pick from options
<label htmlFor="sort">Sort by</label>
<select id="sort" onChange={handleSort}>
  <option value="price-asc">Price: Low to High</option>
  <option value="price-desc">Price: High to Low</option>
</select>

// ✓ Checkbox
<label>
  <input type="checkbox" checked={isChecked} onChange={toggle} />
  Subscribe to newsletter
</label>
```

---

## ARIA — When and How

```tsx
// aria-label: provide a name when visible text is insufficient
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />  {/* hide decorative icon from screen readers */}
</button>

// aria-describedby: link to additional description
<input
  id="password"
  type="password"
  aria-describedby="password-hint"
/>
<p id="password-hint">
  Must be at least 8 characters with one number and one uppercase letter.
</p>

// aria-expanded: communicates open/closed state
<button
  aria-expanded={isMenuOpen}
  aria-controls="main-menu"
  onClick={() => setIsMenuOpen(!isMenuOpen)}
>
  Menu
</button>
<ul id="main-menu" hidden={!isMenuOpen}>
  {navItems.map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}
</ul>

// aria-live: announce dynamic content updates
<div aria-live="polite" aria-atomic="true">
  {/* Content changes here are announced to screen readers */}
  {statusMessage}
</div>

// aria-live="assertive": for urgent messages (errors, alerts)
<div role="alert">  {/* equivalent to aria-live="assertive" */}
  {errorMessage}
</div>
```

---

## Forms

```tsx
// Every input must have a visible label linked to the input
// Don't rely on placeholder as label — it disappears on focus

// ✓ Explicit label with htmlFor
<div>
  <label htmlFor="email">Email address</label>
  <input
    id="email"
    type="email"
    autoComplete="email"
    required
    aria-required="true"
  />
</div>

// ✓ Implicit label (wrapping)
<label>
  <span>Password</span>
  <input type="password" autoComplete="current-password" />
</label>

// ✓ Required fields
<label htmlFor="name">
  Full name
  <span aria-hidden="true"> *</span>  {/* visual asterisk */}
</label>
<input id="name" type="text" required aria-required="true" />
<p id="required-note">* Required fields</p>

// ✓ Error messages linked to input
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!emailError}
  aria-describedby={emailError ? 'email-error' : undefined}
/>
{emailError && (
  <p id="email-error" role="alert" className="error">
    {emailError}
  </p>
)}
```

---

## Images and Media

```tsx
// Informative image: describe content
<img src="/product.jpg" alt="Red Nike Air Max 90 running shoe, left side view" />

// Decorative image: empty alt (screen reader skips it)
<img src="/divider.png" alt="" />

// Icon with text: hide icon, text provides the label
<button>
  <SearchIcon aria-hidden="true" />
  Search
</button>

// Icon button without text: label the button
<button aria-label="Search products">
  <SearchIcon aria-hidden="true" />
</button>

// Complex image: use figure + figcaption or aria-describedby
<figure>
  <img src="/chart.png" alt="Revenue growth chart" aria-describedby="chart-desc" />
  <figcaption id="chart-desc">
    Monthly revenue increased from $50K in January to $120K in December 2024,
    a 140% growth over 12 months.
  </figcaption>
</figure>
```

---

## Accessibility Checklist

- [ ] All interactive elements are `<button>`, `<a>`, or native form controls
- [ ] Every `<img>` has `alt` (descriptive or empty for decorative)
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] Every form input has a visible, linked `<label>`
- [ ] Error messages use `role="alert"` or are linked via `aria-describedby`
- [ ] ARIA `aria-expanded`, `aria-controls` used for disclosure widgets
- [ ] Dynamic content updates announced via `aria-live`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Page has all landmark regions (header, main, footer, nav)
