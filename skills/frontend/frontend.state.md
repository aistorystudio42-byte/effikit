<!-- @keywords: state, zustand, context, redux, useState, useReducer, global state, local state -->

# Frontend — State Management

## Core Philosophy

State management comes down to one question: **"Who uses this data?"**

```
Only this component uses it         → useState
This component + children use it    → useState + props or Context
Distant components use it           → Global state (Zustand, Redux)
Data coming from the server         → Server state (React Query, SWR)
Should be visible in the URL        → URL state (query params, router)
```

Rule: **Keep state as low as possible.** Global state is for things that are genuinely global.

---

## When to Activate

> This skill should be activated when you need to resolve issues related to state.

## Principles

### URL State
```tsx
// Filters, page numbers, search terms — should live in URL
// Users should be able to share links, back button should work

const useSearchParams = () => {
  const [params, setParams] = useSearchParams();
  
  const filters = useMemo(() => ({
    query: params.get('q') ?? '',
    page: Number(params.get('page') ?? 1),
    category: params.get('cat') ?? 'all',
  }), [params]);

  const updateFilters = useCallback((updates: Partial<typeof filters>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, String(v)); else next.delete(k);
      });
      return next;
    });
  }, [setParams]);

  return { filters, updateFilters };
};
```

---

## Decision Framework

### useState — Simple Values
```tsx
const [isOpen, setIsOpen] = useState(false);        // UI state
const [inputValue, setInputValue] = useState('');   // Form field
const [activeTab, setActiveTab] = useState('home'); // Selection state
```

### useReducer — Complex Transitions
```tsx
type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; qty: number } }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const exists = state.items.find(i => i.id === action.payload.id);
      if (exists) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, qty: 1 }] };
    }
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
}
```

**Prefer useReducer when:** Transitions affect multiple sub-values, next state depends on previous state, or testability is critical.

---

Context is not a **state management** tool — it's a **dependency injection** tool. Don't put frequently changing values into Context.

```tsx
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Every Context change causes all consumers to re-render
// Therefore: memoize the value or split into separate contexts
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
```

### Context Performance Trap
```tsx
// Wrong: Mixing frequently and rarely changing values in one Context
const AppContext = createContext({ user, cart, theme, notifications });
// user changes on login, cart on every item add, theme rarely
// Split all of them into separate Contexts

// Correct: Separation of concerns
const UserContext = createContext(user);
const CartContext = createContext(cart);
const ThemeContext = createContext(theme);
```

---

Zustand provides global state management without Redux's ceremony.

```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,

        login: async (credentials) => {
          const user = await authService.login(credentials);
          set({ user, isAuthenticated: true }, false, 'user/login');
        },

        logout: () => {
          authService.logout();
          set({ user: null, isAuthenticated: false }, false, 'user/logout');
        },
      }),
      { name: 'user-store', partialize: (state) => ({ user: state.user }) }
    )
  )
);
```

### Zustand Slice Pattern — Split Large Stores
```tsx
const createCartSlice = (set: SetState<AppStore>) => ({
  cart: { items: [] as CartItem[] },
  addToCart: (item: Product) =>
    set(state => ({
      cart: { items: [...state.cart.items, item] }
    }), false, 'cart/add'),
});

const useAppStore = create<AppStore>()((...args) => ({
  ...createCartSlice(...args),
  ...createUserSlice(...args),
}));
```

---

Data coming from the server is **a separate state category** — it requires caching, revalidation, and background sync.

```tsx
const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => productApi.getAll(filters),
    staleTime: 5 * 60 * 1000,  // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
    select: (data) => data.products,
  });

const useCreateProduct = () =>
  useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
```

**Rule:** Never copy server state into `useState`. React Query already caches it.

---

| Data Type | Solution |
|-----------|----------|
| UI toggle, modal open/closed | useState |
| Form values | useState or react-hook-form |
| Multi-step / complex transitions | useReducer |
| Theme, language, auth state | Context + useState |
| User session, cart | Zustand + persist |
| API data | React Query / SWR |
| Filters, pagination | URL state |
| Temporary notifications, toasts | Zustand (ephemeral) |

---

## Anti-Patterns

1. **Putting everything in global state** — component-local state is usually enough
2. **Syncing state via useEffect** — derive state, don't copy it
3. **Using Context without memoization** — memoize it, split it
4. **Copying server state to client state** — React Query is sufficient
5. **Not normalizing state** — updating a nested object inside an array is hard, flatten it

## Example in Action

```typescript
// Apply the core principles identified above in a targeted manner.
// Keep it simple and maintainable.
```
