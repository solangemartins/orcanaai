import { describe, expect, it } from "vitest";
import { assistantTimestamp, restoreChatHistory } from "@/lib/chat-history";
import { calculateGoalDelta, isGoalMovementRequest } from "@/lib/goal-rules";
import { goalProgress } from "@/lib/finance";

describe("Autorização e correções do Orça", () => {
  it("receber R$ 700 de freelancer não autoriza aporte", () => {
    expect(isGoalMovementRequest("Recebi R$ 700 de freelancer.")).toBe(false);
  });
  it("pedido de guardar R$ 650 autoriza somente uma proposta", () => {
    expect(isGoalMovementRequest("Adicione 650 reais na minha meta reserva de emergência.")).toBe(true);
  });
  it("recusa não autoriza aporte", () => {
    expect(isGoalMovementRequest("Não quero adicionar 650 na reserva")).toBe(false);
  });
  it("remover R$ 650 de R$ 1300 deixa R$ 650 e recalcula progresso", () => {
    const balance = 1300 + calculateGoalDelta("retirada", 650, 1300);
    expect(balance).toBe(650);
    expect(goalProgress({ valor_atual: balance, valor_objetivo: 3000 })).toBe(22);
  });
  it("corrigir aporte de R$ 700 para R$ 650 subtrai apenas R$ 50", () => {
    expect(calculateGoalDelta("correcao", 650, 1300, 700)).toBe(-50);
  });
  it("estornar último aporte de R$ 650 devolve saldo anterior", () => {
    expect(1300 + calculateGoalDelta("estorno", 0, 1300, 650)).toBe(650);
  });
  it("não permite retirada acima do saldo", () => {
    expect(() => calculateGoalDelta("retirada", 650, 50)).toThrow();
  });
});

describe("Histórico cronológico", () => {
  const user = { id: "u", sdk_id: "user-1", role: "user", parts: [{ type: "text", text: "Recebi 700" }], created_at: "2026-11-11T15:00:00.000Z" };
  const assistant = { id: "a", sdk_id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Registrado" }], created_at: "2026-11-11T15:00:01.000Z" };
  it("ordena mensagem antes da resposta após recarregar", () => {
    expect(restoreChatHistory([assistant, user]).map((m) => m.id)).toEqual(["user-1", "assistant-1"]);
  });
  it("resolve timestamps iguais com usuário antes da resposta", () => {
    expect(restoreChatHistory([{ ...assistant, created_at: user.created_at }, user]).map((m) => m.role)).toEqual(["user", "assistant"]);
  });
  it("elimina duplicação otimista pelo identificador", () => {
    expect(restoreChatHistory([user, user, assistant])).toHaveLength(2);
  });
  it("resposta nunca recebe timestamp anterior ou igual ao usuário", () => {
    expect(assistantTimestamp(user.created_at, new Date(user.created_at).getTime() - 1000)).toBe("2026-11-11T15:00:00.001Z");
  });
});