import { describe, expect, it } from "vitest";
import { goalProgress, normalizeCategoria, summarize } from "@/lib/finance";

describe("finance rules", () => {
  it("saldo = receitas - despesas", () => {
    const s = summarize([
      { id: "1", tipo: "receita", valor: 2500, categoria: "Salário", descricao: "", data: "2026-11-01" },
      { id: "2", tipo: "despesa", valor: 45, categoria: "Alimentação", descricao: "", data: "2026-11-02" },
    ]);
    expect(s.saldo).toBe(2455);
  });
  it("categoria desconhecida vira Outros", () => {
    expect(normalizeCategoria("Pets")).toBe("Outros");
  });
  it("progresso da meta é limitado a 100%", () => {
    expect(goalProgress({ valor_atual: 1500, valor_objetivo: 1000 })).toBe(100);
  });
});
