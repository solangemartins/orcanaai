import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Goal, Tx } from "./finance";
import { readGoals, readTransactions } from "./financial-data";

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: (): Promise<Tx[]> => readTransactions(supabase),
});

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: (): Promise<Goal[]> => readGoals(supabase),
});

export const goalMovementsQuery = queryOptions({
  queryKey: ["goal-movements"],
  queryFn: async () => {
    const { data, error } = await supabase.from("goal_movements").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const goalProposalsQuery = queryOptions({
  queryKey: ["goal-proposals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("goal_movement_proposals").select("*");
    if (error) throw error;
    return data ?? [];
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
