import { WEEK_DAYS } from "@/constants/routine"
import { getCurrentRoutineBlockIndex as getCurrentBlockIndex } from "@/features/routine/utils/routine-domain"
import { toDateKey } from "@/utils/date"
import type { RoutineBlock, Weekday } from "@/types/study"

export interface WeekDateItem {
  date: Date
  dateKey: string
  weekday: Weekday
  label: string
  short: string
  dayNumber: string
  isToday: boolean
}

export function getDefaultWeekdayKey(date: Date): Weekday {
  const index = date.getDay()
  return WEEK_DAYS[index]?.key ?? WEEK_DAYS[0].key
}

export function getCurrentWeekDays(date: Date = new Date()): WeekDateItem[] {
  const weekStart = new Date(date)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(date.getDate() - date.getDay())

  const todayKey = toDateKey(date)

  return WEEK_DAYS.map((day, index) => {
    const itemDate = new Date(weekStart)
    itemDate.setDate(weekStart.getDate() + index)

    const dateKey = toDateKey(itemDate)

    return {
      date: itemDate,
      dateKey,
      weekday: day.key,
      label: day.label,
      short: day.short,
      dayNumber: String(itemDate.getDate()).padStart(2, "0"),
      isToday: dateKey === todayKey,
    }
  })
}

export function getCurrentRoutineBlockIndex(
  nowMinutes: number | null,
  blocks: RoutineBlock[],
): number {
  return getCurrentBlockIndex(blocks, nowMinutes)
}
