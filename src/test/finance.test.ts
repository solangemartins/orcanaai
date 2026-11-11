import { describe, expect, it } from "vitest";
import { availableBalance, goalProgress, normalizeCategoria, summarize } from "@/lib/finance";
import { calculateGoalDelta } from "@/lib/goal-rules";

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
  it("R$700 de receita menos R$650 reservados deixa R$50 livres", () => {
    expect(availableBalance([{ tipo: "receita", valor: 700 }], [{ valor_atual: 650 }]).saldo_livre).toBe(50);
  });
  it("desconta despesas e reservas de todas as metas uma única vez", () => {
    expect(availableBalance([{ tipo: "receita", valor: 700 }, { tipo: "despesa", valor: 20 }], [{ valor_atual: 600 }, { valor_atual: 50 }])).toEqual({ receitas: 700, despesas: 20, saldo: 680, reservado: 650, saldo_livre: 30 });
  });
  it("retirada de R$650 devolve imediatamente R$700 livres", () => {
    const balance = 650 + calculateGoalDelta("retirada", 650, 650);
    expect(availableBalance([{ tipo: "receita", valor: 700 }], [{ valor_atual: balance }]).saldo_livre).toBe(700);
  });
  it("estorno do aporte de R$650 devolve imediatamente R$700 livres", () => {
    const balance = 650 + calculateGoalDelta("estorno", 0, 650, 650);
    expect(availableBalance([{ tipo: "receita", valor: 700 }], [{ valor_atual: balance }]).saldo_livre).toBe(700);
  });
  it("corrigir aporte de R$650 para R$600 libera R$50 adicionais", () => {
    const balance = 650 + calculateGoalDelta("correcao", 600, 650, 650);
    expect(availableBalance([{ tipo: "receita", valor: 700 }], [{ valor_atual: balance }]).saldo_livre).toBe(100);
  });
  it("mantém centavos exatos e não esconde saldo negativo pré-existente", () => {
    expect(availableBalance([{ tipo: "receita", valor: 700.10 }, { tipo: "despesa", valor: 0.10 }], [{ valor_atual: 650 }]).saldo_livre).toBe(50);
    expect(availableBalance([{ tipo: "receita", valor: 700 }], [{ valor_atual: 800 }]).saldo_livre).toBe(-100);
  });
});
