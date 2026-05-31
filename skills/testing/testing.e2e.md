<!-- @keywords: e2e testing, Playwright, Cypress, browser testing, user flows, visual regression -->

# Testing — End-to-End Tests

## E2E Test Purpose

E2E tests verify complete user journeys from the browser's perspective. They catch integration failures that unit and integration tests miss: broken UI flows, missing API calls, wrong redirects, and visual regressions.

```
Test pyramid:
  E2E          ← few, slow, high confidence for critical paths
  Integration  ← moderate, medium speed, real dependencies
  Unit         ← many, fast, isolated logic
```

E2E tests are expensive. Cover the 5-10 most critical user paths, not every feature.

---

## Playwright Setup and Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // retry on CI, not locally
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',      // save trace on failure for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run start:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Page Object Model

Page Objects encapsulate page-specific selectors and actions — tests stay readable when UI changes.

```typescript
// e2e/pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// e2e/pages/checkout.page.ts
export class CheckoutPage {
  constructor(readonly page: Page) {}

  async fillShipping(address: ShippingAddress) {
    await this.page.getByLabel('Street').fill(address.street);
    await this.page.getByLabel('City').fill(address.city);
    await this.page.getByLabel('ZIP').fill(address.zip);
  }

  async submitOrder() {
    await this.page.getByRole('button', { name: 'Place Order' }).click();
    // Wait for navigation to confirmation page
    await this.page.waitForURL('/orders/*/confirmation');
  }

  getOrderConfirmationId(): Promise<string> {
    return this.page.getByTestId('order-id').textContent() as Promise<string>;
  }
}
```

---

## Critical Path Tests

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { CheckoutPage } from './pages/checkout.page';
import { seedTestData, cleanupTestData } from './helpers/database';

test.describe('Checkout Flow', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = await seedTestData.createUserWithCart();
  });

  test.afterEach(async () => {
    await cleanupTestData.removeUser(testUser.id);
  });

  test('completes checkout as authenticated user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await expect(page).toHaveURL('/dashboard');

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.getByTestId('cart-item')).toHaveCount(2);

    // Proceed to checkout
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Fill shipping
    await checkoutPage.fillShipping({
      street: '123 Main St',
      city: 'New York',
      zip: '10001',
    });

    // Submit order
    await checkoutPage.submitOrder();

    // Verify confirmation
    await expect(page.getByTestId('confirmation-message')).toBeVisible();
    await expect(page.getByTestId('order-id')).toContainText('ORD-');
  });

  test('shows validation errors for incomplete form', async ({ page }) => {
    await loginPage.login(testUser.email, testUser.password);
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Place Order' }).click();

    await expect(page.getByText('Street address is required')).toBeVisible();
    await expect(page.getByText('City is required')).toBeVisible();
  });
});
```

---

## Authentication Helper

```typescript
// e2e/helpers/auth.ts
import { type BrowserContext } from '@playwright/test';

// Reuse authentication state across tests — don't login before every test
export async function saveAuthState(context: BrowserContext): Promise<void> {
  await context.storageState({ path: 'e2e/.auth/user.json' });
}

// playwright.config.ts — apply saved auth state
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',  // login once, save state
    },
    {
      name: 'authenticated',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'e2e/.auth/user.json', // reuse auth state
      },
    },
  ],
});

// e2e/auth.setup.ts — runs once before authenticated tests
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

---

## Visual Regression Testing

```typescript
// Snapshot testing for visual consistency
test('product card renders correctly', async ({ page }) => {
  await page.goto('/products/widget-pro');
  await page.waitForLoadState('networkidle');

  // Take screenshot and compare to baseline
  await expect(page.getByTestId('product-card')).toMatchAriaSnapshot();

  // Or pixel-level comparison
  expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('product-page.png', {
    threshold: 0.02,    // 2% pixel difference allowed
    maxDiffPixels: 100, // or max pixel count
  });
});
```

---

## Debugging Failed E2E Tests

```typescript
// Playwright trace viewer — step through test like a video
// Run: npx playwright show-trace test-results/trace.zip

// Debug mode: pause on failure
test('checkout', async ({ page }) => {
  await page.pause(); // opens inspector at this point
  // ...
});

// CI debugging: traces and screenshots auto-saved on failure
// Download artifacts from CI, then:
// npx playwright show-trace trace.zip

// Slow motion for visual debugging (local only)
// playwright.config.ts:
use: {
  launchOptions: {
    slowMo: 500, // 500ms between actions
  },
}
```

---

## E2E Test Checklist

- [ ] Critical user paths covered (auth, core feature, checkout/conversion)
- [ ] Page Object Model used — no raw selectors in test files
- [ ] Auth state saved and reused (not re-login before every test)
- [ ] Test data seeded and cleaned up per test
- [ ] Tests run in parallel (independent, no shared state)
- [ ] Screenshots and traces captured on failure
- [ ] Mobile viewport tested for critical paths
- [ ] Visual regression snapshots checked into version control
