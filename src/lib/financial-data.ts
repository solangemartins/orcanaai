import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { availableBalance, type Goal, type Tx } from "./finance";

const PAGE_SIZE = 1000;

// Paginate instead of silently truncating lifetime totals at the Data API row limit.
export async function readTransactions(client: SupabaseClient<Database>): Promise<Tx[]> {
  const transactions: Tx[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await client.from("transactions")
      .select("id,tipo,valor,categoria,descricao,data")
      .order("data", { ascending: false }).order("created_at", { ascending: false }).order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    transactions.push(...(data ?? []).map((row) => ({ ...row, valor: Number(row.valor) })));
    if ((data?.length ?? 0) < PAGE_SIZE) return transactions;
  }
}

export async function readGoals(client: SupabaseClient<Database>): Promise<Goal[]> {
  const goals: Goal[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await client.from("goals")
      .select("id,titulo,valor_objetivo,valor_atual,prazo")
      .order("created_at", { ascending: true }).order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    goals.push(...(data ?? []).map((row) => ({ ...row, valor_atual: Number(row.valor_atual), valor_objetivo: Number(row.valor_objetivo) })));
    if ((data?.length ?? 0) < PAGE_SIZE) return goals;
  }
}

export async function readAvailableBalance(client: SupabaseClient<Database>) {
  const [transactions, goals] = await Promise.all([readTransactions(client), readGoals(client)]);
  return availableBalance(transactions, goals);
}