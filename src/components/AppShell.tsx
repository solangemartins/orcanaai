import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, MessageCircle, Target, BarChart3, UserRound, LogOut, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Logo, OrcaAvatar } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/chat", label: "Orça", icon: MessageCircle },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function AppShell() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user.id));

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Logo light className="mb-8 text-2xl" />
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Icon className="size-5" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sidebar-accent">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between border-b bg-card px-5 py-3 md:hidden">
          <Logo />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut aria-hidden /> Sair
          </Button>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden" aria-label="Navegação principal">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {profile.data && !profile.data.onboarded && (
        <Onboarding userId={user.id} initialName={profile.data.nome} />
      )}
    </div>
  );
}

function Onboarding({ userId, initialName }: { userId: string; initialName: string }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState(initialName);
  const [orcamento, setOrcamento] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), orcamento_mensal: orcamento ? Number(orcamento.replace(",", ".")) : null, onboarded: true })
      .eq("id", userId);
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar. Tente de novo."); return; }
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  };

  const steps = [
    {
      title: "Bem-vindo ao ORÇANA AI",
      body: "Aqui você organiza seu dinheiro conversando — sem planilhas e sem formulários complicados.",
    },
    {
      title: "Conheça o Orça",
      body: "O Orça é seu agente financeiro. Diga “Gastei R$ 45 no almoço” e ele registra e classifica para você. Ele também sugere formas de economizar.",
    },
  ];

  return (
    <Dialog open>
      <DialogContent className="max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex justify-center">
          <OrcaAvatar className="size-24" />
        </div>
        {step < 2 ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">{steps[step]!.title}</DialogTitle>
              <DialogDescription className="text-center text-base">{steps[step]!.body}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(step - 1)}>
                  <ArrowLeft aria-hidden /> Voltar
                </Button>
              )}
              <Button variant="turquoise" size="lg" className="flex-1" onClick={() => setStep(step + 1)}>
                Próximo <ArrowRight aria-hidden />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">Passo {step + 1} de 3</p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Vamos configurar seu perfil</DialogTitle>
              <DialogDescription className="text-center">Leva menos de um minuto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Como podemos te chamar?</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orc">Quanto você quer gastar por mês? (opcional)</Label>
                <Input id="orc" inputMode="decimal" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} placeholder="Ex.: 3000" />
                <p className="text-sm text-muted-foreground">Esse é seu <strong>orçamento</strong>: um limite que ajuda o Orça a te avisar quando estiver gastando demais.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft aria-hidden /> Voltar</Button>
              <Button variant="turquoise" size="lg" className="flex-1" onClick={finish} disabled={!nome.trim() || saving}>
              {saving ? "Salvando..." : "Começar a usar"}
            </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
