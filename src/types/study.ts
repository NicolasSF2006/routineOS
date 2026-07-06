import type { Theme } from "@/types/theme"

export interface Subject {
  id: string
  name: string
  description?: string
  category?: string
  color?: string
  icon?: string
  isActive: boolean
}

export type RoutineMode = "no-work" | "working" | "vacation"

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type RoutineBlockType = "study" | "short-break" | "long-break" | "lunch" | "project" | "other"

export interface RoutineBlock {
  id: string
  type: RoutineBlockType
  subjectId?: string
  title: string
  startTime: string
  endTime: string
  durationMinutes: number
  order: number
}

export interface RoutineDay {
  id: string
  weekday: Weekday
  blocks: RoutineBlock[]
  isActive: boolean
}

export interface RoutineWeek {
  id: string
  weekStartDate: string
  days: RoutineDay[]
}

export interface Routine {
  id: string
  name: string
  mode: RoutineMode
  days: RoutineDay[]
  weeks?: RoutineWeek[]
  createdAt: string
  updatedAt: string
}

export interface BlockTypeMeta {
  label: string
  dot: string
  badge: string
}

export interface WeekDay {
  key: Weekday
  label: string
  short: string
}

export type DayStatus =
  | "rotina-prevista"
  | "falta"
  | "cancelado"
  | "atrasado"
  | "adiantado"
  | "correto"
  | "com-pausas"
  | "acima-meta"
  | "sem-rotina"

export interface StatusMeta {
  label: string
  description: string
  cell: string
  swatch: string
}

export type SoundEventKey = "shortBreak" | "longBreak" | "lunch" | "subjectChange"

export interface CustomSound {
  id: string
  name: string
  dataUrl: string
  mimeType: string
  sizeBytes: number
  durationSeconds: number
  createdAt: string
}

export interface SoundPreference {
  audioId: "default" | string
  startSeconds: number
  endSeconds: number | null
}

export type SoundPreferences = Record<SoundEventKey, SoundPreference>

export interface StudySettings {
  // Campos legados mantidos para compatibilidade com dados antigos do localStorage.
  soundsEnabled?: boolean
  soundShortBreak?: boolean
  soundLongBreak?: boolean
  soundLunch?: boolean
  soundSubjectChange?: boolean
  routineMode: RoutineMode
  dailyGoalHours: number
  monthlyGoalHours: number
  latenessToleranceMinutes: number
  theme?: Theme
  customSounds: CustomSound[]
  soundPreferences: SoundPreferences
}

export type StudySessionStatus = "in-progress" | "completed" | "canceled"
export type DayRecordStatus = StudySessionStatus

export interface StudyPause {
  startedAt: string
  endedAt: string | null
  durationSeconds: number
}

export interface StudySession {
  dateKey: string
  presenceAt: string | null
  studyStartedAt: string | null
  activeSeconds: number
  pauseSeconds: number
  routineBreakSeconds: number
  bonusSeconds: number
  status: DayRecordStatus
  pauses: StudyPause[]
  completedAt: string | null
  canceledAt: string | null
  resumedAt: string | null
  updatedAt: string
  activeSegmentStartedAt: string | null
  routineBreakSegmentStartedAt: string | null
  routineBlockIndex: number
  routineBlockElapsedSeconds: number
  awaitingNextBlock: boolean
}

export type DailyStudyRecord = StudySession
export type WeekDayKey = Weekday
export type BlockType = RoutineBlockType

export interface DayDetail {
  dateKey: string
  day: number
  status: DayStatus
  statusReason: string
  presence: string | null
  studyStart: string | null
  studied: string | null
  paused: string | null
  breaks: number
  pauseList: { start: string; end: string; duration: string }[]
  bonus: string | null
  canceledAt: string | null
  resumedAt: string | null
}

export interface MonthStats {
  monthlyGoalSeconds: number
  studiedSeconds: number
  remainingSeconds: number
  bonusSeconds: number
  completedDays: number
  missedDays: number
}

export type ControlState =
  | "inicial"
  | "presente"
  | "estudando"
  | "pausado"
  | "aguardando"
  | "cancelado"
  | "concluido"
