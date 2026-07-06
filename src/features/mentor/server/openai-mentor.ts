import type { MentorContext, MentorMessage } from "@/features/mentor/types"

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
const MAX_OUTPUT_TOKENS = 700

const MENTOR_SYSTEM_PROMPT = [
  "Você é o Mentor IA do RoutineOS, um mentor de estudos prático, direto e motivador.",
  "Use o contexto do aplicativo para ajudar o usuário a estudar melhor, ajustar sua rotina, sugerir projetos, explicar conceitos e orientar próximos passos.",
  "Não invente dados que não estejam no contexto. Quando não souber algo, pergunte ao usuário.",
  "Responda em português do Brasil. Seja claro, útil e evite respostas longas demais quando o usuário não pedir.",
].join(" ")

type OpenAIInputMessage = {
  role: "user" | "assistant"
  content: string
}

function stringifyContext(context: MentorContext): string {
  return JSON.stringify(context)
}

function extractOpenAIText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const response = payload as {
    output_text?: unknown
    output?: unknown
  }

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim()
  }

  if (!Array.isArray(response.output)) return null

  const textParts: string[] = []

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue

    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue

    for (const part of content) {
      if (!part || typeof part !== "object") continue

      const maybeText = (part as { text?: unknown }).text
      if (typeof maybeText === "string" && maybeText.trim().length > 0) {
        textParts.push(maybeText.trim())
      }
    }
  }

  return textParts.length > 0 ? textParts.join("\n\n") : null
}

export function createMockMentorReply(
  message: string,
  context: MentorContext,
  reason = "a API ainda não foi configurada",
): string {
  const blockCount = context.todayRoutine.blocks.length
  const studiedHours = Math.round((context.monthSummary.studiedMinutes / 60) * 10) / 10
  const remainingHours = Math.round((context.monthSummary.remainingMinutes / 60) * 10) / 10
  const nextBlock = context.todayRoutine.blocks[0]

  const routineLine =
    blockCount > 0
      ? `Hoje você tem ${blockCount} bloco${blockCount === 1 ? "" : "s"} planejado${blockCount === 1 ? "" : "s"}${nextBlock ? `, começando por "${nextBlock.title}" às ${nextBlock.startTime}` : ""}.`
      : "Hoje não encontrei blocos planejados na sua rotina."

  return [
    "Estou em modo local no momento. Ainda assim, posso te ajudar usando as informações salvas no RoutineOS.",
    routineLine,
    `Pelo histórico do mês, você estudou cerca de ${studiedHours}h e ainda tem ${remainingHours}h restantes para a meta mensal.`,
    `Sobre "${message.slice(0, 120)}": escolha o próximo passo mais importante, trabalhe nele por um bloco curto e registre o progresso no RoutineOS.`,
  ].join(" ")
}

export async function createOpenAIMentorReply({
  apiKey,
  model,
  message,
  history,
  context,
}: {
  apiKey: string
  model: string
  message: string
  history: MentorMessage[]
  context: MentorContext
}): Promise<string> {
  const input: OpenAIInputMessage[] = [
    {
      role: "user",
      content: `Contexto resumido do RoutineOS em JSON:\n${stringifyContext(context)}`,
    },
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: message,
    },
  ]

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: MENTOR_SYSTEM_PROMPT,
      input,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  })

  if (!response.ok) {
    throw new Error("A OpenAI não retornou uma resposta válida.")
  }

  const payload = (await response.json()) as unknown
  const reply = extractOpenAIText(payload)

  if (!reply) {
    throw new Error("A resposta da OpenAI veio vazia.")
  }

  return reply
}
