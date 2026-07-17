import {
  DEFAULT_SETTINGS,
  DEFAULT_SOUND_PREFERENCES,
  MAX_CUSTOM_SOUND_SIZE_BYTES,
} from "@/constants/settings"
import { parseTimeToMinutes } from "@/features/routine/domain/routine-timeline"
import { normalizeMentorAction } from "@/features/mentor/utils/mentor-routine-proposal"
import type {
  DailyStudyRecord,
  Routine,
  RoutineBlock,
  RoutineBlockType,
  RoutineDay,
  RoutineMode,
  RoutineWeek,
  Weekday,
  StudyPause,
  StudySettings,
  StudySessionStatus,
  CustomSound,
  SoundEventKey,
  SoundPreference,
} from "@/types/study"
import type { Theme } from "@/types/theme"
import type {
  MentorMessage,
  StudyTrail,
  StudyTrailUserCourse,
  StudyTopicFocusOption,
  FreeStudyResource,
  StudyResourceTopicKey,
  StudyTopicMasteryStatus,
} from "@/features/mentor/types"

const ROUTINE_MODE_COMPAT: Record<string, RoutineMode> = {
  "sem-trabalho": "no-work",
  trabalhando: "working",
  ferias: "vacation",
  "no-work": "no-work",
  working: "working",
  vacation: "vacation",
}

const STUDY_SESSION_STATUSES: StudySessionStatus[] = [
  "in-progress",
  "completed",
  "canceled",
]
const ROUTINE_BLOCK_TYPES: RoutineBlockType[] = [
  "study",
  "short-break",
  "long-break",
  "lunch",
  "project",
  "other",
]
const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]
const MENTOR_MESSAGE_ROLES = ["user", "assistant"] as const

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && WEEKDAYS.includes(value as Weekday)
}

function isRoutineBlockType(value: unknown): value is RoutineBlockType {
  return (
    typeof value === "string" &&
    ROUTINE_BLOCK_TYPES.includes(value as RoutineBlockType)
  )
}

export function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim()),
    ),
  )
}

function normalizeStudyTopicMasteryStatus(
  value: unknown,
): StudyTopicMasteryStatus | null {
  return value === "starting" ||
    value === "studying" ||
    value === "understood" ||
    value === "review" ||
    value === "difficulty"
    ? value
    : null
}

const COURSE_PLATFORM_ALIASES: Array<{ hostname: string; label: string }> = [
  { hostname: "alura.com.br", label: "Alura" },
  { hostname: "youtube.com", label: "YouTube" },
  { hostname: "youtu.be", label: "YouTube" },
  { hostname: "udemy.com", label: "Udemy" },
  { hostname: "coursera.org", label: "Coursera" },
  { hostname: "edx.org", label: "edX" },
  { hostname: "rocketseat.com.br", label: "Rocketseat" },
  { hostname: "dio.me", label: "DIO" },
  { hostname: "freecodecamp.org", label: "freeCodeCamp" },
  { hostname: "cursoemvideo.com", label: "Curso em Vídeo" },
  { hostname: "web.dev", label: "web.dev" },
  { hostname: "figma.com", label: "Figma" },
]

function normalizeCoursePlatformName(platform: string, url: string): string {
  const rawPlatform = platform.trim()
  const rawUrl = url.trim()
  const candidates = [rawPlatform, rawUrl]

  for (const candidate of candidates) {
    const normalized = candidate
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]

    const alias = COURSE_PLATFORM_ALIASES.find(
      (item) =>
        normalized === item.hostname ||
        normalized.endsWith(`.${item.hostname}`),
    )

    if (alias) return alias.label
  }

  return rawPlatform || rawUrl
}

export function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function normalizeRoutineBlock(
  raw: unknown,
  index: number,
  weekday: Weekday,
): RoutineBlock | null {
  if (!isObject(raw)) return null

  const type = isRoutineBlockType(raw.type) ? raw.type : null
  const startTime = typeof raw.startTime === "string" ? raw.startTime : null
  const endTime = typeof raw.endTime === "string" ? raw.endTime : null

  if (
    !type ||
    !startTime ||
    !endTime ||
    parseTimeToMinutes(startTime) === null ||
    parseTimeToMinutes(endTime) === null
  ) {
    return null
  }

  const durationMinutes = normalizeNumber(raw.durationMinutes, 0)
  if (durationMinutes <= 0 || durationMinutes > 24 * 60) return null

  return {
    id: normalizeString(raw.id, `${weekday}-${index + 1}`),
    type,
    subjectId: normalizeOptionalString(raw.subjectId),
    repeatSourceId: normalizeOptionalString(raw.repeatSourceId),
    title: normalizeString(raw.title, type),
    description: normalizeOptionalString(raw.description),
    startTime,
    endTime,
    durationMinutes: Math.floor(durationMinutes),
    order: Math.max(1, Math.floor(normalizeNumber(raw.order, index + 1))),
  }
}

function normalizeRoutineDay(raw: unknown, _index: number): RoutineDay | null {
  if (!isObject(raw)) return null
  if (!isWeekday(raw.weekday)) return null

  const weekday = raw.weekday
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .map((block, blockIndex) =>
          normalizeRoutineBlock(block, blockIndex, weekday),
        )
        .filter((block): block is RoutineBlock => block !== null)
    : []

  return {
    id: normalizeString(raw.id, `custom-${weekday}`),
    weekday,
    blocks,
    isActive:
      typeof raw.isActive === "boolean" ? raw.isActive : blocks.length > 0,
  }
}

function normalizeRoutineWeek(raw: unknown, index: number): RoutineWeek | null {
  if (!isObject(raw)) return null
  if (typeof raw.weekStartDate !== "string") return null
  if (!Array.isArray(raw.days)) return null

  const days = raw.days
    .map((day, dayIndex) => normalizeRoutineDay(day, dayIndex))
    .filter((day): day is RoutineDay => day !== null)

  if (days.length === 0) return null

  return {
    id: normalizeString(raw.id, `custom-week-${index + 1}`),
    weekStartDate: raw.weekStartDate,
    days,
  }
}

export function normalizeRoutine(raw: unknown): Routine | null {
  if (!isObject(raw)) return null
  if (!Array.isArray(raw.days)) return null

  const days = raw.days
    .map((day, index) => normalizeRoutineDay(day, index))
    .filter((day): day is RoutineDay => day !== null)

  if (days.length === 0) return null

  const weeks = Array.isArray(raw.weeks)
    ? raw.weeks
        .map((week, index) => normalizeRoutineWeek(week, index))
        .filter((week): week is RoutineWeek => week !== null)
    : []

  return {
    id: normalizeString(raw.id, "custom-routine"),
    name: normalizeString(raw.name, "Rotina personalizada"),
    mode: normalizeRoutineMode(raw.mode),
    days,
    weeks,
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
    updatedAt: normalizeString(raw.updatedAt, new Date(0).toISOString()),
  }
}

function normalizeRoutineMode(value: unknown): RoutineMode {
  return typeof value === "string"
    ? (ROUTINE_MODE_COMPAT[value] ?? DEFAULT_SETTINGS.routineMode)
    : DEFAULT_SETTINGS.routineMode
}

function isSoundEventKey(value: unknown): value is SoundEventKey {
  return (
    value === "shortBreak" ||
    value === "longBreak" ||
    value === "lunch" ||
    value === "subjectChange"
  )
}

function normalizeSoundPreference(raw: unknown): SoundPreference {
  const preference = isObject(raw) ? raw : {}
  const audioId =
    typeof preference.audioId === "string" &&
    preference.audioId.trim().length > 0
      ? preference.audioId
      : "default"
  const startSeconds = normalizeNumber(preference.startSeconds, 0)
  const endSeconds =
    typeof preference.endSeconds === "number" &&
    Number.isFinite(preference.endSeconds)
      ? Math.max(0, preference.endSeconds)
      : null

  return {
    audioId,
    startSeconds: Math.max(0, startSeconds),
    endSeconds,
  }
}

function normalizeCustomSound(raw: unknown): CustomSound | null {
  if (!isObject(raw)) return null

  const id = normalizeString(raw.id, "")
  const name = normalizeString(raw.name, "")
  const dataUrl = normalizeString(raw.dataUrl, "")
  const mimeType = normalizeString(raw.mimeType, "audio/*")
  const sizeBytes = normalizeNumber(raw.sizeBytes, 0)
  const durationSeconds = normalizeNumber(raw.durationSeconds, 0)

  if (
    !id ||
    !name ||
    !dataUrl ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_CUSTOM_SOUND_SIZE_BYTES
  ) {
    return null
  }

  return {
    id,
    name,
    dataUrl,
    mimeType,
    sizeBytes,
    durationSeconds: Math.max(0, durationSeconds),
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
  }
}

export function normalizeSettings(raw: unknown): StudySettings {
  const rawSettings = isObject(raw) ? raw : {}
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings }

  const customSounds = Array.isArray(rawSettings.customSounds)
    ? rawSettings.customSounds
        .map(normalizeCustomSound)
        .filter((sound): sound is CustomSound => sound !== null)
    : []

  const rawPreferences = isObject(rawSettings.soundPreferences)
    ? rawSettings.soundPreferences
    : {}
  const soundPreferences = { ...DEFAULT_SOUND_PREFERENCES }

  for (const key of Object.keys(soundPreferences)) {
    if (isSoundEventKey(key)) {
      soundPreferences[key] = normalizeSoundPreference(rawPreferences[key])
    }
  }

  const validAudioIds = new Set([
    "default",
    ...customSounds.map((sound) => sound.id),
  ])
  for (const key of Object.keys(soundPreferences)) {
    if (
      isSoundEventKey(key) &&
      !validAudioIds.has(soundPreferences[key].audioId)
    ) {
      soundPreferences[key] = { ...soundPreferences[key], audioId: "default" }
    }
  }

  return {
    ...settings,
    routineMode: normalizeRoutineMode(settings.routineMode),
    customSounds,
    soundPreferences,
  }
}

function normalizePause(raw: unknown): StudyPause {
  const pause = isObject(raw) ? raw : {}

  return {
    startedAt:
      typeof pause.startedAt === "string"
        ? pause.startedAt
        : new Date(0).toISOString(),
    endedAt: typeof pause.endedAt === "string" ? pause.endedAt : null,
    durationSeconds:
      typeof pause.durationSeconds === "number" &&
      Number.isFinite(pause.durationSeconds)
        ? pause.durationSeconds
        : 0,
  }
}

function normalizeRecord(raw: unknown, dateKey: string): DailyStudyRecord {
  const record = isObject(raw) ? raw : {}
  const status = STUDY_SESSION_STATUSES.includes(
    record.status as StudySessionStatus,
  )
    ? (record.status as StudySessionStatus)
    : "in-progress"

  return {
    dateKey: typeof record.dateKey === "string" ? record.dateKey : dateKey,
    presenceAt:
      typeof record.presenceAt === "string" ? record.presenceAt : null,
    studyStartedAt:
      typeof record.studyStartedAt === "string" ? record.studyStartedAt : null,
    activeSeconds:
      typeof record.activeSeconds === "number" &&
      Number.isFinite(record.activeSeconds)
        ? record.activeSeconds
        : 0,
    pauseSeconds:
      typeof record.pauseSeconds === "number" &&
      Number.isFinite(record.pauseSeconds)
        ? record.pauseSeconds
        : 0,
    routineBreakSeconds:
      typeof record.routineBreakSeconds === "number" &&
      Number.isFinite(record.routineBreakSeconds)
        ? record.routineBreakSeconds
        : 0,
    bonusSeconds:
      typeof record.bonusSeconds === "number" &&
      Number.isFinite(record.bonusSeconds)
        ? record.bonusSeconds
        : 0,
    status,
    pauses: Array.isArray(record.pauses)
      ? record.pauses.map(normalizePause)
      : [],
    completedAt:
      typeof record.completedAt === "string" ? record.completedAt : null,
    canceledAt:
      typeof record.canceledAt === "string" ? record.canceledAt : null,
    resumedAt: typeof record.resumedAt === "string" ? record.resumedAt : null,
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : new Date(0).toISOString(),
    activeSegmentStartedAt:
      typeof record.activeSegmentStartedAt === "string"
        ? record.activeSegmentStartedAt
        : null,
    routineBreakSegmentStartedAt:
      typeof record.routineBreakSegmentStartedAt === "string"
        ? record.routineBreakSegmentStartedAt
        : null,
    routineBlockIndex:
      typeof record.routineBlockIndex === "number" &&
      Number.isFinite(record.routineBlockIndex)
        ? Math.max(0, Math.floor(record.routineBlockIndex))
        : 0,
    routineBlockElapsedSeconds:
      typeof record.routineBlockElapsedSeconds === "number" &&
      Number.isFinite(record.routineBlockElapsedSeconds)
        ? Math.max(0, Math.floor(record.routineBlockElapsedSeconds))
        : 0,
    awaitingNextBlock:
      typeof record.awaitingNextBlock === "boolean"
        ? record.awaitingNextBlock
        : false,
  }
}

export function normalizeRecords(
  raw: unknown,
): Record<string, DailyStudyRecord> {
  if (!isObject(raw)) return {}

  return Object.fromEntries(
    Object.entries(raw).map(([dateKey, record]) => [
      dateKey,
      normalizeRecord(record, dateKey),
    ]),
  )
}

function normalizeMentorMessage(
  raw: unknown,
  index: number,
): MentorMessage | null {
  if (!isObject(raw)) return null

  const role =
    typeof raw.role === "string" &&
    MENTOR_MESSAGE_ROLES.includes(raw.role as MentorMessage["role"])
      ? (raw.role as MentorMessage["role"])
      : null
  const content =
    typeof raw.content === "string" ? raw.content.trim().slice(0, 6_000) : ""

  if (!role || content.length === 0) return null

  return {
    id: normalizeString(raw.id, `mentor-message-${index + 1}`),
    role,
    content,
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
    action: normalizeMentorAction(raw.action) ?? undefined,
  }
}

export function normalizeMentorChat(raw: unknown): MentorMessage[] {
  if (!Array.isArray(raw)) return []

  return raw
    .slice(-100)
    .map((message, index) => normalizeMentorMessage(message, index))
    .filter((message): message is MentorMessage => message !== null)
}

function normalizeStudyResource(raw: unknown): FreeStudyResource | null {
  if (!isObject(raw)) return null

  const topics = Array.isArray(raw.topics)
    ? raw.topics.filter(
        (topic): topic is StudyResourceTopicKey => typeof topic === "string",
      )
    : []

  return {
    id: normalizeString(raw.id, "resource"),
    title: normalizeString(raw.title, "Recurso de estudo"),
    url: normalizeString(raw.url, "#"),
    type:
      raw.type === "documentacao" ||
      raw.type === "curso" ||
      raw.type === "video" ||
      raw.type === "canal" ||
      raw.type === "playlist" ||
      raw.type === "plataforma" ||
      raw.type === "roadmap" ||
      raw.type === "pratica"
        ? raw.type
        : "curso",
    provider: normalizeString(raw.provider, "Recurso gratuito"),
    language: raw.language === "en" ? "en" : "pt-BR",
    level:
      raw.level === "iniciante" ||
      raw.level === "iniciante-intermediario" ||
      raw.level === "intermediario" ||
      raw.level === "iniciante-avancado"
        ? raw.level
        : "iniciante-intermediario",
    topics,
    description: normalizeString(
      raw.description,
      "Recurso gratuito para apoiar seus estudos.",
    ),
  }
}

function normalizeStudyTopicFocusOption(
  raw: unknown,
): StudyTopicFocusOption | null {
  if (!isObject(raw)) return null

  const resources = Array.isArray(raw.resources)
    ? raw.resources
        .map(normalizeStudyResource)
        .filter((resource): resource is FreeStudyResource => resource !== null)
    : []
  const videoResources = Array.isArray(raw.videoResources)
    ? raw.videoResources
        .map(normalizeStudyResource)
        .filter((resource): resource is FreeStudyResource => resource !== null)
    : []

  return {
    id: normalizeString(raw.id, "focus"),
    label: normalizeString(raw.label, "Foco"),
    steps: Array.isArray(raw.steps)
      ? raw.steps.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [],
    resources,
    videoResources,
  }
}

function normalizeStudyTrailUserCourse(
  raw: unknown,
  index: number,
): StudyTrailUserCourse | null {
  if (!isObject(raw)) return null

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  const url = typeof raw.url === "string" ? raw.url.trim() : ""

  if (!title || !url) return null

  return {
    id: normalizeString(raw.id, `user-course-${index + 1}`),
    title,
    url,
    platform: normalizeCoursePlatformName(
      normalizeString(raw.platform, url),
      url,
    ),
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    isFavorite: raw.isFavorite === true,
    isCompleted: raw.isCompleted === true,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
  }
}

function normalizeStudyTrailTopic(
  raw: unknown,
  index: number,
): StudyTrail["topics"][number] | null {
  if (!isObject(raw)) return null

  const resources = Array.isArray(raw.resources)
    ? raw.resources
        .map(normalizeStudyResource)
        .filter((resource): resource is FreeStudyResource => resource !== null)
    : []
  const videoResources = Array.isArray(raw.videoResources)
    ? raw.videoResources
        .map(normalizeStudyResource)
        .filter((resource): resource is FreeStudyResource => resource !== null)
    : []
  const userCourses = Array.isArray(raw.userCourses)
    ? raw.userCourses
        .map(normalizeStudyTrailUserCourse)
        .filter((course): course is StudyTrailUserCourse => course !== null)
    : []

  return {
    id: normalizeString(raw.id, `trail-topic-${index + 1}`),
    title: normalizeString(raw.title, "Tema de estudo"),
    description: normalizeString(
      raw.description,
      "Trilha criada a partir da sua rotina.",
    ),
    sourceBlocks: Array.isArray(raw.sourceBlocks)
      ? raw.sourceBlocks.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [],
    sourceDays: Array.isArray(raw.sourceDays)
      ? raw.sourceDays.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [],
    occurrenceCount:
      typeof raw.occurrenceCount === "number" &&
      Number.isFinite(raw.occurrenceCount)
        ? Math.max(1, Math.floor(raw.occurrenceCount))
        : 1,
    totalMinutes:
      typeof raw.totalMinutes === "number" && Number.isFinite(raw.totalMinutes)
        ? Math.max(0, Math.round(raw.totalMinutes))
        : 0,
    resources,
    videoResources,
    userCourses,
    steps: Array.isArray(raw.steps)
      ? raw.steps.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [],
    projectSuggestion: normalizeString(
      raw.projectSuggestion,
      "Crie uma entrega pequena para praticar este tema.",
    ),
    isBroad: raw.isBroad === true,
    focusOptions: Array.isArray(raw.focusOptions)
      ? raw.focusOptions
          .map(normalizeStudyTopicFocusOption)
          .filter((focus): focus is StudyTopicFocusOption => focus !== null)
      : [],
    selectedFocusId:
      typeof raw.selectedFocusId === "string" ? raw.selectedFocusId : null,
    selectedFocusLabel:
      typeof raw.selectedFocusLabel === "string"
        ? raw.selectedFocusLabel
        : null,
    hiddenResourceIds: normalizeStringList(raw.hiddenResourceIds),
    favoriteResourceIds: normalizeStringList(raw.favoriteResourceIds),
    studiedResourceIds: normalizeStringList(raw.studiedResourceIds),
    masteryStatus: normalizeStudyTopicMasteryStatus(raw.masteryStatus),
    masteryUpdatedAt:
      typeof raw.masteryUpdatedAt === "string" ? raw.masteryUpdatedAt : null,
  }
}

function normalizeStudyTrail(raw: unknown, index: number): StudyTrail | null {
  if (!isObject(raw)) return null

  const topics = Array.isArray(raw.topics)
    ? raw.topics
        .map((topic, topicIndex) => normalizeStudyTrailTopic(topic, topicIndex))
        .filter(
          (topic): topic is StudyTrail["topics"][number] => topic !== null,
        )
    : []

  return {
    id: normalizeString(raw.id, `study-trail-${index + 1}`),
    title: normalizeString(raw.title, "Trilha de estudos"),
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
    routineName: normalizeString(raw.routineName, "Rotina"),
    summary: normalizeString(raw.summary, "Trilha criada a partir da rotina."),
    topics,
    mentorNotes: typeof raw.mentorNotes === "string" ? raw.mentorNotes : "",
    providerMode:
      raw.providerMode === "gemini" ||
      raw.providerMode === "groq" ||
      raw.providerMode === "openrouter" ||
      raw.providerMode === "openai" ||
      raw.providerMode === "mock"
        ? raw.providerMode
        : "mock",
    routineSignature:
      typeof raw.routineSignature === "string"
        ? raw.routineSignature
        : undefined,
  }
}

export function normalizeStudyTrails(raw: unknown): StudyTrail[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((trail, index) => normalizeStudyTrail(trail, index))
    .filter((trail): trail is StudyTrail => trail !== null)
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}
