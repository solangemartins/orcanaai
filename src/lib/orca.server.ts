import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, generateId, isStepCount, streamText, tool, type ModelMessage, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { assistantTimestamp } from "./chat-history";
import { isGoalMovementRequest } from "./goal-rules";
import {
  CATEGORIAS,
  byCategory,
  formatBRL,
  goalProgress,
  inMonth,
  normalizeCategoria,
  summarize,
  weeklyComparison,
  type Tx,
} from "./finance";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./ai/run-id.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function authenticate(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof authenticate>>>;

function gateway(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(MODEL), runIdFetch };
}

const providerOptions = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;

const today = () => new Date().toISOString().slice(0, 10);

async function loadSnapshot(ctx: Ctx) {
  const [{ data: txs, error: txError }, { data: goals, error: goalError }, { data: profile, error: profileError }, { data: movements, error: movementError }] = await Promise.all([
    ctx.supabase.from("transactions").select("id,tipo,valor,categoria,descricao,data").order("data", { ascending: false }).limit(500),
    ctx.supabase.from("goals").select("id,titulo,valor_objetivo,valor_atual,prazo"),
    ctx.supabase.from("profiles").select("nome,orcamento_mensal").eq("id", ctx.user.id).maybeSingle(),
    ctx.supabase.from("goal_movements").select("id,goal_id,action,amount,balance_before,balance_after,reference_id,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  if (txError || goalError || profileError || movementError) throw new Error("Não foi possível consultar seus dados financeiros.");
  const list: Tx[] = (txs ?? []).map((t) => ({ ...t, valor: Number(t.valor) }));
  return { txs: list, goals: goals ?? [], profile, movements: movements ?? [] };
}

function snapshotText(s: Awaited<ReturnType<typeof loadSnapshot>>) {
  const all = summarize(s.txs);
  const mes = inMonth(s.txs);
  const ms = summarize(mes);
  const cats = byCategory(mes)
    .map((c) => `${c.categoria}: ${formatBRL(c.total)}`)
    .join("; ");
  const goals = s.goals
    .map(
      (g) =>
        `- ${g.titulo} (id ${g.id}): ${formatBRL(Number(g.valor_atual))} de ${formatBRL(Number(g.valor_objetivo))} (${goalProgress({ valor_atual: Number(g.valor_atual), valor_objetivo: Number(g.valor_objetivo) })}%)${g.prazo ? `, prazo ${g.prazo}` : ""}`,
    )
    .join("\n");
  const recent = s.txs
    .slice(0, 15)
    .map((t) => `${t.data} ${t.tipo} ${formatBRL(t.valor)} [${t.categoria}] ${t.descricao}`)
    .join("\n");
  return `Saldo atual: ${formatBRL(all.saldo)}
Mês atual: receitas ${formatBRL(ms.receitas)}, despesas ${formatBRL(ms.despesas)}
Gastos do mês por categoria: ${cats || "nenhum"}
Orçamento mensal definido: ${s.profile?.orcamento_mensal ? formatBRL(Number(s.profile.orcamento_mensal)) : "não definido"}
Metas:
${goals || "nenhuma"}
Últimas movimentações:
${recent || "nenhuma"}
Histórico recente das metas (valores antigos podem não ter histórico):
${s.movements.map((m) => `id ${m.id}, meta ${m.goal_id}, ${m.action}, variação ${formatBRL(Number(m.amount))}, saldo ${formatBRL(Number(m.balance_after))}, referência ${m.reference_id || "nenhuma"}`).join("\n") || "nenhum aporte com histórico"}`;
}

export function buildTools(ctx: Ctx, latestUserText: string, requestKey: string) {
  const propose = async (goalId: string, action: "aporte" | "retirada" | "correcao" | "estorno", amount: number | null, reason: string, reference: string | null, toolCallId: string) => {
    if (!isGoalMovementRequest(latestUserText)) return { ok: false, erro: "O usuário não pediu uma movimentação na meta. Registre somente a receita e pergunte se ele deseja destinar algum valor, sem chamar ferramentas de metas." };
    const { data, error } = await ctx.supabase.rpc("prepare_goal_movement", {
      p_goal_id: goalId, p_action: action, p_amount: amount ?? 0, p_reason: reason,
      p_request_key: `${requestKey}:${toolCallId}`, ...(reference ? { p_reference_id: reference } : {}),
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, confirmacao_pendente: true, proposta: data, aviso: "Nenhum saldo foi alterado. O usuário precisa clicar em Confirmar na proposta exibida no chat." };
  };
  return {
    registrar_transacao: tool({
      description:
        "Registra uma receita ou despesa do usuário. Use sempre que o usuário relatar que gastou, pagou, comprou, recebeu ou ganhou dinheiro.",
      inputSchema: z.object({
        tipo: z.enum(["receita", "despesa"]),
        valor: z.number().positive().describe("Valor em reais"),
        categoria: z.enum(CATEGORIAS),
        descricao: z.string().describe("Descrição curta, ex.: 'Almoço'"),
        data: z.string().nullable().describe("Data no formato YYYY-MM-DD; null para hoje"),
      }),
      execute: async (input) => {
        const { data, error } = await ctx.supabase
          .from("transactions")
          .insert({
            user_id: ctx.user.id,
            tipo: input.tipo,
            valor: input.valor,
            categoria: normalizeCategoria(input.categoria),
            descricao: input.descricao,
            data: input.data || today(),
          })
          .select("id,tipo,valor,categoria,descricao,data")
          .single();
        if (error) return { ok: false, erro: error.message };
        if (input.tipo === "receita") {
          // Read persisted totals after recording, including earlier tool calls in this turn.
          const transactions: Pick<Tx, "tipo" | "valor">[] = [];
          const pageSize = 1000;
          for (let start = 0; ; start += pageSize) {
            const { data: rows, error: balanceError } = await ctx.supabase.from("transactions")
              .select("tipo,valor").order("id").range(start, start + pageSize - 1);
            if (balanceError) return { ok: true, transacao: data, saldo_livre: null, aviso: "Receita registrada, mas não foi possível consultar o saldo atualizado. Não registre a receita novamente." };
            transactions.push(...(rows ?? []));
            if ((rows?.length ?? 0) < pageSize) break;
          }
          const saldo = transactions.reduce((total, t) => total + (t.tipo === "receita" ? Number(t.valor) : -Number(t.valor)), 0);
          return {
            ok: true, transacao: data, saldo_livre: Math.round(saldo * 100) / 100,
            destinos_disponiveis: ["guardar_parte", "investir", "direcionar_meta", "manter_disponivel"],
            destino_confirmado: null,
          };
        }
        return { ok: true, transacao: data };
      },
    }),
    criar_meta: tool({
      description: "Cria uma meta financeira (ex.: reserva de emergência, viagem).",
      inputSchema: z.object({
        titulo: z.string(),
        valor_objetivo: z.number().positive(),
        valor_atual: z.number().min(0).nullable(),
        prazo: z.string().nullable().describe("Data YYYY-MM-DD ou null"),
      }),
      execute: async (input) => {
        const { data, error } = await ctx.supabase
          .from("goals")
          .insert({
            user_id: ctx.user.id,
            titulo: input.titulo,
            valor_objetivo: input.valor_objetivo,
            valor_atual: 0,
            prazo: input.prazo || null,
          })
          .select()
          .single();
        if (error) return { ok: false, erro: error.message };
        if (input.valor_atual && input.valor_atual > 0) {
          return { ok: true, meta: data, aviso: "Meta criada com saldo zero. Pergunte se o usuário deseja preparar um aporte do valor já guardado e aguarde confirmação." };
        }
        return { ok: true, meta: data };
      },
    }),
    contribuir_meta: tool({
      description: "Prepara uma proposta de aporte SOMENTE quando o usuário pede para guardar dinheiro. Não altera saldo: exige clique em Confirmar. Nunca use apenas porque uma receita foi recebida.",
      inputSchema: z.object({ meta_id: z.string(), valor: z.number().positive() }),
      execute: async ({ meta_id, valor }, { toolCallId }) => propose(meta_id, "aporte", valor, latestUserText, null, toolCallId),
    }),
    corrigir_meta: tool({
      description: "Prepara retirada, correção do valor de um aporte ou estorno do último aporte com histórico. Exige confirmação no chat antes de alterar saldo. Na correção, valor é o valor CORRETO do aporte, não o saldo total. Se faltar valor ou houver várias metas e nenhuma foi indicada, pergunte. Aportes antigos sem histórico só podem ser ajustados por retirada de valor explícito.",
      inputSchema: z.object({
        meta_id: z.string(), operacao: z.enum(["retirada", "correcao", "estorno"]),
        valor: z.number().min(0).nullable().describe("Valor a retirar ou novo valor correto do aporte; null para estorno"),
        aporte_id: z.string().nullable().describe("ID do aporte original do histórico; null usa último aporte ainda não estornado"),
        motivo: z.string(),
      }),
      execute: async ({ meta_id, operacao, valor, aporte_id, motivo }, { toolCallId }) => {
        if (operacao !== "estorno" && valor === null) return { ok: false, erro: "Pergunte ao usuário o valor antes de preparar a correção." };
        return propose(meta_id, operacao, valor, motivo, aporte_id, toolCallId);
      },
    }),
  };
}

const ORCA_PERSONA = `Você é o Orça, o agente financeiro do ORÇANA AI. Fale em português do Brasil, com linguagem simples, amigável e educativa, para pessoas iniciantes em finanças.
- Quando o usuário relatar uma movimentação ("Gastei R$ 45 no almoço", "Recebi R$ 2.500 de salário"), chame registrar_transacao com a categoria correta entre: ${CATEGORIAS.join(", ")}. Depois confirme em uma frase curta (valor, categoria) e, se fizer sentido, dê uma dica rápida.
- Se a mensagem tiver várias movimentações, registre cada uma.
- Se faltar o valor, pergunte antes de registrar.
- Quando o usuário quiser criar um objetivo, use criar_meta. Para guardar dinheiro numa meta, use contribuir_meta.
- Sempre que identificar uma receita: primeiro registre APENAS a receita com registrar_transacao. Após sucesso, informe o valor recebido e o saldo livre atualizado retornado pela ferramenta (saldo_livre), sem calcular a partir do contexto anterior. Se a consulta do saldo falhar, explique que a receita foi registrada mas o saldo não pôde ser consultado; nunca invente saldo nem registre novamente.
- Depois de registrar uma receita, SEMPRE pergunte: "Você deseja guardar parte desse valor, investir, direcionar para uma meta ou manter como saldo disponível?". Ofereça as quatro escolhas mesmo sem meta ativa. Se houver meta, pode citar seu nome como opção, nunca como destino presumido. Não escolha valor, porcentagem, investimento nem destino pelo usuário.
- Receber dinheiro NÃO significa aportar em uma meta ou investir. Nenhum destino é executado automaticamente. "Manter como saldo disponível" não exige novo lançamento e não altera metas. Para guardar parte, pergunte quanto e onde; para direcionar a uma meta, pergunte qual meta e quanto, se faltar. Prepare proposta somente após pedido explícito e aguarde Confirmar. Para investir, pergunte quanto e o objetivo, ofereça orientação educativa e não registre despesa, compra ou transferência: você não executa investimentos. Uma intenção futura não é uma movimentação já realizada. Nunca repita a receita ao responder às escolhas.
- Nenhuma movimentação entre saldo e metas acontece sem confirmação explícita. contribuir_meta e corrigir_meta apenas preparam propostas. Nunca diga que guardou, removeu, corrigiu ou estornou enquanto a proposta está pendente; diga que aguarda o clique em Confirmar. Um "sim" sem valor não basta: pergunte quanto.
- Para "Remova R$ 650 da minha reserva", prepare retirada de R$ 650. Para "Desfaça o último aporte", prepare estorno do último aporte com histórico. Para "Corrija o último lançamento", pergunte qual é o valor correto se não foi informado. Atualize o progresso apenas após confirmação; cada correção fica no histórico. Nunca invente histórico de aportes antigos nem recrie receitas para corrigir uma meta.
- Ao criar uma meta, o saldo começa em zero. Se o usuário informou dinheiro já guardado, pergunte se deseja preparar um aporte desse valor, que também exige confirmação. Não use receitas do contexto como saldo inicial.
- Para recomendações, use os dados do contexto: aponte gastos excessivos, sugira economias concretas e ajude a atingir metas. Explique termos financeiros quando usar.
- Respostas curtas (até ~120 palavras), com no máximo uma lista.`;

export async function handleChat(request: Request) {
  const ctx = await authenticate(request);
  if (!ctx) return json(401, { error: "Faça login para conversar com o Orça." });

  const body = (await request.json().catch(() => null)) as { messages?: UIMessage[] } | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return json(400, { error: "Mensagem inválida" });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.id || !Array.isArray(lastUser.parts)) return json(400, { error: "Mensagem inválida" });
  const lastUserText = lastUser.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
  if (!lastUserText.trim()) return json(400, { error: "Mensagem vazia" });
  const { error: userSaveError } = await ctx.supabase.from("chat_messages").upsert({
    user_id: ctx.user.id, sdk_id: lastUser.id, role: "user", parts: lastUser.parts as Json,
  }, { onConflict: "user_id,sdk_id", ignoreDuplicates: true });
  if (userSaveError) return json(500, { error: "Não foi possível salvar sua mensagem. Tente novamente." });
  const { data: persistedUser, error: persistedError } = await ctx.supabase.from("chat_messages").select("created_at").eq("sdk_id", lastUser.id).eq("user_id", ctx.user.id).single();
  if (persistedError || !persistedUser) return json(500, { error: "Não foi possível carregar sua mensagem." });

  const snapshot = await loadSnapshot(ctx);
  const { model, runIdFetch } = gateway(request);
  const modelMessages: ModelMessage[] = await convertToModelMessages(messages.slice(-30));

  const result = streamText({
    model,
    instructions: `${ORCA_PERSONA}\n\nHoje é ${today()}. Nome do usuário: ${snapshot.profile?.nome || "não informado"}.\n\nDados financeiros atuais:\n${snapshotText(snapshot)}`,
    messages: modelMessages,
    tools: buildTools(ctx, lastUserText, lastUser.id),
    stopWhen: isStepCount(5),
    abortSignal: request.signal,
    providerOptions,
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: generateId,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      if (!responseMessage.id) throw new Error("Resposta sem identificador; conversa não salva.");
      const { error } = await ctx.supabase.from("chat_messages").upsert({
        user_id: ctx.user.id, sdk_id: responseMessage.id, role: "assistant", parts: responseMessage.parts as Json,
        created_at: assistantTimestamp(persistedUser.created_at), reply_to_sdk_id: lastUser.id,
      }, { onConflict: "user_id,sdk_id" });
      if (error) { console.error("Falha ao salvar resposta", error); throw new Error("Não foi possível salvar a resposta. Não repita movimentações sem conferir seu saldo."); }
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}

export async function handleDiagnostico(request: Request) {
  const ctx = await authenticate(request);
  if (!ctx) return json(401, { error: "Não autorizado" });

  const snapshot = await loadSnapshot(ctx);
  if (snapshot.txs.length === 0) return json(200, { skipped: true });
  const w = weeklyComparison(snapshot.txs);
  const fmtCats = (c: { categoria: string; total: number }[]) =>
    c.map((x) => `${x.categoria} ${formatBRL(x.total)}`).join("; ") || "nenhum";

  const { model, runIdFetch } = gateway(request);
  const result = streamText({
    model,
    instructions: `${ORCA_PERSONA}\nVocê vai escrever o Diagnóstico Financeiro Semanal. Responda EXATAMENTE neste formato:
TÍTULO: <título curto, até 8 palavras>
<texto de 3 a 5 frases cobrindo: evolução dos gastos, comparação com a semana anterior (use porcentagens), principais categorias, uma oportunidade de economia concreta, e progresso das metas. Se houver orçamento mensal, projete se vai ultrapassar.>`,
    messages: [
      {
        role: "user",
        content: `Hoje: ${today()}
Despesas últimos 7 dias: ${formatBRL(w.esta.total)} (${fmtCats(w.esta.categorias)})
Despesas 7 dias anteriores: ${formatBRL(w.anterior.total)} (${fmtCats(w.anterior.categorias)})
${snapshotText(snapshot)}`,
      },
    ],
    abortSignal: request.signal,
    providerOptions,
  });

  let text: string;
  try {
    text = (await result.text).trim();
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 500;
    return json(status, { error: status === 402 ? "Créditos de IA esgotados." : "Não foi possível gerar o diagnóstico agora." });
  }
  const match = text.match(/^T[ÍI]TULO:\s*(.+)\n+([\s\S]+)$/i);
  const titulo = match?.[1]?.trim() || "Seu diagnóstico da semana";
  const descricao = (match?.[2] ?? text).trim();
  const { data, error } = await ctx.supabase
    .from("insights")
    .insert({ user_id: ctx.user.id, titulo, descricao })
    .select("id,titulo,descricao,created_at")
    .single();
  if (error) return json(500, { error: error.message });
  return withLovableAiGatewayRunIdHeader(json(200, { insight: data }), runIdFetch);
}
