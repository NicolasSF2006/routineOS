import { ALL_WEEK_DAYS, BLOCK_TYPE_META, WEEKDAY_BY_DATE_INDEX } from "@/constants/routine"
import { parseDateKey, toDateKey } from "@/utils/date"
import { timeToMinutes } from "@/utils/time"
import type { Routine, RoutineBlock, RoutineBlockType, RoutineDay, RoutineWeek, Weekday } from "@/types/study"

export function getWeekdayFromDate(date: Date): Weekday {
  return WEEKDAY_BY_DATE_INDEX[date.getDay()]
}

export function getWeekdayFromDateKey(dateKey: string): Weekday {
  return getWeekdayFromDate(parseDateKey(dateKey))
}

export function getWeekStartDate(date: Date): Date {
  const weekStart = new Date(date)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(date.getDate() - date.getDay())
  return weekStart
}

export function getWeekStartDateKey(dateKey: string): string {
  return toDateKey(getWeekStartDate(parseDateKey(dateKey)))
}

export function formatWeekdayName(weekday: Weekday): string {
  return ALL_WEEK_DAYS.find((day) => day.key === weekday)?.label ?? weekday
}

export function formatBlockTypeName(type: RoutineBlockType): string {
  return BLOCK_TYPE_META[type]?.label ?? type
}

function sortBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order)
}

export function getRoutineDay(routine: Routine, weekday: Weekday): RoutineDay | null {
  return routine.days.find((day) => day.weekday === weekday) ?? null
}

export function getRoutineWeek(routine: Routine, dateKey: string): RoutineWeek | null {
  const weekStartDate = getWeekStartDateKey(dateKey)
  return routine.weeks?.find((week) => week.weekStartDate === weekStartDate) ?? null
}

export function getRoutineDayForDateKey(routine: Routine, dateKey: string): RoutineDay | null {
  const weekday = getWeekdayFromDateKey(dateKey)
  const week = getRoutineWeek(routine, dateKey)
  return week?.days.find((day) => day.weekday === weekday) ?? getRoutineDay(routine, weekday)
}

export function getRoutineDayBlocks(routine: Routine, weekday: Weekday): RoutineBlock[] {
  const day = getRoutineDay(routine, weekday)
  if (!day?.isActive) return []
  return sortBlocks(day.blocks)
}

export function getRoutineDayBlocksForDateKey(routine: Routine, dateKey: string): RoutineBlock[] {
  const day = getRoutineDayForDateKey(routine, dateKey)
  if (!day?.isActive) return []
  return sortBlocks(day.blocks)
}

export function hasRoutineForWeekday(routine: Routine, weekday: Weekday): boolean {
  return getRoutineDayBlocks(routine, weekday).length > 0
}

export function hasRoutineForDateKey(routine: Routine, dateKey: string): boolean {
  return getRoutineDayBlocksForDateKey(routine, dateKey).length > 0
}

export function findFirstRoutineBlock(routine: Routine, weekday: Weekday): RoutineBlock | null {
  return getRoutineDayBlocks(routine, weekday)[0] ?? null
}

export function findFirstRoutineBlockForDateKey(routine: Routine, dateKey: string): RoutineBlock | null {
  return getRoutineDayBlocksForDateKey(routine, dateKey)[0] ?? null
}

export function findFirstStudyBlock(routine: Routine, weekday: Weekday): RoutineBlock | null {
  return (
    getRoutineDayBlocks(routine, weekday).find((block) =>
      block.type === "study" || block.type === "project" || block.type === "other",
    ) ?? null
  )
}

export function getOfficialStartTime(routine: Routine, weekday: Weekday): string | null {
  return findFirstRoutineBlock(routine, weekday)?.startTime ?? null
}

export function getOfficialStartTimeForDateKey(routine: Routine, dateKey: string): string | null {
  return findFirstRoutineBlockForDateKey(routine, dateKey)?.startTime ?? null
}

export function getCurrentRoutineBlockIndex(
  blocks: RoutineBlock[],
  nowMinutes: number | null,
): number {
  if (nowMinutes === null) return -1

  return blocks.findIndex(
    (block) =>
      nowMinutes >= timeToMinutes(block.startTime) && nowMinutes < timeToMinutes(block.endTime),
  )
}
