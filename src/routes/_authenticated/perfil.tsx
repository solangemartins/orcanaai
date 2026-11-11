import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => pageMeta("Perfil — ORÇANA AI", "Gerencie seus dados pessoais, preferências e segurança da conta."),
  component: Perfil,
});

function Perfil() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const profile = useQuery(profileQuery(user.id));
  const [nome, setNome] = useState("");
  const [orc, setOrc] = useState("");
  const [notif, setNotif] = useState(true);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setNome(profile.data.nome);
    setOrc(profile.data.orcamento_mensal !== null ? String(profile.data.orcamento_mensal) : "");
    setNotif(profile.data.notificacoes);
  }, [profile.data]);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update({ nome, orcamento_mensal: orc ? Number(orc) : null, notificacoes: notif })
      .eq("id", user.id);
    if (error) { toast.error("Não foi possível salvar."); return; }
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Perfil atualizado");
  };

  const trocarSenha = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: senha, current_password: senhaAtual } as never);
    if (error) { toast.error(error.message); return; }
    setSenha(""); setSenhaAtual("");
    toast.success("Senha alterada");
  };

  return (
    <Page title="Perfil" subtitle={user.email ?? ""}>
      <form onSubmit={salvar} className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Dados pessoais e preferências</h2>
        <div className="space-y-1.5"><Label htmlFor="n">Nome</Label><Input id="n" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="o">Orçamento mensal (R$)</Label>
          <CurrencyInput id="o" value={orc} onValueChange={setOrc} placeholder="R$ 0,00" />
          <p className="text-sm text-muted-foreground">Limite de gastos por mês. O Orça usa para te avisar se estiver perto de ultrapassar.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="notif">Notificações</Label>
            <p className="text-sm text-muted-foreground">Receber lembretes e o diagnóstico semanal.</p>
          </div>
          <Switch id="notif" checked={notif} onCheckedChange={setNotif} />
        </div>
        <Button type="submit">Salvar</Button>
      </form>

      <form onSubmit={trocarSenha} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Segurança</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="sa">Senha atual</Label><Input id="sa" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="sn">Nova senha</Label><Input id="sn" type="password" minLength={6} required value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        </div>
        <Button type="submit" variant="outline">Alterar senha</Button>
      </form>
    </Page>
  );
}
