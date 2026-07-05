import { DEFAULT_SETTINGS } from "@/constants/settings"
import { DEFAULT_ROUTINE } from "@/constants/routine"
import { STORAGE_EVENTS, STORAGE_KEYS } from "@/constants/storage"
import type {
  DailyStudyRecord,
  Routine,
  RoutineBlock,
  RoutineBlockType,
  RoutineDay,
  RoutineMode,
  Weekday,
  StudyPause,
  StudySettings,
  StudySessionStatus,
} from "@/types/study"

const ROUTINE_MODE_COMPAT: Record<string, RoutineMode> = {
  "sem-trabalho": "no-work",
  trabalhando: "working",
  ferias: "vacation",
  "no-work": "no-work",
  working: "working",
  vacation: "vacation",
}

const STUDY_SESSION_STATUSES: StudySessionStatus[] = ["in-progress", "completed", "canceled"]
const ROUTINE_BLOCK_TYPES: RoutineBlockType[] = ["study", "short-break", "long-break", "lunch", "project"]
const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

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

function notifyRecordsChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(STORAGE_EVENTS.recordsChanged))
}

function notifyRoutineChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(STORAGE_EVENTS.routineChanged))
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

function normalizeRoutine(raw: unknown): Routine | null {
  if (!isObject(raw)) return null
  if (!Array.isArray(raw.days)) return null

  const days = raw.days
    .map((day, index) => normalizeRoutineDay(day, index))
    .filter((day): day is RoutineDay => day !== null)

  if (days.length === 0) return null

  return {
    id: normalizeString(raw.id, "custom-routine"),
    name: normalizeString(raw.name, "Rotina personalizada"),
    mode: normalizeRoutineMode(raw.mode),
    days,
    createdAt: normalizeString(raw.createdAt, new Date(0).toISOString()),
    updatedAt: normalizeString(raw.updatedAt, new Date(0).toISOString()),
  }
}

function normalizeRoutineMode(value: unknown): RoutineMode {
  return typeof value === "string" ? ROUTINE_MODE_COMPAT[value] ?? DEFAULT_SETTINGS.routineMode : DEFAULT_SETTINGS.routineMode
}

function normalizeSettings(raw: Partial<StudySettings>): StudySettings {
  const settings = { ...DEFAULT_SETTINGS, ...raw }
  return {
    ...settings,
    routineMode: normalizeRoutineMode(settings.routineMode),
  }
}

function normalizePause(raw: Partial<StudyPause>): StudyPause {
  return {
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : new Date(0).toISOString(),
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : null,
    durationSeconds:
      typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds)
        ? raw.durationSeconds
        : 0,
  }
}

function normalizeRecord(raw: Partial<DailyStudyRecord>, dateKey: string): DailyStudyRecord {
  const status = STUDY_SESSION_STATUSES.includes(raw.status as StudySessionStatus)
    ? (raw.status as StudySessionStatus)
    : "in-progress"

  return {
    dateKey: typeof raw.dateKey === "string" ? raw.dateKey : dateKey,
    presenceAt: typeof raw.presenceAt === "string" ? raw.presenceAt : null,
    studyStartedAt: typeof raw.studyStartedAt === "string" ? raw.studyStartedAt : null,
    activeSeconds:
      typeof raw.activeSeconds === "number" && Number.isFinite(raw.activeSeconds)
        ? raw.activeSeconds
        : 0,
    pauseSeconds:
      typeof raw.pauseSeconds === "number" && Number.isFinite(raw.pauseSeconds)
        ? raw.pauseSeconds
        : 0,
    bonusSeconds:
      typeof raw.bonusSeconds === "number" && Number.isFinite(raw.bonusSeconds)
        ? raw.bonusSeconds
        : 0,
    status,
    pauses: Array.isArray(raw.pauses) ? raw.pauses.map(normalizePause) : [],
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
    canceledAt: typeof raw.canceledAt === "string" ? raw.canceledAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
    activeSegmentStartedAt:
      typeof raw.activeSegmentStartedAt === "string" ? raw.activeSegmentStartedAt : null,
  }
}

export function loadSettings(): StudySettings {
  return normalizeSettings(readJson<Partial<StudySettings>>(STORAGE_KEYS.settings, {}))
}

export function saveSettings(settings: StudySettings): void {
  writeJson(STORAGE_KEYS.settings, settings)
}

export function loadAllRecords(): Record<string, DailyStudyRecord> {
  const records = readJson<Record<string, Partial<DailyStudyRecord>>>(STORAGE_KEYS.records, {})

  return Object.fromEntries(
    Object.entries(records).map(([dateKey, record]) => [dateKey, normalizeRecord(record, dateKey)]),
  )
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
