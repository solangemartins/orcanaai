import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageCircle, Target, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, OrcaAvatar } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORÇANA AI — Organize suas finanças conversando" },
      { name: "description", content: "Registre gastos e receitas em linguagem natural com o Orça, seu agente financeiro com IA. Metas, relatórios e diagnóstico semanal." },
      { property: "og:title", content: "ORÇANA AI — Organize suas finanças conversando" },
      { property: "og:description", content: "Registre gastos em linguagem natural com o Orça, seu agente financeiro com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const exemplos = ["Gastei R$ 45 no almoço", "Recebi R$ 2.500 de salário", "Paguei R$ 120 de internet"];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/painel" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 md:grid-cols-2 md:pt-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
              Com o Orça, seu agente financeiro
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Organizar suas finanças deve ser tão simples quanto <span className="text-secondary">conversar.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Sem planilhas e sem formulários. Conte ao Orça o que gastou ou recebeu — ele registra, classifica e te ajuda a alcançar suas metas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero" className="h-12 rounded-xl px-7 text-base">
                <Link to="/auth">Começar grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          <div className="relative rounded-3xl bg-hero p-6 shadow-lift">
            <div className="space-y-3">
              {exemplos.map((e, i) => (
                <div key={e} className="space-y-2" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                    {e}
                  </div>
                  <div className="flex items-start gap-2">
                    <OrcaAvatar className="size-8" />
                    <div className="w-fit rounded-2xl rounded-bl-sm bg-primary-foreground/15 px-4 py-2.5 text-sm text-primary-foreground">
                      {i === 1 ? "✅ Receita registrada em Salário." : `✅ Despesa registrada em ${i === 0 ? "Alimentação" : "Moradia"}.`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-3">
            {[
              { icon: MessageCircle, t: "Registro por conversa", d: "Escreva como fala. O Orça entende e classifica automaticamente." },
              { icon: Target, t: "Metas visuais", d: "Reserva de emergência, viagem, notebook: acompanhe cada passo." },
              { icon: PieChart, t: "Diagnóstico semanal", d: "Um resumo personalizado com comparações e oportunidades de economia." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border bg-background p-6">
                <Icon className="mb-4 size-8 text-secondary" aria-hidden />
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} ORÇANA AI</footer>
    </div>
  );
}
