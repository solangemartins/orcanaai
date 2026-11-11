import { describe, expect, it, vi } from "vitest";
import { readAvailableBalance } from "@/lib/financial-data";

describe("Complete financial reads", () => {
  it("inclui registros além de 1000 na mesma conta do painel e do Orça", async () => {
    const from = vi.fn((table: string) => {
      const query = {
        select: () => query,
        order: () => query,
        range: async (start: number) => ({ error: null, data: table === "transactions"
          ? start === 0 ? Array.from({ length: 1000 }, (_, i) => ({ id: String(i), tipo: "receita", valor: 1, categoria: "Outros", descricao: "", data: "2026-11-11" })) : [{ id: "1000", tipo: "receita", valor: 700, categoria: "Outros", descricao: "", data: "2026-11-11" }]
          : [{ id: "goal", titulo: "Reserva", valor_atual: 650, valor_objetivo: 3000, prazo: null }],
        }),
      };
      return query;
    });
    const client = { from } as unknown as Parameters<typeof readAvailableBalance>[0];
    expect(await readAvailableBalance(client)).toMatchObject({ receitas: 1700, reservado: 650, saldo_livre: 1050 });
  });
});