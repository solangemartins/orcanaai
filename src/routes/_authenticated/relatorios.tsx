import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery, transactionsQuery } from "@/lib/data";
import { CATEGORIA_EMOJI, byCategory, formatBRL, formatDate, goalProgress, inMonth, monthlyEvolution, summarize } from "@/lib/finance";
import { Page, StatCard } from "@/components/Page";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => pageMeta("Relatórios — ORÇANA AI", "Consulte gastos por categoria, evolução mensal e comparativos financeiros."),
  component: Relatorios,
});

function Relatorios() {
  const qc = useQueryClient();
  const txs = useQuery(transactionsQuery);
  const goals = useQuery(goalsQuery);
  const list = txs.data ?? [];
  const mes = inMonth(list);
  const s = summarize(mes);
  const cats = byCategory(mes);
  const max = cats[0]?.total ?? 1;
  const evo = monthlyEvolution(list);

  const remover = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <Page title="Relatórios" subtitle="Seu dinheiro, explicado de forma simples.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="primary" label="Saldo do mês" value={formatBRL(s.saldo)} />
        <StatCard tone="income" label="Receitas" value={formatBRL(s.receitas)} />
        <StatCard tone="expense" label="Despesas" value={formatBRL(s.despesas)} />
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Gastos por categoria (este mês)</h2>
        {cats.length === 0 ? (
          <p className="text-muted-foreground">Sem despesas neste mês.</p>
        ) : (
          <ul className="space-y-3">
            {cats.map((c) => (
              <li key={c.categoria}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium"><span aria-hidden>{CATEGORIA_EMOJI[c.categoria]} </span>{c.categoria}</span>
                  <span>{formatBRL(c.total)} · {Math.round((c.total / s.despesas) * 100)}%</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${(c.total / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-1 text-lg font-semibold">Receitas x despesas</h2>
        <p className="mb-4 text-sm text-muted-foreground">Evolução dos últimos 6 meses</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evo}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" tickFormatter={(v) => `R$${v}`} width={70} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Progresso das metas</h2>
        {(goals.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhuma meta criada.</p> : (
          <ul className="space-y-3">
            {goals.data!.map((g) => (
              <li key={g.id}>
                <div className="flex justify-between text-sm"><span className="font-medium">{g.titulo}</span><span>{goalProgress(g)}%</span></div>
                <Progress value={goalProgress(g)} className="mt-1 h-2.5" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Todas as movimentações</h2>
        {list.length === 0 ? <p className="text-muted-foreground">Nada registrado ainda.</p> : (
          <ul className="divide-y">
            {list.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl" aria-hidden>{CATEGORIA_EMOJI[t.categoria] ?? "📦"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.descricao || t.categoria}</p>
                  <p className="text-xs text-muted-foreground">{t.tipo === "receita" ? "Receita" : "Despesa"} · {t.categoria} · {formatDate(t.data)}</p>
                </div>
                <span className={t.tipo === "receita" ? "font-semibold text-income" : "font-semibold text-expense"}>
                  {t.tipo === "receita" ? "+ " : "− "}{formatBRL(t.valor)}
                </span>
                <Button variant="ghost" size="icon" onClick={() => remover(t.id)} aria-label={`Excluir ${t.descricao}`}><Trash2 aria-hidden /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
