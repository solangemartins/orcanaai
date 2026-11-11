import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authHeaders, goalsQuery, insightsQuery, profileQuery, transactionsQuery } from "@/lib/data";
import { CATEGORIA_EMOJI, formatBRL, formatDate, goalProgress, inMonth, summarize } from "@/lib/finance";
import { Page, StatCard } from "@/components/Page";
import { OrcaAvatar } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => pageMeta("Painel — ORÇANA AI", "Visão geral do saldo, receitas, despesas e metas financeiras."),
  component: Painel,
});

const atalhos = ["Gastei R$ 45 no almoço", "Recebi R$ 2.500 de salário", "Como posso economizar?"];

function Painel() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const txs = useQuery(transactionsQuery);
  const goals = useQuery(goalsQuery);
  const insights = useQuery(insightsQuery);
  const profile = useQuery(profileQuery(user.id));
  const [gerando, setGerando] = useState(false);
  const autoTried = useRef(false);

  const list = txs.data ?? [];
  const total = summarize(list);
  const mes = summarize(inMonth(list));
  const latest = insights.data?.[0];

  const gerar = async () => {
    setGerando(true);
    try {
      const r = await fetch("/api/diagnostico", { method: "POST", headers: await authHeaders() });
      const body = await r.json();
      if (!r.ok) toast.error(body.error ?? "Erro ao gerar diagnóstico");
      else if (body.skipped) toast.info("Registre algumas movimentações para receber seu diagnóstico.");
      else qc.invalidateQueries({ queryKey: ["insights"] });
    } catch {
      toast.error("Sem conexão. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  // Diagnóstico semanal automático: gera se não houver um nos últimos 7 dias.
  useEffect(() => {
    if (autoTried.current || !insights.isSuccess || !txs.isSuccess || list.length === 0) return;
    const stale = !latest || Date.now() - new Date(latest.created_at).getTime() > 7 * 86400000;
    if (stale) {
      autoTried.current = true;
      gerar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.isSuccess, txs.isSuccess, list.length, latest]);

  const nome = profile.data?.nome?.split(" ")[0];
  const mesNome = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <Page title={nome ? `Olá, ${nome}!` : "Olá!"} subtitle={`Seu resumo de ${mesNome}`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="primary" label="Saldo atual" value={formatBRL(total.saldo)} icon={<Wallet className="size-4" aria-hidden />} />
        <StatCard tone="income" label="Receitas do mês" value={formatBRL(mes.receitas)} icon={<ArrowUpCircle className="size-4 text-income" aria-hidden />} />
        <StatCard tone="expense" label="Despesas do mês" value={formatBRL(mes.despesas)} icon={<ArrowDownCircle className="size-4 text-expense" aria-hidden />} />
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <OrcaAvatar className="size-14" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Diagnóstico semanal</p>
              <Button variant="ghost" size="sm" onClick={gerar} disabled={gerando}>
                <RefreshCw className={gerando ? "animate-spin" : ""} aria-hidden /> {gerando ? "Analisando..." : "Atualizar"}
              </Button>
            </div>
            {latest ? (
              <>
                <h2 className="mt-1 text-xl font-semibold">{latest.titulo}</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{latest.descricao}</p>
              </>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {gerando ? "O Orça está analisando sua semana..." : "Registre suas primeiras movimentações e o Orça vai preparar um resumo personalizado da sua semana."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-accent p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold text-accent-foreground">
          <MessageCircle className="size-5" aria-hidden /> Fale com o Orça
        </div>
        <div className="flex flex-wrap gap-2">
          {atalhos.map((a) => (
            <Link key={a} to="/chat" search={{ q: a }} className="rounded-full border border-secondary/40 bg-card px-4 py-2 text-sm font-medium hover:border-secondary">
              {a}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Metas em andamento</h2>
            <Link to="/metas" className="text-sm font-semibold text-primary hover:underline">Ver todas</Link>
          </div>
          {(goals.data ?? []).length === 0 ? (
            <p className="text-muted-foreground">Nenhuma meta ainda. Diga ao Orça: “Quero juntar R$ 5.000 para uma viagem”.</p>
          ) : (
            <ul className="space-y-4">
              {goals.data!.slice(0, 3).map((g) => {
                const p = goalProgress(g);
                return (
                  <li key={g.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.titulo}</span>
                      <span className="text-muted-foreground">{p}%</span>
                    </div>
                    <Progress value={p} className="mt-1.5 h-2.5" aria-label={`${g.titulo}: ${p}% concluído`} />
                    <p className="mt-1 text-xs text-muted-foreground">{formatBRL(g.valor_atual)} de {formatBRL(g.valor_objetivo)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold">Últimas movimentações</h2>
          {list.length === 0 ? (
            <p className="text-muted-foreground">Nada registrado ainda.</p>
          ) : (
            <ul className="divide-y">
              {list.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xl" aria-hidden>{CATEGORIA_EMOJI[t.categoria] ?? "📦"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.descricao || t.categoria}</p>
                    <p className="text-xs text-muted-foreground">{t.categoria} · {formatDate(t.data)}</p>
                  </div>
                  <span className={t.tipo === "receita" ? "font-semibold text-income" : "font-semibold text-expense"}>
                    {t.tipo === "receita" ? "+ " : "− "}
                    {formatBRL(t.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
