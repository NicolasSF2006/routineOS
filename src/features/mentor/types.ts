import type { ViewKey } from "@/types/navigation"
import type { Theme } from "@/types/theme"
import type { RoutineBlockType, RoutineMode, Weekday } from "@/types/study"

export type MentorMessageRole = "user" | "assistant"

export interface MentorMessage {
  id: string
  role: MentorMessageRole
  content: string
  createdAt: string
}

export interface MentorContextBlock {
  title: string
  type: RoutineBlockType
  startTime: string
  endTime: string
  durationMinutes: number
}

export interface MentorContextDayRoutine {
  dateKey: string
  weekday: Weekday
  weekdayLabel: string
  hasRoutine: boolean
  plannedMinutes: number
  blocks: MentorContextBlock[]
}

export interface MentorContextMonthRecord {
  dateKey: string
  status: "in-progress" | "completed" | "canceled"
  studiedMinutes: number
  completedAt: string | null
  canceledAt: string | null
}

export interface MentorContextMonthTopic {
  id: string
  title: string
  sourceBlocks: string[]
  days: string[]
  occurrenceCount: number
  totalMinutes: number
}

export type StudyTopicMasteryStatus = "starting" | "studying" | "understood" | "review" | "difficulty"

export interface MentorContextTrailResourceSignal {
  id: string
  title: string
  provider: string
  type: StudyResourceType
  section: "resource" | "video"
}

export interface MentorContextTrailUserCourseSignal {
  id: string
  title: string
  url: string
  platform: string
  isFavorite: boolean
  isCompleted: boolean
  completedAt: string | null
}

export interface MentorContextTrailTopicSignal {
  id: string
  title: string
  focus: string | null
  masteryStatus: StudyTopicMasteryStatus | null
  favoriteResources: MentorContextTrailResourceSignal[]
  studiedResources: MentorContextTrailResourceSignal[]
  hiddenResources: MentorContextTrailResourceSignal[]
  userCourses: MentorContextTrailUserCourseSignal[]
}

export interface MentorContextTrailSignal {
  hasTrail: boolean
  title: string | null
  routineName: string | null
  topics: MentorContextTrailTopicSignal[]
}

export interface MentorContext {
  currentView: ViewKey
  today: string
  activeRoutine: {
    name: string
    mode: RoutineMode
    hasCustomRoutine: boolean
  }
  todayRoutine: MentorContextDayRoutine
  weekRoutine: MentorContextDayRoutine[]
  monthSummary: {
    completedDays: number
    canceledDays: number
    missedDays: number
    studiedMinutes: number
    remainingMinutes: number
    bonusMinutes: number
    dailyGoalMinutes: number
    monthlyGoalMinutes: number
  }
  monthHistory: MentorContextMonthRecord[]
  monthRoutine: {
    year: number
    month: number
    daysAnalyzed: number
    studyBlockCount: number
    topics: MentorContextMonthTopic[]
  }
  studyTrail: MentorContextTrailSignal
  settings: {
    routineMode: RoutineMode
    dailyGoalHours: number
    monthlyGoalHours: number
    latenessToleranceMinutes: number
    soundsEnabled: boolean
    hasCustomSounds: boolean
  }
  theme: Theme | null
  onboardingCompleted: boolean
}

export type MentorApiResponseMode = "gemini" | "groq" | "openrouter" | "openai" | "mock"

export interface MentorApiResponse {
  reply: string
  mode: MentorApiResponseMode
}

export type StudyResourceType = "documentacao" | "curso" | "video" | "canal" | "playlist" | "plataforma" | "roadmap" | "pratica"

export type StudyResourceLevel = "iniciante" | "iniciante-intermediario" | "intermediario" | "iniciante-avancado"

export type StudyResourceTopicKey =
  | "algorithms"
  | "backend"
  | "css"
  | "database"
  | "english"
  | "mandarin"
  | "spanish"
  | "frontend"
  | "git"
  | "html"
  | "javascript"
  | "linux"
  | "node"
  | "portuguese"
  | "python"
  | "react"
  | "sql"
  | "typescript"
  | "ux"

export interface FreeStudyResource {
  id: string
  title: string
  url: string
  type: StudyResourceType
  provider: string
  language: "pt-BR" | "en"
  level: StudyResourceLevel
  topics: StudyResourceTopicKey[]
  description: string
}

export interface StudyTopicFocusOption {
  id: string
  label: string
  steps: string[]
  resources: FreeStudyResource[]
  videoResources: FreeStudyResource[]
}

export interface StudyTrailUserCourse {
  id: string
  title: string
  url: string
  platform: string
  createdAt: string
  updatedAt?: string
  isFavorite?: boolean
  isCompleted?: boolean
  completedAt?: string | null
}

export interface StudyTrailTopic {
  id: string
  title: string
  description: string
  sourceBlocks: string[]
  sourceDays?: string[]
  occurrenceCount?: number
  totalMinutes?: number
  resources: FreeStudyResource[]
  videoResources: FreeStudyResource[]
  userCourses?: StudyTrailUserCourse[]
  steps: string[]
  projectSuggestion: string
  isBroad?: boolean
  focusOptions?: StudyTopicFocusOption[]
  selectedFocusId?: string | null
  selectedFocusLabel?: string | null
  hiddenResourceIds?: string[]
  favoriteResourceIds?: string[]
  studiedResourceIds?: string[]
  masteryStatus?: StudyTopicMasteryStatus | null
  masteryUpdatedAt?: string | null
}

export interface StudyTrail {
  id: string
  title: string
  createdAt: string
  routineName: string
  summary: string
  topics: StudyTrailTopic[]
  mentorNotes: string
  providerMode: MentorApiResponseMode
  routineSignature?: string
}

export interface StudyTrailApiResponse {
  trail: StudyTrail
  reply: string
  mode: MentorApiResponseMode
}
