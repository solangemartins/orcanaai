import { describe, expect, it, vi } from "vitest";
import { buildTools } from "@/lib/orca.server";

function recorder(failBalance = false) {
  const income = { tipo: "receita" as const, valor: 700, categoria: "Outros" as const, descricao: "Freelancer", data: "2026-11-11" };
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "receipt", ...income }, error: null }) }) }));
  const range = vi.fn(async () => ({ data: [{ tipo: "receita", valor: 100 }, { tipo: "receita", valor: 700 }], error: failBalance ? { message: "offline" } : null }));
  const from = vi.fn((_table: string) => ({ insert, select: () => ({ order: () => ({ range }) }) }));
  const rpc = vi.fn();
  const ctx = { supabase: { from, rpc }, user: { id: "owner" } } as unknown as Parameters<typeof buildTools>[0];
  const execute = buildTools(ctx, "Recebi R$ 700 de freelancer.", "message-id").registrar_transacao.execute;
  if (!execute) throw new Error("Recorder missing");
  return { insert, from, rpc, run: () => execute(income, { toolCallId: "call-id", messages: [], context: {} }) };
}

describe("Receita sem destinação automática", () => {
  it("registra a receita de R$700 uma única vez", async () => {
    const r = recorder();
    await r.run();
    expect(r.insert).toHaveBeenCalledTimes(1);
    expect(r.insert).toHaveBeenCalledWith(expect.objectContaining({ tipo: "receita", valor: 700, user_id: "owner" }));
  });
  it("atualiza saldo livre de R$100 para R$800 após a receita de R$700", async () => {
    const r = recorder();
    expect(await r.run()).toMatchObject({ saldo_livre: 800 });
  });
  it("não cria aporte, proposta ou destino confirmado para uma receita", async () => {
    const r = recorder();
    expect(await r.run()).toMatchObject({ destino_confirmado: null });
    expect(r.rpc).not.toHaveBeenCalled();
    expect(r.from.mock.calls.every(([table]) => table === "transactions")).toBe(true);
  });
  it("disponibiliza as quatro destinações sem selecionar uma", async () => {
    expect(await recorder().run()).toMatchObject({ destinos_disponiveis: ["guardar_parte", "investir", "direcionar_meta", "manter_disponivel"], destino_confirmado: null });
  });
  it("falha de leitura de saldo não duplica uma receita já registrada", async () => {
    const r = recorder(true);
    expect(await r.run()).toMatchObject({ ok: true, saldo_livre: null });
    expect(r.insert).toHaveBeenCalledTimes(1);
  });
});