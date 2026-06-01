<!-- @keywords: react, component, props, composition, reusability, jsx, typescript -->

# Frontend — Component Design and Composition

## Core Philosophy

A component should do one thing well. If you can't answer "what does this component do?" in a single sentence, it's too large — split it.

Two opposing forces shape component design: too small creates unnecessary abstraction, too large blocks reuse. The balance is built around **reason to change** — if two different scenarios would change the same component in different directions, that should be two components.

---

## When to Activate

> This skill should be activated when you need to resolve issues related to components.

## Principles

### Component Hierarchy
### 1. Primitive Components
Wrappers around base HTML elements that add styling and accessibility layers.

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = ({ variant, size, isLoading, children, disabled, ...rest }: ButtonProps) => (
  <button
    className={cn(buttonVariants({ variant, size }))}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    {...rest}
  >
    {isLoading ? <Spinner size={size} /> : children}
  </button>
);
```

**Decision:** Props interface should extend `React.HTMLAttributes` — this automatically supports native props like `onClick`, `className`, `aria-*`.

### 2. Compound Components
Structures where multiple primitives work in coordination. Internal state is shared via Context.

```tsx
const SelectContext = createContext<SelectContextValue | null>(null);

const Select = ({ children, value, onChange }: SelectProps) => (
  <SelectContext.Provider value={{ value, onChange }}>
    <div role="combobox">{children}</div>
  </SelectContext.Provider>
);

Select.Trigger = SelectTrigger;
Select.Options = SelectOptions;
Select.Option = SelectOption;

// Usage
<Select value={selected} onChange={setSelected}>
  <Select.Trigger />
  <Select.Options>
    <Select.Option value="a">Option A</Select.Option>
  </Select.Options>
</Select>
```

**When to use:** When multiple sub-components need shared state that shouldn't leak to the outside.

### 3. Container / Smart Components
Holds data fetching, side effects and business logic. No UI details.

```tsx
const UserProfileContainer = ({ userId }: { userId: string }) => {
  const { data, isLoading, error } = useUserProfile(userId);

  if (isLoading) return <UserProfileSkeleton />;
  if (error) return <ErrorBoundaryFallback error={error} />;
  return <UserProfileView user={data} />;
};
```

**Rule:** No `className`, `style` or visual props inside a Container. Visual decisions belong to the View component.

---

### Props Design
### Decision Tree: Which Prop Type?

```
Does the value come from outside and never change?
  → Yes: static prop (string, number, boolean)
  → No: dynamic prop (comes from state)

Is behavior being reported outward?
  → Yes: callback prop (onX: () => void)
  → No: internal handler

Does the component accept content?
  → Single type: children
  → Multiple slots: render prop or named slot pattern
```

### Render Props — When and When Not

```tsx
// Correct: Sharing cross-cutting logic
interface DataFetcherProps<T> {
  url: string;
  render: (data: T, isLoading: boolean) => React.ReactNode;
}

// Wrong: Using render prop just to pass styles
// className or variant prop is enough for that
```

### Prop Drilling Limit
If props are passed more than 3 levels deep, consider Context or state management. The rule isn't strict — if intermediate components **understand and use** the props, drilling is normal. If they're just passing them through, it's not.

---

### Composition Patterns
### Slot Pattern
```tsx
interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const Card = ({ header, footer, children }: CardProps) => (
  <div className="card">
    {header && <div className="card-header">{header}</div>}
    <div className="card-body">{children}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </div>
);
```

### HOC — Only for Cross-Cutting Concerns
```tsx
const withAuth = <P extends object>(Component: React.ComponentType<P>) =>
  function AuthenticatedComponent(props: P) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <Component {...props} />;
  };
```

Custom hooks are often preferred over HOCs — hooks are more testable.

---

## Decision Framework

### When to Use memo?
```tsx
// memo needed: Expensive render, frequent parent re-renders
const HeavyList = memo(({ items }: { items: Item[] }) => (
  <ul>{items.map(item => <HeavyItem key={item.id} item={item} />)}</ul>
));

// memo unnecessary: Simple components, already frequently changing props
// memo overhead can exceed the gain — profile first, don't guess
```

### useCallback and useMemo
```tsx
// Correct: When reference stability is needed (passed to memoized child)
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, [submitForm]);

// Wrong: useMemo for a computation that's already cheap per render
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
// This is just: const fullName = `${first} ${last}`;
```

---

## Anti-Patterns

Every component should support three states: **loading**, **error**, **success**.

```tsx
type ComponentState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };
```

Error Boundary usage: Isolate critical UI sections. Prevent the entire app from crashing.

---

## Example in Action

Before shipping a component, ask:
- [ ] Does this component do exactly one thing?
- [ ] Does the props interface extend `HTMLAttributes` (for primitives)?
- [ ] Are loading, error, and empty states handled?
- [ ] Are `key` props stable and ID-based?
- [ ] Are there unnecessary re-renders? (Don't add memo without profiling)
- [ ] Does TypeScript contain `any`? (It shouldn't)
