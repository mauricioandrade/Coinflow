import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginForm } from "../login-form";

// ── Hoisted mocks (vi.mock is hoisted — must use vi.hoisted for shared state) ─

const { mockMutateAsync, mockUseLogin } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockUseLogin: vi.fn(),
}));

vi.mock("@/features/auth/hooks/use-login", () => ({
  useLogin: mockUseLogin,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderForm() {
  return render(<LoginForm />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LoginForm", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockUseLogin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it("renders email, password fields and submit button", () => {
    renderForm();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^entrar$/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(
      await screen.findByText(/e-mail obrigatório/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/senha obrigatória/i)).toBeInTheDocument();
  });

  it("shows invalid email error for bad format", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/e-mail/i), "notanemail");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
  });

  it("calls mutateAsync with correct values on valid submit", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({
      accessToken: "tok",
      refreshToken: "ref",
      user: { id: "1", name: "Test", email: "user@example.com" },
    });
    renderForm();

    await user.type(screen.getByLabelText(/e-mail/i), "user@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "senha123",
      });
    });
  });

  it("shows loading state while pending", () => {
    mockUseLogin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
      error: null,
    });
    renderForm();

    const button = screen.getByRole("button", { name: /entrando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("displays API error alert when login fails", () => {
    mockUseLogin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: true,
      error: new Error("Credenciais inválidas"),
    });
    renderForm();

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has a link to the register page", () => {
    renderForm();
    const link = screen.getByRole("link", { name: /criar conta/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});
