export const CATEGORIAS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Salário",
  "Investimentos",
  "Outros",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_EMOJI: Record<string, string> = {
  Alimentação: "🍽️",
  Transporte: "🚌",
  Moradia: "🏠",
  Saúde: "🩺",
  Educação: "📚",
  Lazer: "🎉",
  Salário: "💼",
  Investimentos: "📈",
  Outros: "📦",
};

export type Tx = {
  id: string;
  tipo: "receita" | "despesa" | string;
  valor: number;
  categoria: string;
  descricao: string;
  data: string; // YYYY-MM-DD
};

export type Goal = {
  id: string;
  titulo: string;
  valor_objetivo: number;
  valor_atual: number;
  prazo: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number) => brl.format(v);

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export function normalizeCategoria(c: string | undefined | null): Categoria {
  const found = CATEGORIAS.find((k) => k.toLowerCase() === (c ?? "").trim().toLowerCase());
  return found ?? "Outros";
}

export function summarize<T extends Pick<Tx, "tipo" | "valor">>(txs: ReadonlyArray<T>) {
  let receitas = 0;
  let despesas = 0;
  for (const t of txs) {
    if (t.tipo === "receita") receitas += Math.round(Number(t.valor) * 100);
    else despesas += Math.round(Number(t.valor) * 100);
  }
  return { receitas: receitas / 100, despesas: despesas / 100, saldo: (receitas - despesas) / 100 };
}

/** Current reserves, not gross historical contributions: withdrawals and reversals release cash. */
export function availableBalance(
  txs: ReadonlyArray<Pick<Tx, "tipo" | "valor">>,
  goals: ReadonlyArray<Pick<Goal, "valor_atual">>,
) {
  const totals = summarize(txs);
  const reservedCents = goals.reduce((sum, goal) => sum + Math.round(Number(goal.valor_atual) * 100), 0);
  return {
    ...totals,
    reservado: reservedCents / 100,
    saldo_livre: (Math.round(totals.saldo * 100) - reservedCents) / 100,
  };
}

export function byCategory(txs: Tx[]) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.tipo !== "despesa") continue;
    map.set(t.categoria, (map.get(t.categoria) ?? 0) + Number(t.valor));
  }
  return [...map.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function inMonth(txs: Tx[], ref = new Date()) {
  const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
  return txs.filter((t) => monthKey(t.data) === key);
}

export function monthlyEvolution(txs: Tx[], months = 6, ref = new Date()) {
  const out: { mes: string; key: string; receitas: number; despesas: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const s = summarize(txs.filter((t) => monthKey(t.data) === key));
    out.push({
      key,
      mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receitas: s.receitas,
      despesas: s.despesas,
    });
  }
  return out;
}

export function goalProgress(g: Pick<Goal, "valor_atual" | "valor_objetivo">) {
  if (!g.valor_objetivo) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(g.valor_atual) / Number(g.valor_objetivo)) * 100)));
}

/** Compare expenses of the last 7 days vs the 7 days before, relative to `today`. */
export function weeklyComparison(txs: Tx[], today = new Date()) {
  const day = (offset: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const thisStart = day(6);
  const prevStart = day(13);
  const prevEnd = day(7);
  const end = day(0);
  const esta = txs.filter((t) => t.tipo === "despesa" && t.data >= thisStart && t.data <= end);
  const anterior = txs.filter((t) => t.tipo === "despesa" && t.data >= prevStart && t.data <= prevEnd);
  return {
    esta: { total: summarize(esta).despesas, categorias: byCategory(esta) },
    anterior: { total: summarize(anterior).despesas, categorias: byCategory(anterior) },
  };
}
