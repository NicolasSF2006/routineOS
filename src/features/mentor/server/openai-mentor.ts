import type { MentorContext } from "@/features/mentor/types"
export {
  createOpenAIMentorReply,
  DEFAULT_OPENAI_MODEL,
} from "@/features/mentor/server/providers/openai-provider"

export function createMockMentorReply(message: string, context: MentorContext): string {
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
