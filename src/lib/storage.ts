import { DEFAULT_SETTINGS, DEFAULT_SOUND_PREFERENCES, MAX_CUSTOM_SOUND_SIZE_BYTES } from "@/constants/settings"
import { DEFAULT_ROUTINE } from "@/constants/routine"
import { BACKUP_SCHEMA_VERSION, STORAGE_EVENTS, STORAGE_KEYS } from "@/constants/storage"
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
import type { MentorMessage } from "@/features/mentor/types"

const ROUTINE_MODE_COMPAT: Record<string, RoutineMode> = {
  "sem-trabalho": "no-work",
  trabalhando: "working",
  ferias: "vacation",
  "no-work": "no-work",
  working: "working",
  vacation: "vacation",
}

const STUDY_SESSION_STATUSES: StudySessionStatus[] = ["in-progress", "completed", "canceled"]
const ROUTINE_BLOCK_TYPES: RoutineBlockType[] = ["study", "short-break", "long-break", "lunch", "project", "other"]
const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const MENTOR_MESSAGE_ROLES = ["user", "assistant"] as const

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function dispatchStorageEvent(eventName: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(eventName))
}

function notifySettingsChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.settingsChanged)
}

function notifyRecordsChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.recordsChanged)
}

function notifyRoutineChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.routineChanged)
}

function notifyThemeChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.themeChanged)
}

function notifyMentorChatChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.mentorChatChanged)
}

function notifyAppDataChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.appDataChanged)
}

function notifyAllDataChanged(): void {
  notifySettingsChanged()
  notifyRecordsChanged()
  notifyRoutineChanged()
  notifyThemeChanged()
  notifyMentorChatChanged()
  notifyAppDataChanged()
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && WEEKDAYS.includes(value as Weekday)
}

function isRoutineBlockType(value: unknown): value is RoutineBlockType {
  return typeof value === "string" && ROUTINE_BLOCK_TYPES.includes(value as RoutineBlockType)
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function normalizeRoutineBlock(raw: unknown, index: number, weekday: Weekday): RoutineBlock | null {
  if (!isObject(raw)) return null

  const type = isRoutineBlockType(raw.type) ? raw.type : null
  const startTime = typeof raw.startTime === "string" ? raw.startTime : null
  const endTime = typeof raw.endTime === "string" ? raw.endTime : null

  if (!type || !startTime || !endTime) return null

  return {
    id: normalizeString(raw.id, `${weekday}-${index + 1}`),
    type,
    subjectId: normalizeOptionalString(raw.subjectId),
    title: normalizeString(raw.title, type),
    startTime,
    endTime,
    durationMinutes: normalizeNumber(raw.durationMinutes, 0),
    order: normalizeNumber(raw.order, index + 1),
  }
}

function normalizeRoutineDay(raw: unknown, index: number): RoutineDay | null {
  if (!isObject(raw)) return null
  if (!isWeekday(raw.weekday)) return null

  const weekday = raw.weekday
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .map((block, blockIndex) => normalizeRoutineBlock(block, blockIndex, weekday))
        .filter((block): block is RoutineBlock => block !== null)
    : []

  return {
    id: normalizeString(raw.id, `custom-${weekday}`),
    weekday,
    blocks,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : blocks.length > 0,
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

function normalizeRoutine(raw: unknown): Routine | null {
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
  return typeof value === "string" ? ROUTINE_MODE_COMPAT[value] ?? DEFAULT_SETTINGS.routineMode : DEFAULT_SETTINGS.routineMode
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
  const audioId = typeof preference.audioId === "string" && preference.audioId.trim().length > 0
    ? preference.audioId
    : "default"
  const startSeconds = normalizeNumber(preference.startSeconds, 0)
  const endSeconds =
    typeof preference.endSeconds === "number" && Number.isFinite(preference.endSeconds)
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

  if (!id || !name || !dataUrl || sizeBytes <= 0 || sizeBytes > MAX_CUSTOM_SOUND_SIZE_BYTES) {
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

function normalizeSettings(raw: unknown): StudySettings {
  const rawSettings = isObject(raw) ? raw : {}
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings }

  const customSounds = Array.isArray(rawSettings.customSounds)
    ? rawSettings.customSounds
        .map(normalizeCustomSound)
        .filter((sound): sound is CustomSound => sound !== null)
    : []

  const rawPreferences = isObject(rawSettings.soundPreferences) ? rawSettings.soundPreferences : {}
  const soundPreferences = { ...DEFAULT_SOUND_PREFERENCES }

  for (const key of Object.keys(soundPreferences)) {
    if (isSoundEventKey(key)) {
      soundPreferences[key] = normalizeSoundPreference(rawPreferences[key])
    }
  }

  const validAudioIds = new Set(["default", ...customSounds.map((sound) => sound.id)])
  for (const key of Object.keys(soundPreferences)) {
    if (isSoundEventKey(key) && !validAudioIds.has(soundPreferences[key].audioId)) {
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
    startedAt: typeof pause.startedAt === "string" ? pause.startedAt : new Date(0).toISOString(),
    endedAt: typeof pause.endedAt === "string" ? pause.endedAt : null,
    durationSeconds:
      typeof pause.durationSeconds === "number" && Number.isFinite(pause.durationSeconds)
        ? pause.durationSeconds
        : 0,
  }
}

function normalizeRecord(raw: unknown, dateKey: string): DailyStudyRecord {
  const record = isObject(raw) ? raw : {}
  const status = STUDY_SESSION_STATUSES.includes(record.status as StudySessionStatus)
    ? (record.status as StudySessionStatus)
    : "in-progress"

  return {
    dateKey: typeof record.dateKey === "string" ? record.dateKey : dateKey,
    presenceAt: typeof record.presenceAt === "string" ? record.presenceAt : null,
    studyStartedAt: typeof record.studyStartedAt === "string" ? record.studyStartedAt : null,
    activeSeconds:
      typeof record.activeSeconds === "number" && Number.isFinite(record.activeSeconds)
        ? record.activeSeconds
        : 0,
    pauseSeconds:
      typeof record.pauseSeconds === "number" && Number.isFinite(record.pauseSeconds)
        ? record.pauseSeconds
        : 0,
    routineBreakSeconds:
      typeof record.routineBreakSeconds === "number" && Number.isFinite(record.routineBreakSeconds)
        ? record.routineBreakSeconds
        : 0,
    bonusSeconds:
      typeof record.bonusSeconds === "number" && Number.isFinite(record.bonusSeconds)
        ? record.bonusSeconds
        : 0,
    status,
    pauses: Array.isArray(record.pauses) ? record.pauses.map(normalizePause) : [],
    completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
    canceledAt: typeof record.canceledAt === "string" ? record.canceledAt : null,
    resumedAt: typeof record.resumedAt === "string" ? record.resumedAt : null,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date(0).toISOString(),
    activeSegmentStartedAt:
      typeof record.activeSegmentStartedAt === "string" ? record.activeSegmentStartedAt : null,
    routineBreakSegmentStartedAt:
      typeof record.routineBreakSegmentStartedAt === "string"
        ? record.routineBreakSegmentStartedAt
        : null,
    routineBlockIndex:
      typeof record.routineBlockIndex === "number" && Number.isFinite(record.routineBlockIndex)
        ? Math.max(0, Math.floor(record.routineBlockIndex))
        : 0,
    routineBlockElapsedSeconds:
      typeof record.routineBlockElapsedSeconds === "number" &&
      Number.isFinite(record.routineBlockElapsedSeconds)
        ? Math.max(0, Math.floor(record.routineBlockElapsedSeconds))
        : 0,
    awaitingNextBlock:
      typeof record.awaitingNextBlock === "boolean" ? record.awaitingNextBlock : false,
  }
}

function normalizeRecords(raw: unknown): Record<string, DailyStudyRecord> {
  if (!isObject(raw)) return {}

  return Object.fromEntries(
    Object.entries(raw).map(([dateKey, record]) => [dateKey, normalizeRecord(record, dateKey)]),
  )
}

function normalizeMentorMessage(raw: unknown, index: number): MentorMessage | null {
  if (!isObject(raw)) return null

  const role = typeof raw.role === "string" && MENTOR_MESSAGE_ROLES.includes(raw.role as MentorMessage["role"])
    ? (raw.role as MentorMessage["role"])
    : null
  const content = typeof raw.content === "string" ? raw.content.trim() : ""

  if (!role || content.length === 0) return null

  return {
    id: normalizeString(raw.id, `mentor-message-${index + 1}`),
    role,
    content,
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
  }
}

function normalizeMentorChat(raw: unknown): MentorMessage[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((message, index) => normalizeMentorMessage(message, index))
    .filter((message): message is MentorMessage => message !== null)
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

export function loadSettings(): StudySettings {
  return normalizeSettings(readJson<Partial<StudySettings>>(STORAGE_KEYS.settings, {}))
}

export function saveSettings(settings: StudySettings): void {
  writeJson(STORAGE_KEYS.settings, settings)
  notifySettingsChanged()
}

export function restoreDefaultSettings(): void {
  writeJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  notifySettingsChanged()
}

export function loadAllRecords(): Record<string, DailyStudyRecord> {
  return normalizeRecords(readJson<unknown>(STORAGE_KEYS.records, {}))
}

export function loadRecord(dateKey: string): DailyStudyRecord | null {
  const records = loadAllRecords()
  return records[dateKey] ?? null
}

export function saveRecord(record: DailyStudyRecord): void {
  const records = loadAllRecords()
  records[record.dateKey] = record
  writeJson(STORAGE_KEYS.records, records)
  notifyRecordsChanged()
}

export function deleteRecord(dateKey: string): void {
  const records = loadAllRecords()
  delete records[dateKey]
  writeJson(STORAGE_KEYS.records, records)
  notifyRecordsChanged()
}


export function getStoredRoutine(): Routine | null {
  const raw = readJson<unknown>(STORAGE_KEYS.routine, null)
  return normalizeRoutine(raw)
}

export function saveStoredRoutine(routine: Routine): void {
  const normalized = normalizeRoutine(routine)
  if (!normalized) return
  writeJson(STORAGE_KEYS.routine, { ...normalized, updatedAt: new Date().toISOString() })
  notifyRoutineChanged()
}

export function clearStoredRoutine(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEYS.routine)
  notifyRoutineChanged()
}

export function getActiveRoutine(): Routine {
  return getStoredRoutine() ?? DEFAULT_ROUTINE
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(STORAGE_KEYS.onboardingCompleted) === "true"
}

export function completeOnboarding(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEYS.onboardingCompleted, "true")
  notifyAppDataChanged()
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEYS.onboardingCompleted)
  notifyAppDataChanged()
}

export function loadMentorChat(): MentorMessage[] {
  return normalizeMentorChat(readJson<unknown>(STORAGE_KEYS.mentorChat, []))
}

export function saveMentorChat(messages: MentorMessage[]): void {
  writeJson(STORAGE_KEYS.mentorChat, normalizeMentorChat(messages))
  notifyMentorChatChanged()
}

export function clearMentorChat(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEYS.mentorChat)
  notifyMentorChatChanged()
}

export interface RoutineOSBackup {
  app: "RoutineOS"
  schemaVersion: number
  exportedAt: string
  data: {
    settings: StudySettings
    records: Record<string, DailyStudyRecord>
    routine: Routine | null
    view: string | null
    theme: Theme | null
    onboardingCompleted: boolean
    mentorChat: MentorMessage[]
  }
}

function normalizeBackup(raw: unknown): RoutineOSBackup | null {
  if (!isObject(raw)) return null
  if (raw.app !== "RoutineOS") return null
  if (!isObject(raw.data)) return null

  const data = raw.data

  return {
    app: "RoutineOS",
    schemaVersion: normalizeNumber(raw.schemaVersion, BACKUP_SCHEMA_VERSION),
    exportedAt: normalizeString(raw.exportedAt, new Date().toISOString()),
    data: {
      settings: normalizeSettings(data.settings),
      records: normalizeRecords(data.records),
      routine: data.routine === null ? null : normalizeRoutine(data.routine),
      view: typeof data.view === "string" ? data.view : null,
      theme: isTheme(data.theme) ? data.theme : null,
      onboardingCompleted: data.onboardingCompleted === true,
      mentorChat: normalizeMentorChat(data.mentorChat),
    },
  }
}

export function createRoutineOSBackup(): RoutineOSBackup {
  const theme = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEYS.theme)
  const view = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEYS.view)

  return {
    app: "RoutineOS",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings: loadSettings(),
      records: loadAllRecords(),
      routine: getStoredRoutine(),
      view: typeof view === "string" ? view : null,
      theme: isTheme(theme) ? theme : null,
      onboardingCompleted: hasCompletedOnboarding(),
      mentorChat: loadMentorChat(),
    },
  }
}

export function importRoutineOSBackup(raw: unknown): RoutineOSBackup {
  const backup = normalizeBackup(raw)
  if (!backup) {
    throw new Error("Arquivo de backup inválido.")
  }

  writeJson(STORAGE_KEYS.settings, backup.data.settings)
  writeJson(STORAGE_KEYS.records, backup.data.records)
  writeJson(STORAGE_KEYS.mentorChat, backup.data.mentorChat)

  if (backup.data.routine) {
    writeJson(STORAGE_KEYS.routine, backup.data.routine)
  } else if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEYS.routine)
  }

  if (typeof window !== "undefined") {
    if (backup.data.view) {
      window.localStorage.setItem(STORAGE_KEYS.view, backup.data.view)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.view)
    }

    if (backup.data.theme) {
      window.localStorage.setItem(STORAGE_KEYS.theme, backup.data.theme)
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.theme)
    }

    if (backup.data.onboardingCompleted) {
      window.localStorage.setItem(STORAGE_KEYS.onboardingCompleted, "true")
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.onboardingCompleted)
    }
  }

  notifyAllDataChanged()
  return backup
}

export function resetStoredAppData(): void {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(STORAGE_KEYS.settings)
  window.localStorage.removeItem(STORAGE_KEYS.records)
  window.localStorage.removeItem(STORAGE_KEYS.routine)
  window.localStorage.removeItem(STORAGE_KEYS.view)
  window.localStorage.removeItem(STORAGE_KEYS.theme)
  window.localStorage.removeItem(STORAGE_KEYS.onboardingCompleted)
  window.localStorage.removeItem(STORAGE_KEYS.mentorChat)

  notifyAllDataChanged()
}
