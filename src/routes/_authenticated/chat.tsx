import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authHeaders } from "@/lib/data";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { OrcaAvatar } from "@/components/Brand";
import { formatBRL } from "@/lib/finance";
import { restoreChatHistory } from "@/lib/chat-history";
import { pageMeta } from "@/lib/metadata";
import { GoalConfirmation } from "@/components/GoalConfirmation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  head: () => pageMeta("Conversar com o Orça — ORÇANA AI", "Registre receitas e despesas e confirme alterações nas metas com o Orça."),
  component: ChatPage,
});

const historyQuery = (userId: string) => ({
  queryKey: ["chat-history", userId],
  queryFn: async (): Promise<UIMessage[]> => {
    const { data, error } = await supabase.from("chat_messages").select("id,sdk_id,role,parts,created_at,reply_to_sdk_id").eq("user_id", userId).order("created_at", { ascending: false }).order("role", { ascending: true }).order("id", { ascending: false }).limit(200);
    if (error) throw error;
    return restoreChatHistory(data ?? []);
  },
  staleTime: Infinity,
});

function ChatPage() {
  const { user } = useAuth();
  const history = useQuery({ ...historyQuery(user?.id ?? ""), enabled: Boolean(user) });
  if (history.isPending) return <div className="p-10 text-center text-muted-foreground">Carregando conversa...</div>;
  if (history.isError) return <div className="p-10 text-center text-destructive">Não foi possível carregar a conversa.</div>;
  return <ChatWindow key={user?.id} initial={history.data} />;
}

const sugestoes = ["Gastei R$ 45 no almoço", "Recebi R$ 2.500 de salário", "Paguei R$ 120 de internet", "Quero juntar R$ 10.000 para reserva de emergência", "Onde estou gastando mais?"];

function ChatWindow({ initial }: { initial: UIMessage[] }) {
  const qc = useQueryClient();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const sentQ = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop } = useChat({
    id: "orca",
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async () => authHeaders(),
    }),
    onError: (e) => {
      const msg = e.message || "";
      if (msg.includes("402")) toast.error("Os créditos de IA acabaram. Tente mais tarde.");
      else if (msg.includes("429")) toast.error("Muitas mensagens seguidas. Aguarde um instante.");
      else toast.error("Não consegui responder agora. Tente novamente.");
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goal-proposals"] });
      qc.invalidateQueries({ queryKey: ["goal-movements"] });
      qc.invalidateQueries({ queryKey: ["chat-history"] });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy && (!document.activeElement || document.activeElement === document.body || document.activeElement === textarea.current)) textarea.current?.focus();
  }, [busy]);

  useEffect(() => {
    if (q && !sentQ.current) {
      sentQ.current = true;
      sendMessage({ text: q });
      navigate({ search: { q: undefined }, replace: true });
    }
  }, [q, sendMessage, navigate]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] w-full max-w-3xl flex-col px-3 md:h-screen md:px-5">
      <div className="flex items-center gap-3 border-b py-4">
        <OrcaAvatar className="size-11" />
        <div>
          <h1 className="text-lg font-semibold leading-tight">Orça</h1>
          <p className="text-sm text-muted-foreground">Seu agente financeiro</p>
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<OrcaAvatar className="size-20" />}
              title="Oi! Eu sou o Orça 👋"
              description="Me conte o que você gastou ou recebeu, como numa conversa. Eu registro e organizo tudo para você."
            />
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role} data-message-id={m.id}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground text-base">
                  {m.parts.map((part, i) => {
                    if (part.type === "text") return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    if (part.type === "reasoning")
                      return (
                        <Reasoning key={i} isStreaming={status === "streaming" && i === m.parts.length - 1}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    if (part.type.startsWith("tool-")) {
                      const tp = part as Parameters<typeof ToolHeader>[0] & { input?: unknown; output?: unknown; errorText?: string; state: string; type: `tool-${string}` };
                      return <ToolCard key={i} part={tp} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>O Orça está pensando...</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="space-y-2 pb-3 pt-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sugestoes.map((s) => (
            <Button
              key={s}
              variant="outline"
              disabled={busy}
              onClick={() => sendMessage({ text: s })}
              className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:border-secondary disabled:opacity-50"
            >
              {s}
            </Button>
          ))}
        </div>
        <PromptInput
          onSubmit={({ text }) => {
            if (!text.trim() || busy) return;
            sendMessage({ text });
          }}
          className="rounded-2xl bg-card shadow-soft"
        >
          <PromptInputTextarea ref={textarea} autoFocus placeholder="Ex.: Gastei R$ 30 de Uber hoje" aria-label="Mensagem para o Orça" />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

const TOOL_LABEL: Record<string, string> = {
  "tool-registrar_transacao": "Registrando movimentação",
  "tool-criar_meta": "Criando meta",
  "tool-contribuir_meta": "Atualizando meta",
  "tool-corrigir_meta": "Preparando correção",
  "tool-sincronizar_saldo": "Consultando saldo livre",
};

function ToolCard({ part }: { part: { type: `tool-${string}`; state: string; input?: unknown; output?: unknown; errorText?: string } }) {
  const out = part.output as { ok?: boolean; erro?: string; proposta?: { id: string; titulo?: string }; transacao?: { tipo: string; valor: number; categoria: string; descricao: string }; meta?: { titulo: string; valor_atual: number; valor_objetivo: number } } | undefined;
  return (
    <div className="space-y-2">
      {out?.ok && out.proposta && <GoalConfirmation proposalId={out.proposta.id} title={out.proposta.titulo ?? "Meta financeira"} />}
      {out?.erro && <p role="alert" className="text-sm text-destructive">{out.erro}</p>}
      {out?.ok && out.transacao && (
        <div className="flex items-center gap-3 rounded-xl border border-secondary/40 bg-accent px-4 py-3 text-sm">
          <span aria-hidden>✅</span>
          <span>
            <strong>{out.transacao.tipo === "receita" ? "Receita" : "Despesa"}</strong> de {formatBRL(Number(out.transacao.valor))} · {out.transacao.categoria}
            {out.transacao.descricao ? ` · ${out.transacao.descricao}` : ""}
          </span>
        </div>
      )}
      {out?.ok && out.meta && (
        <div className="flex items-center gap-3 rounded-xl border border-highlight/50 bg-card px-4 py-3 text-sm">
          <span aria-hidden>🎯</span>
          <span>
            <strong>{out.meta.titulo}</strong>: {formatBRL(Number(out.meta.valor_atual))} de {formatBRL(Number(out.meta.valor_objetivo))}
          </span>
        </div>
      )}
      <Tool defaultOpen={false}>
        <ToolHeader type={part.type as never} state={part.state as never} title={TOOL_LABEL[part.type] ?? part.type} />
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput output={part.output as never} errorText={part.errorText} />
        </ToolContent>
      </Tool>
    </div>
  );
}
