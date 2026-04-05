import { test, expect } from "@playwright/test";

/**
 * E2E — Criação de Transação (fluxo crítico)
 *
 * Setup: simula uma sessão autenticada via cookie antes de cada teste.
 *
 * Phase 2 wiring note: the TransactionForm is currently a standalone component
 * not yet rendered on the /transactions page. These tests cover:
 *  1. Authenticated navigation to the transactions page.
 *  2. Form interaction — will be fully enabled once the form is wired
 *     to the page (tracked in issue "🧪 Testar fluxo de conciliação bancária").
 *
 * Routes mocked:
 *  - POST **/auth/login           → authenticated session setup
 *  - POST /api/auth/session       → session cookie persistence
 *  - POST **/transactions         → transaction creation
 */

const BACKEND_LOGIN = "**/api/v1/auth/login";
const SESSION_ROUTE = "/api/auth/session";
const TRANSACTIONS_ROUTE = "**/api/v1/transactions";

/** Simulate an authenticated session by going through the login flow. */
async function loginAs(
  page: import("@playwright/test").Page,
  email = "user@example.com",
) {
  await page.route(BACKEND_LOGIN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: { id: "cjld2c", name: "Mauricio", email },
      }),
    }),
  );

  await page.route(SESSION_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "mock-access-token" }),
    }),
  );

  await page.goto("/login");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill("Senha123");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Criação de Transação", () => {
  test("navigates to the transactions page after login", async ({ page }) => {
    await loginAs(page);

    await page.goto("/transactions");

    await expect(
      page.getByRole("heading", { name: /transações/i }),
    ).toBeVisible();
  });

  // ── Form interaction tests ────────────────────────────────────────────────
  // These tests will be completed in Phase 2 once TransactionForm is rendered
  // on the /transactions page (e.g., in a modal triggered by "Nova transação").

  test.fixme(
    "shows validation errors when submitting an empty transaction form",
    async ({ page }) => {
      await loginAs(page);
      await page.goto("/transactions");

      // TODO: click "Nova transação" button when it's added to the page
      const form = page.getByRole("form", { name: /nova transação/i });
      await expect(form).toBeVisible();

      await page.getByRole("button", { name: /salvar transação/i }).click();

      await expect(page.getByText(/descrição obrigatória/i)).toBeVisible();
      await expect(
        page.getByText(/valor deve ser maior que zero/i),
      ).toBeVisible();
    },
  );

  test.fixme(
    "creates a transaction successfully",
    async ({ page }) => {
      await loginAs(page);

      // Mock the transaction creation endpoint
      await page.route(TRANSACTIONS_ROUTE, (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "cjld2cjxh0000qzrmn831i7rn",
            description: "Salário",
            amountCents: 500000,
            type: "INCOME",
            date: "2026-04-05",
          }),
        }),
      );

      await page.goto("/transactions");

      // TODO: click "Nova transação" button when it's added to the page
      const form = page.getByRole("form", { name: /nova transação/i });
      await expect(form).toBeVisible();

      await page.getByLabel(/descrição/i).fill("Salário");
      // CurrencyInput — type digits; mask converts to cents internally
      await page.getByLabel(/valor/i).fill("500000");
      await page
        .getByRole("combobox", { name: /tipo/i })
        .selectOption("INCOME");
      await page.getByRole("button", { name: /salvar transação/i }).click();

      // After successful submission, form should reset
      await expect(page.getByLabel(/descrição/i)).toHaveValue("");
    },
  );
});
