import { WEEK_DAYS } from "@/constants/routine"
import type {
  MentorMessage,
  MentorRoutineProposal,
  MentorRoutineProposalBlock,
} from "@/features/mentor/types"
import type { Routine, RoutineBlock, RoutineDay, Weekday } from "@/types/study"

import {
  WEEKDAY_LABELS,
  formatTime,
  normalizeMentorRoutineProposal,
  timeToMinutes,
} from "@/features/mentor/utils/mentor-routine-proposal-validation"

export {
  formatTime,
  normalizeMentorAction,
  normalizeMentorRoutineProposal,
  timeToMinutes,
} from "@/features/mentor/utils/mentor-routine-proposal-validation"
function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const ROUTINE_CONFIRMATION_SIGNALS = [
  "sim",
  "sim por favor",
  "por favor",
  "claro",
  "pode",
  "pode sim",
  "pode continuar",
  "continue",
  "faca",
  "pode fazer",
  "crie",
  "entao crie",
  "pode criar",
  "pode aplicar",
  "pode montar",
  "crie a rotina",
  "aplique a rotina",
  "monte a rotina",
  "esta bom pode criar",
  "aprovado",
  "confirmo",
  "eu falei que sim",
  "eu disse que sim",
]

export function isRoutineConfirmationMessage(message: string): boolean {
  const normalized = normalizeComparableText(message)
  if (!normalized) return false

  const adjustmentSignals = [
    "nao",
    "mas",
    "altere",
    "ajuste",
    "mude",
    "troque",
    "corrija",
  ]
  if (
    adjustmentSignals.some((signal) =>
      new RegExp(`(^| )${signal}( |$)`).test(normalized),
    )
  ) {
    return false
  }

  return ROUTINE_CONFIRMATION_SIGNALS.some(
    (signal) =>
      normalized === signal ||
      normalized.startsWith(`${signal} `) ||
      normalized.endsWith(` ${signal}`),
  )
}

export function isRoutineCreationRequest(message: string): boolean {
  const normalized = normalizeComparableText(message)
  if (!normalized) return false

  const routineSignals = [
    "rotina",
    "cronograma",
    "agenda de estudos",
    "planejamento semanal",
  ]
  const creationSignals = [
    "crie",
    "criar",
    "monte",
    "montar",
    "gere",
    "gerar",
    "organize",
    "organizar",
    "planeje",
    "planejar",
    "elabore",
    "distribua",
  ]

  return (
    routineSignals.some((signal) => normalized.includes(signal)) &&
    creationSignals.some((signal) =>
      new RegExp(`(^| )${signal}( |$)`).test(normalized),
    )
  )
}

export function isRoutineAdjustmentRequest(message: string): boolean {
  const normalized = normalizeComparableText(message)
  if (!normalized) return false

  const adjustmentSignals = [
    "altere",
    "alterar",
    "ajuste",
    "ajustar",
    "mude",
    "mudar",
    "troque",
    "trocar",
    "aumente",
    "aumentar",
    "diminua",
    "diminuir",
    "reduza",
    "reduzir",
    "adicione",
    "adicionar",
    "inclua",
    "incluir",
    "remova",
    "remover",
    "substitua",
    "substituir",
    "recalcule",
    "recalcular",
  ]
  const routineDetailSignals = [
    "bloco",
    "blocos",
    "duracao",
    "minuto",
    "minutos",
    "horario",
    "horarios",
    "pausa",
    "pausas",
    "almoco",
    "materia",
    "materias",
    "dia",
    "dias",
    "rotina",
    "proposta",
  ]

  return (
    adjustmentSignals.some((signal) =>
      new RegExp(`(^| )${signal}( |$)`).test(normalized),
    ) && routineDetailSignals.some((signal) => normalized.includes(signal))
  )
}

interface ExactRoutineScheduleSlot {
  type: MentorRoutineProposalBlock["type"]
  startTime: string
  durationMinutes: number
}

function inferExactScheduleSlotType(
  label: string,
  durationMinutes: number,
): MentorRoutineProposalBlock["type"] | null {
  const normalized = normalizeComparableText(label)

  if (normalized.includes("almoco")) return "lunch"
  if (normalized.includes("projeto")) return "project"
  if (normalized.includes("estudo")) return "study"

  if (normalized.includes("pausa")) {
    if (normalized.includes("curta")) return "short-break"
    if (normalized.includes("longa")) return "long-break"
    return durationMinutes <= 5 ? "short-break" : "long-break"
  }

  return null
}

function parseExactRoutineSchedule(
  message: string,
): ExactRoutineScheduleSlot[] | null {
  const linePattern =
    /^\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s*[—–-]\s*(.+?)\s*$/gm
  const slots: ExactRoutineScheduleSlot[] = []
  let previousEndMinutes: number | null = null

  for (const match of message.matchAll(linePattern)) {
    const startParts = match[1].split(":").map(Number)
    const endParts = match[2].split(":").map(Number)
    const startMinutes = startParts[0] * 60 + startParts[1]
    const endMinutes = endParts[0] * 60 + endParts[1]

    if (
      startParts[0] > 23 ||
      endParts[0] > 23 ||
      startParts[1] > 59 ||
      endParts[1] > 59 ||
      endMinutes <= startMinutes ||
      (previousEndMinutes !== null && startMinutes !== previousEndMinutes)
    ) {
      return null
    }

    const durationMinutes = endMinutes - startMinutes
    const type = inferExactScheduleSlotType(match[3], durationMinutes)
    if (!type) return null

    slots.push({
      type,
      startTime: formatTime(startMinutes),
      durationMinutes,
    })
    previousEndMinutes = endMinutes
  }

  return slots.length >= 2 ? slots : null
}

function takeCompatibleBlock(
  blocks: MentorRoutineProposalBlock[],
  usedIndexes: Set<number>,
  requestedType: MentorRoutineProposalBlock["type"],
): MentorRoutineProposalBlock | null {
  const compatibleTypes =
    requestedType === "short-break" || requestedType === "long-break"
      ? new Set(["short-break", "long-break"])
      : new Set([requestedType])

  const index = blocks.findIndex(
    (block, blockIndex) =>
      !usedIndexes.has(blockIndex) && compatibleTypes.has(block.type),
  )
  if (index < 0) return null

  usedIndexes.add(index)
  return blocks[index]
}

export function applyExactRoutineScheduleAdjustment(
  message: string,
  proposal: MentorRoutineProposal,
): MentorRoutineProposal | null {
  const slots = parseExactRoutineSchedule(message)
  if (!slots) return null

  const availabilityStartTime = slots[0].startTime
  const lastSlot = slots[slots.length - 1]
  const lastStartMinutes = timeToMinutes(lastSlot.startTime)
  if (lastStartMinutes === null) return null
  const availabilityEndTime = formatTime(
    lastStartMinutes + lastSlot.durationMinutes,
  )

  const adjustedSchedules = proposal.schedules.map((schedule) => {
    const usedIndexes = new Set<number>()
    const blocks = slots.map((slot) => {
      const currentBlock = takeCompatibleBlock(
        schedule.blocks,
        usedIndexes,
        slot.type,
      )
      if (!currentBlock) return null

      return {
        ...currentBlock,
        type: slot.type,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
      }
    })

    if (
      blocks.some((block) => block === null) ||
      usedIndexes.size !== schedule.blocks.length
    ) {
      return null
    }

    return {
      ...schedule,
      availabilityStartTime,
      availabilityEndTime,
      blocks: blocks as MentorRoutineProposalBlock[],
    }
  })

  if (adjustedSchedules.some((schedule) => schedule === null)) return null

  return normalizeMentorRoutineProposal({
    ...proposal,
    method: "custom",
    pomodoro: undefined,
    schedules: adjustedSchedules,
  })
}

export function hasUnstructuredRoutineSuggestion(
  history: MentorMessage[],
): boolean {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index]
    if (message.role !== "assistant") continue
    if (message.action?.type === "preview-routine") return false

    const normalized = normalizeComparableText(message.content)
    const containsRoutine =
      normalized.includes("rotina") || normalized.includes("cronograma")
    const containsScheduleSignal =
      /\b\d{1,2}:\d{2}\b/.test(message.content) ||
      normalized.includes("segunda feira") ||
      normalized.includes("terca feira") ||
      normalized.includes("quarta feira") ||
      normalized.includes("quinta feira") ||
      normalized.includes("sexta feira")

    if (containsRoutine && containsScheduleSignal) return true
  }

  return false
}

export function isExplicitRoutineConfirmation(message: string): boolean {
  return isRoutineConfirmationMessage(message)
}

export function findLatestRoutinePreview(
  history: MentorMessage[],
): MentorRoutineProposal | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index]
    if (
      message.role !== "assistant" ||
      message.action?.type !== "preview-routine"
    )
      continue

    return normalizeMentorRoutineProposal(message.action.routine)
  }

  return null
}

function createRoutineBlock(
  proposalBlock: MentorRoutineProposalBlock,
  weekday: Weekday,
  index: number,
  draftId: string,
): RoutineBlock {
  const startMinutes = timeToMinutes(proposalBlock.startTime) ?? 0
  const endMinutes = startMinutes + proposalBlock.durationMinutes

  return {
    id: `${draftId}-${weekday}-${index + 1}`,
    type: proposalBlock.type,
    title: proposalBlock.title,
    description: proposalBlock.description,
    startTime: proposalBlock.startTime,
    endTime: formatTime(endMinutes),
    durationMinutes: proposalBlock.durationMinutes,
    order: index + 1,
  }
}

export function createRoutineFromMentorProposal(
  proposal: MentorRoutineProposal,
  currentRoutine: Routine,
): Routine {
  const normalizedProposal = normalizeMentorRoutineProposal(proposal)
  if (!normalizedProposal) return currentRoutine

  const now = new Date().toISOString()
  const draftId = `mentor-routine-${Date.now()}`
  const scheduleByWeekday = new Map<Weekday, MentorRoutineProposalBlock[]>()

  normalizedProposal.schedules.forEach((schedule) => {
    schedule.weekdays.forEach((weekday) => {
      scheduleByWeekday.set(weekday, schedule.blocks)
    })
  })

  const days: RoutineDay[] = WEEK_DAYS.map((day) => {
    const proposalBlocks = scheduleByWeekday.get(day.key) ?? []
    const blocks = proposalBlocks.map((block, index) =>
      createRoutineBlock(block, day.key, index, draftId),
    )

    return {
      id: `${draftId}-${day.key}`,
      weekday: day.key,
      blocks,
      isActive: blocks.length > 0,
    }
  })

  return {
    id: draftId,
    name: normalizedProposal.name,
    mode: currentRoutine.mode,
    days,
    weeks: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function getMentorRoutineProposalStats(
  proposal: MentorRoutineProposal,
): {
  dayCount: number
  blockCount: number
} {
  const normalizedProposal = normalizeMentorRoutineProposal(proposal)

  if (!normalizedProposal) {
    return { dayCount: 0, blockCount: 0 }
  }

  return normalizedProposal.schedules.reduce(
    (stats, schedule) => ({
      dayCount: stats.dayCount + schedule.weekdays.length,
      blockCount:
        stats.blockCount + schedule.blocks.length * schedule.weekdays.length,
    }),
    { dayCount: 0, blockCount: 0 },
  )
}

function formatScheduleDays(weekdays: Weekday[]): string {
  return weekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join(", ")
}

function formatProposalBlock(block: MentorRoutineProposalBlock): string {
  const startMinutes = timeToMinutes(block.startTime) ?? 0
  const endTime = formatTime(startMinutes + block.durationMinutes)
  return `- ${block.startTime}–${endTime} — ${block.title}`
}

export function formatMentorRoutineProposalPreview(
  proposal: MentorRoutineProposal,
): string {
  const normalized = normalizeMentorRoutineProposal(proposal)
  if (!normalized) {
    return "A proposta precisa de ajustes antes de ser criada. Revise comigo os dias, horários e durações."
  }

  const methodLine =
    normalized.method === "pomodoro" && normalized.pomodoro
      ? `Pomodoro de ${normalized.pomodoro.focusMinutes} minutos, pausa curta de ${normalized.pomodoro.shortBreakMinutes} minutos e pausa longa de ${normalized.pomodoro.longBreakMinutes} minutos após ${normalized.pomodoro.longBreakAfterFocusBlocks} blocos de foco.`
      : "Blocos personalizados conforme a sequência combinada."

  const schedules = normalized.schedules.flatMap((schedule) => [
    `**${formatScheduleDays(schedule.weekdays)} — ${schedule.availabilityStartTime} às ${schedule.availabilityEndTime}**`,
    ...schedule.blocks.map(formatProposalBlock),
    "",
  ])

  return [
    "Preparei uma proposta de rotina com os horários recalculados para respeitar sua disponibilidade.",
    "",
    `**Nome:** ${normalized.name}`,
    `**Método:** ${methodLine}`,
    `**Resumo:** ${normalized.summary}`,
    "",
    "**Estrutura da rotina:**",
    ...schedules,
    "A proposta está boa? Você pode pedir alterações ou responder **“Pode criar a rotina”** para abrir o rascunho em Montar rotina.",
  ]
    .join("\n")
    .trim()
}
