import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CurrencyInput } from "@/components/ui/currency-input";

afterEach(cleanup);

describe("BRL numeric form values", () => {
  it("digitando 3000 entrega número 3000 para salvar, sem separadores ou prefixo", () => {
    const saveValue = vi.fn();
    render(<CurrencyInput aria-label="Valor" value="" onValueChange={(value) => saveValue(Number(value))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Valor" }), { target: { value: "3000" } });
    expect(saveValue).toHaveBeenLastCalledWith(3000);
  });
  it("valor brasileiro com centavos entrega 3000.25, não 3 ou 300025", () => {
    const saveValue = vi.fn();
    render(<CurrencyInput aria-label="Valor" value="" onValueChange={(value) => saveValue(Number(value))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Valor" }), { target: { value: "R$ 3.000,25" } });
    expect(saveValue).toHaveBeenLastCalledWith(3000.25);
  });
  it("limpar campo emite vazio para preservar orçamento opcional", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Valor" value={3000} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Valor" }), { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });
});