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
  loadMentorTrails,
  loadSettings,
} from "@/lib/storage"
import {
  dateKeyFromParts,
  getCurrentMonthMeta,
  getTodayDateKey,
} from "@/utils/date"
import type {
  MentorContext,
  MentorContextBlock,
  MentorContextDayRoutine,
  MentorContextMonthRecord,
  MentorContextMonthTopic,
  MentorContextTrailResourceSignal,
  StudyTrailTopic,
} from "@/features/mentor/types"
import type { ViewKey } from "@/types/navigation"
import type { Routine } from "@/types/study"
import type { Theme } from "@/types/theme"

const MAX_BLOCKS_PER_DAY = 24
const STUDY_BLOCK_TYPES = ["study", "project", "other"] as const

function minutesFromSeconds(seconds: number): number {
  return Math.round(seconds / 60)
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null

  const theme = window.localStorage.getItem(STORAGE_KEYS.theme)
  return theme === "light" || theme === "dark" ? theme : null
}

function summarizeBlocks(
  routine: Routine,
  dateKey: string,
): MentorContextBlock[] {
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

function summarizeDayRoutine(
  routine: Routine,
  dateKey: string,
): MentorContextDayRoutine {
  const weekday = getWeekdayFromDateKey(dateKey)
  const blocks = summarizeBlocks(routine, dateKey)

  return {
    dateKey,
    weekday,
    weekdayLabel: formatWeekdayName(weekday),
    hasRoutine: blocks.length > 0,
    plannedMinutes: blocks.reduce(
      (total, block) => total + block.durationMinutes,
      0,
    ),
    blocks,
  }
}

function normalizeTopicTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function createTopicId(title: string): string {
  return (
    normalizeTopicTitle(title)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tema"
  )
}

function isStudyBlock(block: MentorContextBlock): boolean {
  return STUDY_BLOCK_TYPES.includes(
    block.type as (typeof STUDY_BLOCK_TYPES)[number],
  )
}

function getMonthDateKeys(year: number, month: number): string[] {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: lastDay }, (_, index) =>
    dateKeyFromParts(year, month, index + 1),
  )
}

function summarizeMonthRoutine(
  routine: Routine,
  year: number,
  month: number,
): MentorContext["monthRoutine"] {
  const dateKeys = getMonthDateKeys(year, month)
  const groupedTopics = new Map<string, MentorContextMonthTopic>()
  let studyBlockCount = 0

  for (const dateKey of dateKeys) {
    const blocks = summarizeBlocks(routine, dateKey).filter(isStudyBlock)

    for (const block of blocks) {
      const title = block.title.trim()
      if (!title) continue

      studyBlockCount += 1
      const id = createTopicId(title)
      const current = groupedTopics.get(id)

      if (current) {
        if (!current.sourceBlocks.includes(title))
          current.sourceBlocks.push(title)
        if (!current.days.includes(dateKey)) current.days.push(dateKey)
        current.occurrenceCount += 1
        current.totalMinutes += block.durationMinutes
      } else {
        groupedTopics.set(id, {
          id,
          title,
          sourceBlocks: [title],
          days: [dateKey],
          occurrenceCount: 1,
          totalMinutes: block.durationMinutes,
        })
      }
    }
  }

  return {
    year,
    month,
    daysAnalyzed: dateKeys.length,
    studyBlockCount,
    topics: Array.from(groupedTopics.values()),
  }
}

function summarizeMonthHistory(
  year: number,
  month: number,
): MentorContextMonthRecord[] {
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

function summarizeTrailResource(
  resource: StudyTrailTopic["resources"][number],
  section: MentorContextTrailResourceSignal["section"],
): MentorContextTrailResourceSignal {
  return {
    id: resource.id,
    title: resource.title,
    provider: resource.provider,
    type: resource.type,
    section,
  }
}

function summarizeStudyTrail(): MentorContext["studyTrail"] {
  const activeTrail = loadMentorTrails()[0]

  if (!activeTrail) {
    return {
      hasTrail: false,
      title: null,
      routineName: null,
      topics: [],
    }
  }

  return {
    hasTrail: true,
    title: activeTrail.title,
    routineName: activeTrail.routineName,
    topics: activeTrail.topics.slice(0, 30).map((topic) => {
      const resources = [
        ...topic.resources.map((resource) => ({
          resource,
          section: "resource" as const,
        })),
        ...(topic.videoResources ?? []).map((resource) => ({
          resource,
          section: "video" as const,
        })),
      ]
      const favoriteIds = new Set(topic.favoriteResourceIds ?? [])
      const studiedIds = new Set(topic.studiedResourceIds ?? [])
      const hiddenIds = new Set(topic.hiddenResourceIds ?? [])

      return {
        id: topic.id,
        title: topic.title,
        focus: topic.selectedFocusLabel ?? null,
        masteryStatus: topic.masteryStatus ?? null,
        favoriteResources: resources
          .filter(({ resource }) => favoriteIds.has(resource.id))
          .map(({ resource, section }) =>
            summarizeTrailResource(resource, section),
          ),
        studiedResources: resources
          .filter(({ resource }) => studiedIds.has(resource.id))
          .map(({ resource, section }) =>
            summarizeTrailResource(resource, section),
          ),
        hiddenResources: resources
          .filter(({ resource }) => hiddenIds.has(resource.id))
          .map(({ resource, section }) =>
            summarizeTrailResource(resource, section),
          ),
        userCourses: (topic.userCourses ?? []).map((course) => ({
          id: course.id,
          title: course.title,
          url: course.url,
          platform: course.platform,
          isFavorite: course.isFavorite === true,
          isCompleted: course.isCompleted === true,
          completedAt: course.completedAt ?? null,
        })),
      }
    }),
  }
}

export function buildMentorContext({
  currentView,
}: {
  currentView: ViewKey
}): MentorContext {
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
    weekRoutine: getCurrentWeekDays(new Date()).map((day) =>
      summarizeDayRoutine(routine, day.dateKey),
    ),
    monthSummary: {
      completedDays: monthStats.completedDays,
      canceledDays: monthHistory.filter(
        (record) => record.status === "canceled",
      ).length,
      missedDays: monthStats.missedDays,
      studiedMinutes: minutesFromSeconds(monthStats.studiedSeconds),
      remainingMinutes: minutesFromSeconds(monthStats.remainingSeconds),
      bonusMinutes: minutesFromSeconds(monthStats.bonusSeconds),
      dailyGoalMinutes: Math.round(settings.dailyGoalHours * 60),
      monthlyGoalMinutes: Math.round(settings.monthlyGoalHours * 60),
    },
    monthHistory,
    monthRoutine: summarizeMonthRoutine(routine, year, month),
    studyTrail: summarizeStudyTrail(),
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
