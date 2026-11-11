import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { History, Undo2, Minus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { goalMovementsQuery } from "@/lib/data";
import { formatBRL, type Goal } from "@/lib/finance";
import type { GoalAction } from "@/lib/goal-rules";
import { GoalConfirmation } from "./GoalConfirmation";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { CurrencyInput } from "./ui/currency-input";
import { Label } from "./ui/label";

export function GoalActivity({ goal }: { goal: Goal }) {
  const qc = useQueryClient();
  const history = useQuery(goalMovementsQuery);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<GoalAction>("retirada");
  const [reference, setReference] = useState<string>();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [proposalId, setProposalId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const movements = (history.data ?? []).filter((m) => m.goal_id === goal.id);
  const labels: Record<string, string> = { aporte: "Aporte", retirada: "Retirada", correcao: "Correção", estorno: "Estorno", saldo_inicial: "Saldo inicial" };
  const begin = (next: GoalAction, id?: string) => {
    setAction(next); setReference(id); setAmount(""); setReason(""); setProposalId(undefined); setOpen(true);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = action === "estorno" ? 0 : Number(amount);
    if (!Number.isFinite(value) || value < 0 || (action === "retirada" && value === 0)) { toast.error("Informe um valor válido."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("prepare_goal_movement", {
      p_goal_id: goal.id, p_action: action, p_amount: value, p_reason: reason,
      p_request_key: crypto.randomUUID(), ...(reference ? { p_reference_id: reference } : {}),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const proposal = data as { id?: string } | null;
    await qc.invalidateQueries({ queryKey: ["goal-proposals"] });
    setProposalId(proposal?.id);
  };
  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => begin("retirada")}><Minus aria-hidden /> Retirar</Button>
        <Button size="sm" variant="ghost" onClick={() => begin("estorno")}><Undo2 aria-hidden /> Estornar último aporte</Button>
      </div>
      <details className="mt-2 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 py-2 font-medium"><History className="size-4" aria-hidden /> Histórico da meta</summary>
        {history.isError ? <p className="text-destructive">Não foi possível consultar o histórico.</p> : movements.length === 0 ? <p className="py-2 text-muted-foreground">Ainda não há movimentações com histórico.</p> : (
          <ul className="divide-y">
            {movements.map((m) => {
              const reversed = movements.some((r) => r.reference_id === m.id && r.action === "estorno");
              return <li key={m.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{labels[m.action]} · {Number(m.amount) > 0 ? "+ " : "− "}{formatBRL(Math.abs(Number(m.amount)))}</span>
                  <time className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</time>
                </div>
                <p className="text-muted-foreground">Saldo: {formatBRL(Number(m.balance_after))}</p>
                {m.reason && <p className="break-words text-xs text-muted-foreground">{m.reason}</p>}
                {m.action === "aporte" && !reversed && <Button size="sm" variant="ghost" onClick={() => begin("correcao", m.id)}><Pencil aria-hidden /> Corrigir aporte</Button>}
                {reversed && <p className="text-xs text-muted-foreground">Aporte estornado</p>}
              </li>;
            })}
          </ul>
        )}
      </details>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{labels[action]} · {goal.titulo}</DialogTitle><DialogDescription>Saldo atual: {formatBRL(goal.valor_atual)}</DialogDescription></DialogHeader>
          {proposalId ? <GoalConfirmation proposalId={proposalId} title={goal.titulo} /> : (
            <form onSubmit={submit} className="space-y-4">
              {action !== "estorno" && <div className="space-y-2"><Label htmlFor={`correction-${goal.id}`}>{action === "correcao" ? "Valor correto do aporte (R$)" : "Valor a retirar (R$)"}</Label><CurrencyInput id={`correction-${goal.id}`} required value={amount} onValueChange={setAmount} placeholder="R$ 0,00" /></div>}
              <div className="space-y-2"><Label htmlFor={`reason-${goal.id}`}>Motivo (opcional)</Label><Input id={`reason-${goal.id}`} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <Button type="submit" disabled={busy}>Revisar {(labels[action] ?? "movimentação").toLowerCase()}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}