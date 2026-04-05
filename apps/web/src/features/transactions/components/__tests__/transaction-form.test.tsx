import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TransactionForm } from "../transaction-form";

// Mock CurrencyInput — replaces the currency-masked input with a plain
// number input so tests can interact with it without locale formatting.
vi.mock("@/components/forms/currency-input", () => ({
  CurrencyInput: ({
    id,
    onValueChange,
    valueCents,
    ...props
  }: {
    id: string;
    onValueChange: (cents: number) => void;
    valueCents: number;
    [key: string]: unknown;
  }) => (
    <input
      id={id}
      type="number"
      value={valueCents}
      onChange={(e) => onValueChange(Number(e.target.value))}
      data-testid="currency-input"
      {...props}
    />
  ),
}));

// A valid CUID for accountId (required by schema)
const ACCOUNT_ID = "cjld2cjxh0000qzrmn831i7rn";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderForm(onSuccess = vi.fn()) {
  return render(<TransactionForm accountId={ACCOUNT_ID} onSuccess={onSuccess} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TransactionForm", () => {
  it("renders all form fields", () => {
    renderForm();

    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByTestId("currency-input")).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observação/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /salvar transação/i }),
    ).toBeInTheDocument();
  });

  it("defaults type to EXPENSE", () => {
    renderForm();
    const select = screen.getByLabelText(/tipo/i) as HTMLSelectElement;
    expect(select.value).toBe("EXPENSE");
  });

  it("shows validation error when description is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    // Clear date so only description error fires in isolation
    await user.click(screen.getByRole("button", { name: /salvar transação/i }));

    expect(
      await screen.findByText(/descrição obrigatória/i),
    ).toBeInTheDocument();
  });

  it("shows validation error when amount is zero", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/descrição/i), "Aluguel");
    // amount stays at 0 (default)
    await user.click(screen.getByRole("button", { name: /salvar transação/i }));

    expect(
      await screen.findByText(/valor deve ser maior que zero/i),
    ).toBeInTheDocument();
  });

  it("calls onSuccess after valid submission", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderForm(onSuccess);

    await user.type(screen.getByLabelText(/descrição/i), "Salário");
    await user.clear(screen.getByTestId("currency-input"));
    await user.type(screen.getByTestId("currency-input"), "500000"); // R$ 5.000,00

    await user.click(screen.getByRole("button", { name: /salvar transação/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  // NOTE: loading-state test will be added once the form is wired to the API
  // (Phase 2 wiring — onSubmit currently calls reset/onSuccess synchronously).
});
