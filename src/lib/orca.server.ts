import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, isStepCount, streamText, tool, type ModelMessage, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
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
  const [{ data: txs }, { data: goals }, { data: profile }] = await Promise.all([
    ctx.supabase.from("transactions").select("id,tipo,valor,categoria,descricao,data").order("data", { ascending: false }).limit(500),
    ctx.supabase.from("goals").select("id,titulo,valor_objetivo,valor_atual,prazo"),
    ctx.supabase.from("profiles").select("nome,orcamento_mensal").eq("id", ctx.user.id).maybeSingle(),
  ]);
  const list: Tx[] = (txs ?? []).map((t) => ({ ...t, valor: Number(t.valor) }));
  return { txs: list, goals: goals ?? [], profile };
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
${recent || "nenhuma"}`;
}

function buildTools(ctx: Ctx) {
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
            valor_atual: input.valor_atual ?? 0,
            prazo: input.prazo || null,
          })
          .select()
          .single();
        if (error) return { ok: false, erro: error.message };
        return { ok: true, meta: data };
      },
    }),
    contribuir_meta: tool({
      description: "Adiciona um valor guardado a uma meta existente. Use o id da meta do contexto.",
      inputSchema: z.object({ meta_id: z.string(), valor: z.number().positive() }),
      execute: async ({ meta_id, valor }) => {
        const { data: g, error: e1 } = await ctx.supabase.from("goals").select("*").eq("id", meta_id).maybeSingle();
        if (e1 || !g) return { ok: false, erro: "Meta não encontrada" };
        const novo = Number(g.valor_atual) + valor;
        const { data, error } = await ctx.supabase.from("goals").update({ valor_atual: novo }).eq("id", meta_id).select().single();
        if (error) return { ok: false, erro: error.message };
        return { ok: true, meta: data };
      },
    }),
  };
}

const ORCA_PERSONA = `Você é o Orça, o agente financeiro do FINOVO. Fale em português do Brasil, com linguagem simples, amigável e educativa, para pessoas iniciantes em finanças.
- Quando o usuário relatar uma movimentação ("Gastei R$ 45 no almoço", "Recebi R$ 2.500 de salário"), chame registrar_transacao com a categoria correta entre: ${CATEGORIAS.join(", ")}. Depois confirme em uma frase curta (valor, categoria) e, se fizer sentido, dê uma dica rápida.
- Se a mensagem tiver várias movimentações, registre cada uma.
- Se faltar o valor, pergunte antes de registrar.
- Quando o usuário quiser criar um objetivo, use criar_meta. Para guardar dinheiro numa meta, use contribuir_meta.
- Para recomendações, use os dados do contexto: aponte gastos excessivos, sugira economias concretas e ajude a atingir metas. Explique termos financeiros quando usar.
- Respostas curtas (até ~120 palavras), com no máximo uma lista.`;

export async function handleChat(request: Request) {
  const ctx = await authenticate(request);
  if (!ctx) return json(401, { error: "Faça login para conversar com o Orça." });

  const body = (await request.json().catch(() => null)) as { messages?: UIMessage[] } | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return json(400, { error: "Mensagem inválida" });

  const snapshot = await loadSnapshot(ctx);
  const { model, runIdFetch } = gateway(request);
  const modelMessages: ModelMessage[] = await convertToModelMessages(messages.slice(-30));
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const result = streamText({
    model,
    instructions: `${ORCA_PERSONA}\n\nHoje é ${today()}. Nome do usuário: ${snapshot.profile?.nome || "não informado"}.\n\nDados financeiros atuais:\n${snapshotText(snapshot)}`,
    messages: modelMessages,
    tools: buildTools(ctx),
    stopWhen: isStepCount(5),
    abortSignal: request.signal,
    providerOptions,
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      const rows = [lastUser, responseMessage]
        .filter((m): m is UIMessage => !!m)
        .map((m) => ({ user_id: ctx.user.id, sdk_id: m.id, role: m.role, parts: m.parts as never }));
      const { error } = await ctx.supabase.from("chat_messages").upsert(rows, { onConflict: "user_id,sdk_id" });
      if (error) console.error("Falha ao salvar mensagens", error);
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
