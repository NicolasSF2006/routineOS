import type {
  MentorAction,
  MentorRoutinePomodoroSettings,
  MentorRoutineProposal,
  MentorRoutineProposalBlock,
  MentorRoutineProposalSchedule,
  MentorStudyTrailPlan,
  MentorStudyTrailTopicPlan,
} from "@/features/mentor/types"
import type { RoutineBlockType, Weekday } from "@/types/study"

const WEEKDAY_KEYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

const ROUTINE_BLOCK_TYPES: RoutineBlockType[] = [
  "study",
  "short-break",
  "long-break",
  "lunch",
  "project",
  "other",
]

const DEFAULT_POMODORO_SETTINGS: MentorRoutinePomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfterFocusBlocks: 2,
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
}

export const BLOCK_TYPE_LABELS: Record<RoutineBlockType, string> = {
  study: "Estudo",
  "short-break": "Pausa curta",
  "long-break": "Pausa longa",
  lunch: "Almoço",
  project: "Projeto",
  other: "Outro",
}

const MAX_SCHEDULES = 7
const MAX_BLOCKS_PER_SCHEDULE = 32
const MAX_TOTAL_BLOCKS = 120
const MAX_BLOCK_DURATION_MINUTES = 360
const MIN_FOCUS_BLOCK_MINUTES = 10
const MAX_POMODORO_FOCUS_MINUTES = 120
const MAX_BREAK_MINUTES = 60

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRequiredText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null

  const normalized = value.trim().slice(0, maxLength)
  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  const normalized = normalizeRequiredText(value, maxLength)
  return normalized ?? undefined
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.floor(value)))
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && WEEKDAY_KEYS.includes(value as Weekday)
}

function isRoutineBlockType(value: unknown): value is RoutineBlockType {
  return (
    typeof value === "string" &&
    ROUTINE_BLOCK_TYPES.includes(value as RoutineBlockType)
  )
}

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

export function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function normalizePomodoroSettings(
  raw: unknown,
): MentorRoutinePomodoroSettings {
  const value = isObject(raw) ? raw : {}

  return {
    focusMinutes: normalizeInteger(
      value.focusMinutes,
      DEFAULT_POMODORO_SETTINGS.focusMinutes,
      MIN_FOCUS_BLOCK_MINUTES,
      MAX_POMODORO_FOCUS_MINUTES,
    ),
    shortBreakMinutes: normalizeInteger(
      value.shortBreakMinutes,
      DEFAULT_POMODORO_SETTINGS.shortBreakMinutes,
      1,
      MAX_BREAK_MINUTES,
    ),
    longBreakMinutes: normalizeInteger(
      value.longBreakMinutes,
      DEFAULT_POMODORO_SETTINGS.longBreakMinutes,
      1,
      MAX_BREAK_MINUTES,
    ),
    longBreakAfterFocusBlocks: normalizeInteger(
      value.longBreakAfterFocusBlocks,
      DEFAULT_POMODORO_SETTINGS.longBreakAfterFocusBlocks,
      2,
      8,
    ),
  }
}

function createSpecificTitle(
  type: RoutineBlockType,
  rawTitle: unknown,
  routineName: string,
): string {
  const title = normalizeRequiredText(rawTitle, 120)
  const normalizedTitle = title
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  if (type === "short-break") return "Pausa curta"
  if (type === "long-break") return "Pausa longa"
  if (type === "lunch") return title ?? "Almoço"
  if (type === "other") return title ?? "Atividade complementar"

  const genericTitles = new Set([
    "estudo",
    "bloco de estudo",
    "tarefa",
    "pomodoro",
    "sessao de estudo",
    "projeto",
    "projeto pratico",
    "bloco de projeto",
  ])

  if (title && normalizedTitle && !genericTitles.has(normalizedTitle))
    return title

  return type === "project"
    ? `Projeto prático: ${routineName}`
    : `Estudo: ${routineName}`
}

interface NormalizedRawBlock {
  type: RoutineBlockType
  title: string
  description?: string
  requestedDurationMinutes: number
  rawStartTime: string | null
}

function normalizeRawBlock(
  raw: unknown,
  routineName: string,
  method: MentorRoutineProposal["method"],
): NormalizedRawBlock | null {
  if (!isObject(raw) || !isRoutineBlockType(raw.type)) return null

  if (
    method === "custom" &&
    (typeof raw.durationMinutes !== "number" ||
      !Number.isFinite(raw.durationMinutes) ||
      !Number.isInteger(raw.durationMinutes))
  ) {
    return null
  }

  const requestedDurationMinutes = normalizeInteger(
    raw.durationMinutes,
    raw.type === "study" || raw.type === "project" ? 25 : 5,
    1,
    MAX_BLOCK_DURATION_MINUTES,
  )
  const rawStartTime = normalizeRequiredText(raw.startTime, 5)

  return {
    type: raw.type,
    title: createSpecificTitle(raw.type, raw.title, routineName),
    description: normalizeOptionalText(raw.description, 500),
    requestedDurationMinutes,
    rawStartTime:
      rawStartTime && timeToMinutes(rawStartTime) !== null
        ? rawStartTime
        : null,
  }
}

function inferScheduleWindow(
  raw: Record<string, unknown>,
  blocks: NormalizedRawBlock[],
): { startMinutes: number; endMinutes: number } | null {
  const explicitStart = normalizeRequiredText(raw.availabilityStartTime, 5)
  const explicitEnd = normalizeRequiredText(raw.availabilityEndTime, 5)
  const explicitStartMinutes = explicitStart
    ? timeToMinutes(explicitStart)
    : null
  const explicitEndMinutes = explicitEnd ? timeToMinutes(explicitEnd) : null

  if (
    explicitStartMinutes !== null &&
    explicitEndMinutes !== null &&
    explicitEndMinutes > explicitStartMinutes
  ) {
    return {
      startMinutes: explicitStartMinutes,
      endMinutes: explicitEndMinutes,
    }
  }

  const timedBlocks = blocks
    .map((block) => {
      const startMinutes = block.rawStartTime
        ? timeToMinutes(block.rawStartTime)
        : null
      if (startMinutes === null) return null
      return {
        startMinutes,
        endMinutes: startMinutes + block.requestedDurationMinutes,
      }
    })
    .filter(
      (block): block is { startMinutes: number; endMinutes: number } =>
        block !== null,
    )

  if (timedBlocks.length === 0) return null

  return {
    startMinutes: Math.min(...timedBlocks.map((block) => block.startMinutes)),
    endMinutes: Math.max(...timedBlocks.map((block) => block.endMinutes)),
  }
}

function getPomodoroFocusCapacity(
  windowMinutes: number,
  settings: MentorRoutinePomodoroSettings,
): number {
  let elapsedMinutes = 0
  let focusCount = 0

  while (focusCount < MAX_BLOCKS_PER_SCHEDULE) {
    const remainingMinutes = windowMinutes - elapsedMinutes
    if (remainingMinutes < MIN_FOCUS_BLOCK_MINUTES) break

    const focusDuration = Math.min(settings.focusMinutes, remainingMinutes)
    elapsedMinutes += focusDuration
    focusCount += 1

    const breakDuration =
      focusCount % settings.longBreakAfterFocusBlocks === 0
        ? settings.longBreakMinutes
        : settings.shortBreakMinutes

    if (
      windowMinutes - elapsedMinutes - breakDuration <
      MIN_FOCUS_BLOCK_MINUTES
    )
      break
    elapsedMinutes += breakDuration
  }

  return focusCount
}

function selectPomodoroFocusBlocks(
  blocks: NormalizedRawBlock[],
  capacity: number,
): NormalizedRawBlock[] {
  const focusBlocks = blocks.filter(
    (block) => block.type === "study" || block.type === "project",
  )

  if (focusBlocks.length <= capacity) return focusBlocks
  if (capacity <= 0) return []

  const finalProject = [...focusBlocks]
    .reverse()
    .find((block) => block.type === "project")
  if (!finalProject || capacity === 1) return focusBlocks.slice(0, capacity)

  const selected = focusBlocks
    .filter((block) => block !== finalProject)
    .slice(0, capacity - 1)
  return [...selected, finalProject]
}

function createProposalBlock(
  block: NormalizedRawBlock,
  startMinutes: number,
  durationMinutes: number,
): MentorRoutineProposalBlock {
  return {
    type: block.type,
    title: block.title,
    description: block.description,
    startTime: formatTime(startMinutes),
    durationMinutes,
  }
}

function createBreakBlock(
  type: "short-break" | "long-break",
  startMinutes: number,
  durationMinutes: number,
): MentorRoutineProposalBlock {
  return {
    type,
    title: BLOCK_TYPE_LABELS[type],
    startTime: formatTime(startMinutes),
    durationMinutes,
  }
}

function buildPomodoroBlocks(
  rawBlocks: NormalizedRawBlock[],
  startMinutes: number,
  endMinutes: number,
  settings: MentorRoutinePomodoroSettings,
): MentorRoutineProposalBlock[] {
  const capacity = getPomodoroFocusCapacity(endMinutes - startMinutes, settings)
  const focusBlocks = selectPomodoroFocusBlocks(rawBlocks, capacity)
  const blocks: MentorRoutineProposalBlock[] = []
  let cursor = startMinutes

  focusBlocks.forEach((focusBlock, index) => {
    const remainingMinutes = endMinutes - cursor
    if (remainingMinutes < MIN_FOCUS_BLOCK_MINUTES) return

    const focusDuration = Math.min(settings.focusMinutes, remainingMinutes)
    blocks.push(createProposalBlock(focusBlock, cursor, focusDuration))
    cursor += focusDuration

    const hasNextFocusBlock = index < focusBlocks.length - 1
    if (!hasNextFocusBlock) return

    const completedFocusBlocks = index + 1
    const breakType =
      completedFocusBlocks % settings.longBreakAfterFocusBlocks === 0
        ? "long-break"
        : "short-break"
    const breakDuration =
      breakType === "long-break"
        ? settings.longBreakMinutes
        : settings.shortBreakMinutes

    if (endMinutes - cursor - breakDuration < MIN_FOCUS_BLOCK_MINUTES) return

    blocks.push(createBreakBlock(breakType, cursor, breakDuration))
    cursor += breakDuration
  })

  return blocks
}

function buildCustomBlocks(
  rawBlocks: NormalizedRawBlock[],
  startMinutes: number,
  endMinutes: number,
): MentorRoutineProposalBlock[] {
  const blocks: MentorRoutineProposalBlock[] = []
  let cursor = startMinutes

  for (const rawBlock of rawBlocks) {
    const remainingMinutes = endMinutes - cursor
    if (remainingMinutes <= 0) break

    const durationMinutes = Math.min(
      rawBlock.requestedDurationMinutes,
      remainingMinutes,
    )
    const isFocusBlock =
      rawBlock.type === "study" || rawBlock.type === "project"

    if (durationMinutes < rawBlock.requestedDurationMinutes && !isFocusBlock)
      break
    if (isFocusBlock && durationMinutes < MIN_FOCUS_BLOCK_MINUTES) break

    blocks.push(createProposalBlock(rawBlock, cursor, durationMinutes))
    cursor += durationMinutes
  }

  while (
    blocks.length > 0 &&
    ["short-break", "long-break", "lunch"].includes(
      blocks[blocks.length - 1].type,
    )
  ) {
    blocks.pop()
  }

  return blocks
}

function normalizeSchedule(
  raw: unknown,
  usedWeekdays: Set<Weekday>,
  routineName: string,
  method: MentorRoutineProposal["method"],
  pomodoro: MentorRoutinePomodoroSettings | undefined,
): MentorRoutineProposalSchedule | null {
  if (!isObject(raw)) return null
  if (!Array.isArray(raw.weekdays) || !Array.isArray(raw.blocks)) return null

  const weekdays = Array.from(new Set(raw.weekdays.filter(isWeekday)))
  if (
    weekdays.length === 0 ||
    weekdays.some((weekday) => usedWeekdays.has(weekday))
  )
    return null

  const normalizedRawBlocks = raw.blocks
    .slice(0, MAX_BLOCKS_PER_SCHEDULE)
    .map((block) => normalizeRawBlock(block, routineName, method))

  if (normalizedRawBlocks.some((block) => block === null)) return null

  const rawBlocks = normalizedRawBlocks as NormalizedRawBlock[]

  if (rawBlocks.length === 0) return null

  const window = inferScheduleWindow(raw, rawBlocks)
  if (
    !window ||
    window.endMinutes > 24 * 60 ||
    window.endMinutes <= window.startMinutes
  ) {
    return null
  }

  const blocks =
    method === "pomodoro" && pomodoro
      ? buildPomodoroBlocks(
          rawBlocks,
          window.startMinutes,
          window.endMinutes,
          pomodoro,
        )
      : buildCustomBlocks(rawBlocks, window.startMinutes, window.endMinutes)

  if (blocks.length === 0) return null

  const lastBlock = blocks[blocks.length - 1]
  const lastBlockStart = timeToMinutes(lastBlock.startTime)
  if (
    lastBlockStart === null ||
    lastBlockStart + lastBlock.durationMinutes > window.endMinutes
  ) {
    return null
  }

  weekdays.forEach((weekday) => usedWeekdays.add(weekday))

  return {
    weekdays,
    availabilityStartTime: formatTime(window.startMinutes),
    availabilityEndTime: formatTime(window.endMinutes),
    blocks,
  }
}

export function normalizeMentorRoutineProposal(
  raw: unknown,
): MentorRoutineProposal | null {
  if (!isObject(raw)) return null

  const name = normalizeRequiredText(raw.name, 80)
  const summary = normalizeRequiredText(raw.summary, 600)
  const method =
    raw.method === "pomodoro" || raw.method === "custom" ? raw.method : null

  if (!name || !summary || !method || !Array.isArray(raw.schedules)) return null

  const pomodoro =
    method === "pomodoro" ? normalizePomodoroSettings(raw.pomodoro) : undefined
  const usedWeekdays = new Set<Weekday>()
  const schedules = raw.schedules
    .slice(0, MAX_SCHEDULES)
    .map((schedule) =>
      normalizeSchedule(schedule, usedWeekdays, name, method, pomodoro),
    )

  if (schedules.some((schedule) => schedule === null)) return null

  const normalizedSchedules = schedules as MentorRoutineProposalSchedule[]
  const totalBlocks = normalizedSchedules.reduce(
    (total, schedule) =>
      total + schedule.blocks.length * schedule.weekdays.length,
    0,
  )

  if (normalizedSchedules.length === 0 || totalBlocks > MAX_TOTAL_BLOCKS)
    return null

  return {
    name,
    method,
    summary,
    pomodoro,
    schedules: normalizedSchedules,
  }
}

function normalizeStringList(
  raw: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(raw)) return []

  return Array.from(
    new Set(
      raw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean),
    ),
  ).slice(0, maxItems)
}

function normalizeStudyTrailTopicPlan(
  raw: unknown,
): MentorStudyTrailTopicPlan | null {
  if (!isObject(raw)) return null

  const topicId = normalizeRequiredText(raw.topicId, 120)
  const description = normalizeRequiredText(raw.description, 700)
  const projectSuggestion = normalizeRequiredText(raw.projectSuggestion, 500)
  const steps = normalizeStringList(raw.steps, 6, 320)

  if (!topicId || !description || !projectSuggestion || steps.length < 2)
    return null

  return {
    topicId,
    description,
    steps,
    projectSuggestion,
    resourceIds: normalizeStringList(raw.resourceIds, 8, 120),
    videoResourceIds: normalizeStringList(raw.videoResourceIds, 8, 120),
  }
}

function normalizeStudyTrailPlan(raw: unknown): MentorStudyTrailPlan | null {
  if (!isObject(raw) || !Array.isArray(raw.topics)) return null

  const summary = normalizeRequiredText(raw.summary, 900)
  if (!summary) return null

  const topics = raw.topics
    .slice(0, 60)
    .map(normalizeStudyTrailTopicPlan)
    .filter((topic): topic is MentorStudyTrailTopicPlan => topic !== null)

  if (topics.length === 0) return null

  return {
    title: normalizeOptionalText(raw.title, 120),
    summary,
    mentorNotes: normalizeOptionalText(raw.mentorNotes, 1_500),
    topics,
  }
}

export function normalizeMentorAction(raw: unknown): MentorAction | null {
  if (!isObject(raw)) return null

  if (raw.type === "propose-study-trail") {
    const trail = normalizeStudyTrailPlan(raw.trail)
    if (!trail) return null

    return {
      type: "propose-study-trail",
      trail,
    }
  }

  if (raw.type !== "preview-routine" && raw.type !== "propose-routine")
    return null

  const routine = normalizeMentorRoutineProposal(raw.routine)
  if (!routine) return null

  return {
    type: raw.type,
    routine,
  }
}
