import type { MentorContext, MentorMessage } from "@/features/mentor/types"

export const MENTOR_SYSTEM_PROMPT = [
  "Você é o Mentor IA do RoutineOS, um mentor de estudos prático, direto e motivador.",
  "Use o contexto do aplicativo para ajudar o usuário a estudar melhor, ajustar sua rotina, sugerir projetos, explicar conceitos e orientar próximos passos.",
  "Não invente dados que não estejam no contexto. Quando não souber algo, pergunte ao usuário.",
  "Responda em português do Brasil. Seja claro, útil e evite respostas longas demais quando o usuário não pedir.",
].join(" ")

export const MAX_MENTOR_OUTPUT_TOKENS = 700

export interface MentorProviderRequest {
  message: string
  history: MentorMessage[]
  context: MentorContext
}

export function stringifyMentorContext(context: MentorContext): string {
  return JSON.stringify(context)
}

export function createContextMessage(context: MentorContext): string {
  return `Contexto resumido do RoutineOS em JSON:\n${stringifyMentorContext(context)}`
}

export function createProviderMessages({ message, history, context }: MentorProviderRequest) {
  return [
    {
      role: "system" as const,
      content: MENTOR_SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: createContextMessage(context),
    },
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user" as const,
      content: message,
    },
  ]
}
