export type GoalAction = "aporte" | "retirada" | "correcao" | "estorno";

export function isGoalMovementRequest(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(nao|nunca)\s+(quero\s+)?(adicione|adicionar|guarde|guardar|retire|retirar|remova|remover|transfira)/.test(normalized)) return false;
  return /\b(adicione|adicionar|guardar|guarde|separe|separar|destine|destinar|aporte|aportar|remova|remover|retire|retirar|desfaca|estorne|estornar|corrija|corrigir)\b/.test(normalized);
}

export function calculateGoalDelta(action: GoalAction, amount: number, balance: number, contribution = 0): number {
  if (!Number.isFinite(amount) || amount < 0 || (action !== "correcao" && action !== "estorno" && amount === 0)) throw new Error("Valor inválido");
  const cents = Math.round(amount * 100);
  const contributionCents = Math.round(contribution * 100);
  const delta = action === "aporte" ? cents : action === "retirada" ? -cents : action === "estorno" ? -contributionCents : cents - contributionCents;
  if (Math.round(balance * 100) + delta < 0) throw new Error("A retirada ultrapassa o saldo da meta.");
  return delta / 100;
}