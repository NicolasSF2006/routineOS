import type { MentorContext } from "@/features/mentor/types"
export {
  createOpenAIMentorReply,
  DEFAULT_OPENAI_MODEL,
} from "@/features/mentor/server/providers/openai-provider"

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function isCapabilitiesQuestion(message: string): boolean {
  const normalized = normalizeText(message)
  return (
    normalized.includes("o que voce pode fazer") ||
    normalized.includes("como voce pode me ajudar") ||
    normalized.includes("voce consegue") ||
    normalized.includes("suas funcoes") ||
    normalized.includes("trilha")
  )
}

export function createMockMentorReply(
  message: string,
  context: MentorContext,
): string {
  if (isCapabilitiesQuestion(message)) {
    return [
      "Estou em modo local no momento, mas ainda consigo ajudar usando as informações salvas no RoutineOS.",
      "Posso analisar sua rotina, comentar seu progresso, sugerir próximos passos, tirar dúvidas de estudo e indicar práticas para seus blocos.",
      "Também posso orientar a criação de trilhas: a área Trilhas transforma sua rotina em um caminho de estudos com recursos gratuitos, documentações, canais e projetos práticos.",
      "Para gerar e salvar uma trilha, abra a tela Trilhas no menu principal.",
    ].join(" ")
  }

  const blockCount = context.todayRoutine.blocks.length
  const studiedHours =
    Math.round((context.monthSummary.studiedMinutes / 60) * 10) / 10
  const remainingHours =
    Math.round((context.monthSummary.remainingMinutes / 60) * 10) / 10
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
