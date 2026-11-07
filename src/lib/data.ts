import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Goal, Tx } from "./finance";

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async (): Promise<Tx[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id,tipo,valor,categoria,descricao,data")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []).map((t) => ({ ...t, valor: Number(t.valor) }));
  },
});

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: async (): Promise<Goal[]> => {
    const { data, error } = await supabase
      .from("goals")
      .select("id,titulo,valor_objetivo,valor_atual,prazo")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((g) => ({
      ...g,
      valor_objetivo: Number(g.valor_objetivo),
      valor_atual: Number(g.valor_atual),
    }));
  },
});

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const insightsQuery = queryOptions({
  queryKey: ["insights"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("id,titulo,descricao,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  },
});

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
