import { DEFAULT_SETTINGS } from "@/constants/settings"
import { DEFAULT_ROUTINE, LEGACY_DEFAULT_ROUTINE_ID } from "@/constants/routine"
import {
  BACKUP_SCHEMA_VERSION,
  STORAGE_EVENTS,
  STORAGE_KEYS,
} from "@/constants/storage"
import { normalizeMentorRoutineProposal } from "@/features/mentor/utils/mentor-routine-proposal"
import type { DailyStudyRecord, Routine, StudySettings } from "@/types/study"
import type { Theme } from "@/types/theme"
import type {
  MentorMessage,
  MentorRoutineProposal,
  StudyTrail,
} from "@/features/mentor/types"

import {
  isObject,
  isTheme,
  normalizeMentorChat,
  normalizeNumber,
  normalizeRecords,
  normalizeRoutine,
  normalizeSettings,
  normalizeString,
  normalizeStudyTrails,
} from "@/lib/storage/storage-validators"

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

function notifyMentorTrailsChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.mentorTrailsChanged)
}

function notifyMentorRoutineDraftChanged(): void {
  dispatchStorageEvent(STORAGE_EVENTS.mentorRoutineDraftChanged)
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
  notifyMentorTrailsChanged()
  notifyMentorRoutineDraftChanged()
  notifyAppDataChanged()
}

export function loadSettings(): StudySettings {
  return normalizeSettings(
    readJson<Partial<StudySettings>>(STORAGE_KEYS.settings, {}),
  )
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
  const normalized = normalizeRoutine(raw)

  if (normalized?.id === LEGACY_DEFAULT_ROUTINE_ID) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.routine)
    }
    return null
  }

  return normalized
}

export function saveStoredRoutine(routine: Routine): void {
  const normalized = normalizeRoutine(routine)
  if (!normalized) return
  writeJson(STORAGE_KEYS.routine, {
    ...normalized,
    updatedAt: new Date().toISOString(),
  })
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
  return (
    window.localStorage.getItem(STORAGE_KEYS.onboardingCompleted) === "true"
  )
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

export function loadMentorRoutineDraft(): MentorRoutineProposal | null {
  return normalizeMentorRoutineProposal(
    readJson<unknown>(STORAGE_KEYS.mentorRoutineDraft, null),
  )
}

export function saveMentorRoutineDraft(proposal: MentorRoutineProposal): void {
  const normalized = normalizeMentorRoutineProposal(proposal)
  if (!normalized) return

  writeJson(STORAGE_KEYS.mentorRoutineDraft, normalized)
  notifyMentorRoutineDraftChanged()
}

export function clearMentorRoutineDraft(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEYS.mentorRoutineDraft)
  notifyMentorRoutineDraftChanged()
}

export function loadMentorTrails(): StudyTrail[] {
  return normalizeStudyTrails(readJson<unknown>(STORAGE_KEYS.mentorTrails, []))
}

export function saveMentorTrails(trails: StudyTrail[]): void {
  writeJson(STORAGE_KEYS.mentorTrails, normalizeStudyTrails(trails))
  notifyMentorTrailsChanged()
}

export function addMentorTrail(trail: StudyTrail): void {
  const trails = loadMentorTrails()
  saveMentorTrails([trail, ...trails].slice(0, 20))
}

export function clearMentorTrails(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEYS.mentorTrails)
  notifyMentorTrailsChanged()
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
    mentorTrails: StudyTrail[]
    mentorRoutineDraft: MentorRoutineProposal | null
  }
}

function normalizeBackup(raw: unknown): RoutineOSBackup | null {
  if (!isObject(raw)) return null
  if (raw.app !== "RoutineOS") return null
  if (!isObject(raw.data)) return null

  const schemaVersion = normalizeNumber(raw.schemaVersion, 1)
  if (schemaVersion < 1 || schemaVersion > BACKUP_SCHEMA_VERSION) return null

  const data = raw.data

  return {
    app: "RoutineOS",
    schemaVersion,
    exportedAt: normalizeString(raw.exportedAt, new Date().toISOString()),
    data: {
      settings: normalizeSettings(data.settings),
      records: normalizeRecords(data.records),
      routine: data.routine === null ? null : normalizeRoutine(data.routine),
      view: typeof data.view === "string" ? data.view : null,
      theme: isTheme(data.theme) ? data.theme : null,
      onboardingCompleted: data.onboardingCompleted === true,
      mentorChat: normalizeMentorChat(data.mentorChat),
      mentorTrails: normalizeStudyTrails(data.mentorTrails),
      mentorRoutineDraft: normalizeMentorRoutineProposal(
        data.mentorRoutineDraft,
      ),
    },
  }
}

export function createRoutineOSBackup(): RoutineOSBackup {
  const theme =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(STORAGE_KEYS.theme)
  const view =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(STORAGE_KEYS.view)

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
      mentorTrails: loadMentorTrails(),
      mentorRoutineDraft: loadMentorRoutineDraft(),
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
  writeJson(STORAGE_KEYS.mentorTrails, backup.data.mentorTrails)

  if (backup.data.mentorRoutineDraft) {
    writeJson(STORAGE_KEYS.mentorRoutineDraft, backup.data.mentorRoutineDraft)
  } else if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEYS.mentorRoutineDraft)
  }

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
  window.localStorage.removeItem(STORAGE_KEYS.mentorTrails)
  window.localStorage.removeItem(STORAGE_KEYS.mentorRoutineDraft)

  notifyAllDataChanged()
}
