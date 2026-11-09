import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon, Logo, OrcaAvatar } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — FINOVO" },
      { name: "description", content: "Entre ou crie sua conta no FINOVO para organizar suas finanças com o Orça." },
      { property: "og:title", content: "Entrar — FINOVO" },
      { property: "og:description", content: "Entre ou crie sua conta no FINOVO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/painel" });
  }, [loading, user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { nome } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos.");
    }
    setBusy(false);
  };

  const oauth = async (provider: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar agora.");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-10 md:flex">
        <Logo light className="text-3xl" />
        <div className="space-y-4">
          <OrcaAvatar className="size-28 bg-primary-foreground/90" />
          <p className="font-display text-3xl font-semibold leading-snug text-primary-foreground">
            “Oi! Eu sou o Orça. Me conte seus gastos que eu cuido do resto.”
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">Finanças tão simples quanto conversar.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden"><Logo className="text-2xl" /></div>
          {sent ? (
            <div className="space-y-3 rounded-2xl border bg-card p-6 text-center">
              <h1 className="text-2xl font-semibold">Confira seu e-mail 📬</h1>
              <p className="text-muted-foreground">Enviamos um link para <strong>{email}</strong>. Clique nele para ativar sua conta.</p>
              <Button variant="ghost" onClick={() => { setSent(false); setMode("in"); }}>Voltar para entrar</Button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-3xl font-bold">{mode === "in" ? "Que bom te ver!" : "Crie sua conta"}</h1>
                <p className="mt-1 text-muted-foreground">{mode === "in" ? "Entre para continuar." : "É grátis e leva um minuto."}</p>
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" className="btn-google h-11 w-full" onClick={() => oauth("google")}>
                  <GoogleIcon /> Continuar com Google
                </Button>
                <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
                  Continue with Lovable
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou com e-mail <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "up" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} className="h-11" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                </div>
                <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
                  {busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
              <p className="text-center text-sm">
                {mode === "in" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
                <button className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                  {mode === "in" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
