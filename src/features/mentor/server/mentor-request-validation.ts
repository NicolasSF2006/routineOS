import { normalizeMentorAction } from "@/features/mentor/utils/mentor-routine-proposal"
import type {
  MentorContext,
  MentorContextBlock,
  MentorContextDayRoutine,
  MentorContextMonthRecord,
  MentorContextMonthTopic,
  MentorContextTrailResourceSignal,
  MentorContextTrailTopicSignal,
  MentorContextTrailUserCourseSignal,
  MentorMessage,
  StudyResourceType,
  StudyTopicMasteryStatus,
} from "@/features/mentor/types"
import type { ViewKey } from "@/types/navigation"
import type { RoutineBlockType, RoutineMode, Weekday } from "@/types/study"
import type { Theme } from "@/types/theme"

export const MAX_MENTOR_MESSAGE_LENGTH = 4_000
export const MAX_MENTOR_CONTEXT_LENGTH = 40_000

const MAX_CONTEXT_DEPTH = 10
const MAX_CONTEXT_NODES = 5_000
const MAX_STRING_LENGTH = 500
const MAX_URL_LENGTH = 2_048
const MAX_BLOCKS_PER_DAY = 24
const MAX_WEEK_DAYS = 7
const MAX_MONTH_RECORDS = 31
const MAX_MONTH_TOPICS = 100
const MAX_TRAIL_TOPICS = 30
const MAX_RESOURCE_SIGNALS = 100
const MAX_USER_COURSES = 50

const VIEWS: ViewKey[] = [
  "rotina",
  "calendario",
  "trilhas",
  "configuracoes",
  "configurar-rotina",
]
const ROUTINE_MODES: RoutineMode[] = ["no-work", "working", "vacation"]
const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]
const BLOCK_TYPES: RoutineBlockType[] = [
  "study",
  "short-break",
  "long-break",
  "lunch",
  "project",
  "other",
]
const RESOURCE_TYPES: StudyResourceType[] = [
  "documentacao",
  "curso",
  "video",
  "canal",
  "playlist",
  "plataforma",
  "roadmap",
  "pratica",
]
const MASTERY_STATUSES: StudyTopicMasteryStatus[] = [
  "starting",
  "studying",
  "understood",
  "review",
  "difficulty",
]

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function sanitizeMentorMessage(value: unknown): string | null {
  if (typeof value !== "string") return null
  const message = value.trim()
  if (!message) return null
  return message.slice(0, MAX_MENTOR_MESSAGE_LENGTH)
}

export function sanitizeMentorHistory(
  rawHistory: unknown,
  {
    maximumItems,
    maximumContentLength,
    includeActions = false,
  }: {
    maximumItems: number
    maximumContentLength: number
    includeActions?: boolean
  },
): MentorMessage[] {
  if (!Array.isArray(rawHistory)) return []

  return rawHistory
    .slice(-maximumItems)
    .map((message, index): MentorMessage | null => {
      if (!isObject(message)) return null
      if (message.role !== "user" && message.role !== "assistant") return null
      if (typeof message.content !== "string" || !message.content.trim())
        return null

      return {
        id:
          typeof message.id === "string" && message.id.trim()
            ? message.id
            : `history-${index + 1}`,
        role: message.role,
        content: message.content.trim().slice(0, maximumContentLength),
        createdAt:
          typeof message.createdAt === "string"
            ? message.createdAt
            : new Date(0).toISOString(),
        action: includeActions
          ? (normalizeMentorAction(message.action) ?? undefined)
          : undefined,
      }
    })
    .filter((message): message is MentorMessage => message !== null)
}

export function sanitizeMentorContext(
  rawContext: unknown,
): MentorContext | null {
  try {
    if (!hasSafeDepth(rawContext)) return null
    if (
      new TextEncoder().encode(JSON.stringify(rawContext)).byteLength >
      MAX_MENTOR_CONTEXT_LENGTH
    ) {
      return null
    }
  } catch {
    return null
  }

  if (!isObject(rawContext)) return null
  const currentView = enumValue(rawContext.currentView, VIEWS)
  const today = dateValue(rawContext.today)
  const activeRoutine = parseActiveRoutine(rawContext.activeRoutine)
  const todayRoutine = parseDayRoutine(rawContext.todayRoutine)
  const weekRoutine = arrayValue(
    rawContext.weekRoutine,
    MAX_WEEK_DAYS,
    parseDayRoutine,
  )
  const monthSummary = parseMonthSummary(rawContext.monthSummary)
  const monthHistory = arrayValue(
    rawContext.monthHistory,
    MAX_MONTH_RECORDS,
    parseMonthRecord,
  )
  const monthRoutine = parseMonthRoutine(rawContext.monthRoutine)
  const studyTrail = parseStudyTrail(rawContext.studyTrail)
  const settings = parseSettings(rawContext.settings)
  const theme =
    rawContext.theme === null
      ? null
      : enumValue(rawContext.theme, ["light", "dark"] satisfies Theme[])

  if (
    !currentView ||
    !today ||
    !activeRoutine ||
    !todayRoutine ||
    !weekRoutine ||
    !monthSummary ||
    !monthHistory ||
    !monthRoutine ||
    !studyTrail ||
    !settings ||
    (theme === null && rawContext.theme !== null) ||
    typeof rawContext.onboardingCompleted !== "boolean"
  ) {
    return null
  }

  return {
    currentView,
    today,
    activeRoutine,
    todayRoutine,
    weekRoutine,
    monthSummary,
    monthHistory,
    monthRoutine,
    studyTrail,
    settings,
    theme,
    onboardingCompleted: rawContext.onboardingCompleted,
  }
}

function hasSafeDepth(value: unknown): boolean {
  const ancestors = new WeakSet<object>()
  let nodes = 0

  function visit(current: unknown, depth: number): boolean {
    if (depth > MAX_CONTEXT_DEPTH) return false
    if (typeof current !== "object" || current === null) return true
    if (ancestors.has(current)) return false
    ancestors.add(current)
    nodes += 1
    if (nodes > MAX_CONTEXT_NODES) return false
    const valid = Object.values(current).every((child) =>
      visit(child, depth + 1),
    )
    ancestors.delete(current)
    return valid
  }

  return visit(value, 0)
}

function stringValue(
  value: unknown,
  maximum = MAX_STRING_LENGTH,
): string | null {
  return typeof value === "string" && value.length <= maximum ? value : null
}

function requiredString(
  value: unknown,
  maximum = MAX_STRING_LENGTH,
): string | null {
  const parsed = stringValue(value, maximum)
  return parsed !== null && parsed.trim() ? parsed.trim() : null
}

function enumValue<const T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null
}

function numberValue(
  value: unknown,
  { minimum = 0, maximum = 1_000_000, integer = true } = {},
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    return null
  }
  return value
}

function arrayValue<T>(
  value: unknown,
  maximumItems: number,
  parser: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value) || value.length > maximumItems) return null
  const parsed = value.map(parser)
  return parsed.some((item) => item === null) ? null : (parsed as T[])
}

function stringArray(value: unknown, maximumItems: number): string[] | null {
  return arrayValue(value, maximumItems, (item) => requiredString(item))
}

function dateValue(value: unknown): string | null {
  const parsed = stringValue(value, 10)
  if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return null
  const date = new Date(`${parsed}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(parsed)
    ? parsed
    : null
}

function nullableDateTime(value: unknown): string | null | undefined {
  if (value === null) return null
  const parsed = stringValue(value, 64)
  return parsed && !Number.isNaN(Date.parse(parsed)) ? parsed : undefined
}

function timeValue(value: unknown): string | null {
  const parsed = stringValue(value, 5)
  return parsed && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(parsed) ? parsed : null
}

function parseBlock(value: unknown): MentorContextBlock | null {
  if (!isObject(value)) return null
  const title = requiredString(value.title, 200)
  const type = enumValue(value.type, BLOCK_TYPES)
  const startTime = timeValue(value.startTime)
  const endTime = timeValue(value.endTime)
  const durationMinutes = numberValue(value.durationMinutes, {
    minimum: 1,
    maximum: 1_440,
  })
  return title && type && startTime && endTime && durationMinutes !== null
    ? { title, type, startTime, endTime, durationMinutes }
    : null
}

function parseDayRoutine(value: unknown): MentorContextDayRoutine | null {
  if (!isObject(value)) return null
  const dateKey = dateValue(value.dateKey)
  const weekday = enumValue(value.weekday, WEEKDAYS)
  const weekdayLabel = requiredString(value.weekdayLabel, 40)
  const plannedMinutes = numberValue(value.plannedMinutes, {
    maximum: 1_440,
  })
  const blocks = arrayValue(value.blocks, MAX_BLOCKS_PER_DAY, parseBlock)
  return dateKey &&
    weekday &&
    weekdayLabel &&
    typeof value.hasRoutine === "boolean" &&
    plannedMinutes !== null &&
    blocks
    ? {
        dateKey,
        weekday,
        weekdayLabel,
        hasRoutine: value.hasRoutine,
        plannedMinutes,
        blocks,
      }
    : null
}

function parseActiveRoutine(
  value: unknown,
): MentorContext["activeRoutine"] | null {
  if (!isObject(value)) return null
  const name = requiredString(value.name, 200)
  const mode = enumValue(value.mode, ROUTINE_MODES)
  return name && mode && typeof value.hasCustomRoutine === "boolean"
    ? { name, mode, hasCustomRoutine: value.hasCustomRoutine }
    : null
}

function parseMonthSummary(
  value: unknown,
): MentorContext["monthSummary"] | null {
  if (!isObject(value)) return null
  const keys = [
    "completedDays",
    "canceledDays",
    "missedDays",
    "studiedMinutes",
    "remainingMinutes",
    "bonusMinutes",
    "dailyGoalMinutes",
    "monthlyGoalMinutes",
  ] as const
  const parsed = Object.fromEntries(
    keys.map((key) => [key, numberValue(value[key])]),
  ) as Record<(typeof keys)[number], number | null>
  if (keys.some((key) => parsed[key] === null)) return null
  return parsed as MentorContext["monthSummary"]
}

function parseMonthRecord(value: unknown): MentorContextMonthRecord | null {
  if (!isObject(value)) return null
  const dateKey = dateValue(value.dateKey)
  const status = enumValue(value.status, [
    "in-progress",
    "completed",
    "canceled",
  ] as const)
  const studiedMinutes = numberValue(value.studiedMinutes)
  const completedAt = nullableDateTime(value.completedAt)
  const canceledAt = nullableDateTime(value.canceledAt)
  return dateKey &&
    status &&
    studiedMinutes !== null &&
    completedAt !== undefined &&
    canceledAt !== undefined
    ? { dateKey, status, studiedMinutes, completedAt, canceledAt }
    : null
}

function parseMonthTopic(value: unknown): MentorContextMonthTopic | null {
  if (!isObject(value)) return null
  const id = requiredString(value.id, 200)
  const title = requiredString(value.title, 200)
  const sourceBlocks = stringArray(value.sourceBlocks, 100)
  const days = arrayValue(value.days, 31, dateValue)
  const occurrenceCount = numberValue(value.occurrenceCount)
  const totalMinutes = numberValue(value.totalMinutes)
  return id &&
    title &&
    sourceBlocks &&
    days &&
    occurrenceCount !== null &&
    totalMinutes !== null
    ? { id, title, sourceBlocks, days, occurrenceCount, totalMinutes }
    : null
}

function parseMonthRoutine(
  value: unknown,
): MentorContext["monthRoutine"] | null {
  if (!isObject(value)) return null
  const year = numberValue(value.year, { minimum: 1970, maximum: 2200 })
  const month = numberValue(value.month, { maximum: 11 })
  const daysAnalyzed = numberValue(value.daysAnalyzed, { maximum: 31 })
  const studyBlockCount = numberValue(value.studyBlockCount)
  const topics = arrayValue(value.topics, MAX_MONTH_TOPICS, parseMonthTopic)
  return year !== null &&
    month !== null &&
    daysAnalyzed !== null &&
    studyBlockCount !== null &&
    topics
    ? { year, month, daysAnalyzed, studyBlockCount, topics }
    : null
}

function parseResourceSignal(
  value: unknown,
): MentorContextTrailResourceSignal | null {
  if (!isObject(value)) return null
  const id = requiredString(value.id, 200)
  const title = requiredString(value.title, 200)
  const provider = requiredString(value.provider, 200)
  const type = enumValue(value.type, RESOURCE_TYPES)
  const section = enumValue(value.section, ["resource", "video"] as const)
  return id && title && provider && type && section
    ? { id, title, provider, type, section }
    : null
}

function parseCourseSignal(
  value: unknown,
): MentorContextTrailUserCourseSignal | null {
  if (!isObject(value)) return null
  const id = requiredString(value.id, 200)
  const title = requiredString(value.title, 200)
  const url = requiredString(value.url, MAX_URL_LENGTH)
  const platform = requiredString(value.platform, 200)
  const completedAt = nullableDateTime(value.completedAt)
  if (!id || !title || !url || !platform || completedAt === undefined)
    return null
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
      return null
  } catch {
    return null
  }
  return typeof value.isFavorite === "boolean" &&
    typeof value.isCompleted === "boolean"
    ? {
        id,
        title,
        url,
        platform,
        isFavorite: value.isFavorite,
        isCompleted: value.isCompleted,
        completedAt,
      }
    : null
}

function parseTrailTopic(value: unknown): MentorContextTrailTopicSignal | null {
  if (!isObject(value)) return null
  const id = requiredString(value.id, 200)
  const title = requiredString(value.title, 200)
  const focus =
    value.focus === null ? null : requiredString(value.focus, MAX_STRING_LENGTH)
  const masteryStatus =
    value.masteryStatus === null
      ? null
      : enumValue(value.masteryStatus, MASTERY_STATUSES)
  const favoriteResources = arrayValue(
    value.favoriteResources,
    MAX_RESOURCE_SIGNALS,
    parseResourceSignal,
  )
  const studiedResources = arrayValue(
    value.studiedResources,
    MAX_RESOURCE_SIGNALS,
    parseResourceSignal,
  )
  const hiddenResources = arrayValue(
    value.hiddenResources,
    MAX_RESOURCE_SIGNALS,
    parseResourceSignal,
  )
  const userCourses = arrayValue(
    value.userCourses,
    MAX_USER_COURSES,
    parseCourseSignal,
  )
  return id &&
    title &&
    (focus !== null || value.focus === null) &&
    (masteryStatus !== null || value.masteryStatus === null) &&
    favoriteResources &&
    studiedResources &&
    hiddenResources &&
    userCourses
    ? {
        id,
        title,
        focus,
        masteryStatus,
        favoriteResources,
        studiedResources,
        hiddenResources,
        userCourses,
      }
    : null
}

function parseStudyTrail(value: unknown): MentorContext["studyTrail"] | null {
  if (!isObject(value) || typeof value.hasTrail !== "boolean") return null
  const title = value.title === null ? null : requiredString(value.title, 200)
  const routineName =
    value.routineName === null ? null : requiredString(value.routineName, 200)
  const topics = arrayValue(value.topics, MAX_TRAIL_TOPICS, parseTrailTopic)
  return (title !== null || value.title === null) &&
    (routineName !== null || value.routineName === null) &&
    topics
    ? { hasTrail: value.hasTrail, title, routineName, topics }
    : null
}

function parseSettings(value: unknown): MentorContext["settings"] | null {
  if (!isObject(value)) return null
  const routineMode = enumValue(value.routineMode, ROUTINE_MODES)
  const dailyGoalHours = numberValue(value.dailyGoalHours, {
    maximum: 24,
    integer: false,
  })
  const monthlyGoalHours = numberValue(value.monthlyGoalHours, {
    maximum: 744,
    integer: false,
  })
  const latenessToleranceMinutes = numberValue(value.latenessToleranceMinutes, {
    maximum: 1_440,
  })
  return routineMode &&
    dailyGoalHours !== null &&
    monthlyGoalHours !== null &&
    latenessToleranceMinutes !== null &&
    typeof value.soundsEnabled === "boolean" &&
    typeof value.hasCustomSounds === "boolean"
    ? {
        routineMode,
        dailyGoalHours,
        monthlyGoalHours,
        latenessToleranceMinutes,
        soundsEnabled: value.soundsEnabled,
        hasCustomSounds: value.hasCustomSounds,
      }
    : null
}
