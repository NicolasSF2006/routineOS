import { STORAGE_KEYS } from "@/constants/storage"
import {
  formatWeekdayName,
  getRoutineDayBlocksForDateKey,
  getWeekdayFromDateKey,
} from "@/features/routine/utils/routine-domain"
import { getCurrentWeekDays } from "@/features/routine/utils/routine-schedule"
import { computeMonthStats } from "@/features/study-session/utils/study-session"
import {
  getActiveRoutine,
  getStoredRoutine,
  hasCompletedOnboarding,
  loadAllRecords,
  loadSettings,
} from "@/lib/storage"
import { getCurrentMonthMeta, getTodayDateKey } from "@/utils/date"
import type {
  MentorContext,
  MentorContextBlock,
  MentorContextDayRoutine,
  MentorContextMonthRecord,
} from "@/features/mentor/types"
import type { ViewKey } from "@/types/navigation"
import type { Routine } from "@/types/study"
import type { Theme } from "@/types/theme"

const MAX_BLOCKS_PER_DAY = 24

function minutesFromSeconds(seconds: number): number {
  return Math.round(seconds / 60)
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null

  const theme = window.localStorage.getItem(STORAGE_KEYS.theme)
  return theme === "light" || theme === "dark" ? theme : null
}

function summarizeBlocks(routine: Routine, dateKey: string): MentorContextBlock[] {
  return getRoutineDayBlocksForDateKey(routine, dateKey)
    .slice(0, MAX_BLOCKS_PER_DAY)
    .map((block) => ({
      title: block.title,
      type: block.type,
      startTime: block.startTime,
      endTime: block.endTime,
      durationMinutes: block.durationMinutes,
    }))
}

function summarizeDayRoutine(routine: Routine, dateKey: string): MentorContextDayRoutine {
  const weekday = getWeekdayFromDateKey(dateKey)
  const blocks = summarizeBlocks(routine, dateKey)

  return {
    dateKey,
    weekday,
    weekdayLabel: formatWeekdayName(weekday),
    hasRoutine: blocks.length > 0,
    plannedMinutes: blocks.reduce((total, block) => total + block.durationMinutes, 0),
    blocks,
  }
}

function summarizeMonthHistory(year: number, month: number): MentorContextMonthRecord[] {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`
  const records = loadAllRecords()

  return Object.values(records)
    .filter((record) => record.dateKey.startsWith(monthPrefix))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((record) => ({
      dateKey: record.dateKey,
      status: record.status,
      studiedMinutes: minutesFromSeconds(record.activeSeconds),
      completedAt: record.completedAt,
      canceledAt: record.canceledAt,
    }))
}

export function buildMentorContext({ currentView }: { currentView: ViewKey }): MentorContext {
  const today = getTodayDateKey()
  const routine = getActiveRoutine()
  const settings = loadSettings()
  const records = loadAllRecords()
  const { year, month } = getCurrentMonthMeta()
  const monthStats = computeMonthStats(year, month, settings, records, routine)
  const monthHistory = summarizeMonthHistory(year, month)

  return {
    currentView,
    today,
    activeRoutine: {
      name: routine.name,
      mode: routine.mode,
      hasCustomRoutine: Boolean(getStoredRoutine()),
    },
    todayRoutine: summarizeDayRoutine(routine, today),
    weekRoutine: getCurrentWeekDays(new Date()).map((day) => summarizeDayRoutine(routine, day.dateKey)),
    monthSummary: {
      completedDays: monthStats.completedDays,
      canceledDays: monthHistory.filter((record) => record.status === "canceled").length,
      missedDays: monthStats.missedDays,
      studiedMinutes: minutesFromSeconds(monthStats.studiedSeconds),
      remainingMinutes: minutesFromSeconds(monthStats.remainingSeconds),
      bonusMinutes: minutesFromSeconds(monthStats.bonusSeconds),
      dailyGoalMinutes: Math.round(settings.dailyGoalHours * 60),
      monthlyGoalMinutes: Math.round(settings.monthlyGoalHours * 60),
    },
    monthHistory,
    settings: {
      routineMode: settings.routineMode,
      dailyGoalHours: settings.dailyGoalHours,
      monthlyGoalHours: settings.monthlyGoalHours,
      latenessToleranceMinutes: settings.latenessToleranceMinutes,
      soundsEnabled: settings.soundsEnabled !== false,
      hasCustomSounds: settings.customSounds.length > 0,
    },
    theme: getStoredTheme(),
    onboardingCompleted: hasCompletedOnboarding(),
  }
}
