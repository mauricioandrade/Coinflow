import { test, expect } from "@playwright/test";

/**
 * E2E — Login flow
 *
 * All API calls are intercepted so no real backend is needed.
 * Routes mocked:
 *  - POST **/auth/login      → NestJS backend (via apiClient)
 *  - POST /api/auth/session  → Next.js Route Handler (sets HttpOnly cookies)
 */

const BACKEND_LOGIN = "**/api/v1/auth/login";
const SESSION_ROUTE = "/api/auth/session";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login form with all fields", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /entrar no coinflow/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^entrar$/i }),
    ).toBeVisible();
  });

  test("shows required field errors on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /^entrar$/i }).click();

    await expect(page.getByText(/e-mail obrigatório/i)).toBeVisible();
    await expect(page.getByText(/senha obrigatória/i)).toBeVisible();
  });

  test("shows invalid email error for bad format", async ({ page }) => {
    await page.getByLabel(/e-mail/i).fill("notanemail");
    await page.getByRole("button", { name: /^entrar$/i }).click();

    await expect(page.getByText(/e-mail inválido/i)).toBeVisible();
  });

  test("navigates to dashboard on successful login", async ({ page }) => {
    // Mock backend authentication
    await page.route(BACKEND_LOGIN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: { id: "cjld2c", name: "Mauricio", email: "user@example.com" },
        }),
      }),
    );

    // Mock Next.js session persistence (sets HttpOnly cookies server-side)
    await page.route(SESSION_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "mock-access-token" }),
      }),
    );

    await page.getByLabel(/e-mail/i).fill("user@example.com");
    await page.getByLabel(/senha/i).fill("Senha123");
    await page.getByRole("button", { name: /^entrar$/i }).click();

    // After successful login useLogin calls router.push("/")
    await expect(page).toHaveURL("/");
  });

  test("displays error alert when login credentials are invalid", async ({
    page,
  }) => {
    await page.route(BACKEND_LOGIN, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Credenciais inválidas" }),
      }),
    );

    // Session route should not be called, but mock it to be safe
    await page.route(SESSION_ROUTE, (route) =>
      route.fulfill({ status: 200, body: "{}" }),
    );

    await page.getByLabel(/e-mail/i).fill("user@example.com");
    await page.getByLabel(/senha/i).fill("senha-errada");
    await page.getByRole("button", { name: /^entrar$/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("has a link to the register page", async ({ page }) => {
    const link = page.getByRole("link", { name: /criar conta/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/register");
  });
});
