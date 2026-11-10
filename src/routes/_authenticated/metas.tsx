import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, CalendarDays, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery } from "@/lib/data";
import { formatBRL, formatDate, goalProgress, type Goal } from "@/lib/finance";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — FINOVO" }, { name: "description", content: "Acompanhe seus objetivos financeiros." }] }),
  component: Metas,
});

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function Metas() {
  const goals = useQuery(goalsQuery);
  const [open, setOpen] = useState(false);

  return (
    <Page
      title="Metas financeiras"
      subtitle="Defina objetivos e acompanhe cada passo."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus aria-hidden /> Nova meta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
            <NovaMeta onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      {(goals.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <p className="text-lg font-medium">Nenhuma meta ainda</p>
          <p className="mt-1 text-muted-foreground">Ideias: reserva de emergência, viagem, notebook novo, entrada de imóvel.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.data!.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </Page>
  );
}

function NovaMeta({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [atual, setAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("goals").insert({
      titulo,
      valor_objetivo: num(valor),
      valor_atual: atual ? num(atual) : 0,
      prazo: prazo || null,
    });
    if (error) { toast.error("Confira os valores e tente de novo."); return; }
    qc.invalidateQueries({ queryKey: ["goals"] });
    toast.success("Meta criada!");
    onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="t">Objetivo</Label><Input id="t" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Viagem para a praia" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="v">Valor da meta (R$)</Label><Input id="v" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="a">Já guardado (R$)</Label><Input id="a" inputMode="decimal" value={atual} onChange={(e) => setAtual(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="p">Prazo (opcional)</Label><Input id="p" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
      <Button type="submit" className="w-full" size="lg">Criar meta</Button>
    </form>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const qc = useQueryClient();
  const [add, setAdd] = useState("");
  const p = goalProgress(goal);
  const done = p >= 100;
  const falta = Math.max(0, goal.valor_objetivo - goal.valor_atual);

  const contribuir = async (e: FormEvent) => {
    e.preventDefault();
    const v = num(add);
    if (!v || v <= 0) return;
    const { error } = await supabase.from("goals").update({ valor_atual: goal.valor_atual + v }).eq("id", goal.id);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    setAdd("");
    qc.invalidateQueries({ queryKey: ["goals"] });
    toast.success(`${formatBRL(v)} guardados em ${goal.titulo}`);
  };
  const remover = async () => {
    if (!confirm(`Excluir a meta "${goal.titulo}"?`)) return;
    await supabase.from("goals").delete().eq("id", goal.id);
    qc.invalidateQueries({ queryKey: ["goals"] });
  };

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{goal.titulo}</h2>
        <Button variant="ghost" size="icon" onClick={remover} aria-label={`Excluir ${goal.titulo}`}><Trash2 aria-hidden /></Button>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold">{formatBRL(goal.valor_atual)}</span>
        <span className="text-sm text-muted-foreground">de {formatBRL(goal.valor_objetivo)}</span>
      </div>
      <Progress value={p} className="mt-2 h-3" aria-label={`${p}% concluído`} />
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
        <span className="font-semibold">{done ? <span className="inline-flex items-center gap-1 text-highlight-foreground"><Trophy className="size-4 text-highlight" aria-hidden /> Meta concluída!</span> : `${p}% · faltam ${formatBRL(falta)}`}</span>
        {goal.prazo && <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="size-4" aria-hidden /> até {formatDate(goal.prazo)}</span>}
      </div>
      {!done && (
        <form onSubmit={contribuir} className="mt-4 flex gap-2">
          <Input inputMode="decimal" placeholder="Guardar R$" value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Valor para guardar" />
          <Button type="submit" variant="turquoise">Guardar</Button>
        </form>
      )}
    </article>
  );
}
