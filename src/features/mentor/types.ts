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

export interface MentorApiResponse {
  reply: string
  mode: "openai" | "mock"
}
