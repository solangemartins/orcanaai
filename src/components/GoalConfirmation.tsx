import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { goalProposalsQuery } from "@/lib/data";
import { formatBRL } from "@/lib/finance";
import { Button } from "@/components/ui/button";

export function GoalConfirmation({ proposalId, title }: { proposalId: string; title: string }) {
  const qc = useQueryClient();
  const proposals = useQuery(goalProposalsQuery);
  const proposal = proposals.data?.find((p) => p.id === proposalId);
  const [busy, setBusy] = useState(false);
  const confirm = async (approved: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("confirm_goal_movement", { p_proposal_id: proposalId, p_approved: approved });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const result = data as { status?: string } | null;
    await Promise.all(["goals", "transactions", "goal-proposals", "goal-movements"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
    toast.success(result?.status === "confirmed" ? "Meta e saldo livre atualizados. Movimentação salva no histórico." : "Cancelado. Nenhum saldo foi alterado.");
  };
  if (proposals.isPending) return <p className="text-sm text-muted-foreground">Consultando confirmação...</p>;
  if (!proposal) return <p className="text-sm text-destructive">Não foi possível consultar esta confirmação.</p>;
  const labels = { aporte: "Aporte", retirada: "Retirada", correcao: "Correção de aporte", estorno: "Estorno de aporte" };
  return (
    <div className="my-2 space-y-3 border-l-2 border-highlight py-2 pl-4 text-sm" aria-label={`Confirmação para ${title}`}>
      <p className="font-semibold">{labels[proposal.action as keyof typeof labels]} · {title}</p>
      <p className="font-medium">{formatBRL(Number(proposal.amount))}</p>
      <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
        {formatBRL(Number(proposal.expected_balance))}<ArrowRight className="size-4" aria-hidden />
        {formatBRL(Number(proposal.expected_balance) + Number(proposal.delta))}
      </p>
      {proposal.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => confirm(true)}><Check aria-hidden /> Confirmar</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => confirm(false)}><X aria-hidden /> Cancelar</Button>
        </div>
      ) : <p className={proposal.status === "confirmed" ? "font-medium text-primary" : "text-muted-foreground"}>{proposal.status === "confirmed" ? "Confirmado · saldo atualizado" : "Cancelado · saldo preservado"}</p>}
    </div>
  );
}