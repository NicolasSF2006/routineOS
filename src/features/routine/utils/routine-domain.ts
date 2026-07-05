import { ALL_WEEK_DAYS, BLOCK_TYPE_META, WEEKDAY_BY_DATE_INDEX } from "@/constants/routine"
import { parseDateKey } from "@/utils/date"
import { timeToMinutes } from "@/utils/time"
import type { Routine, RoutineBlock, RoutineBlockType, Weekday } from "@/types/study"

export function getWeekdayFromDate(date: Date): Weekday {
  return WEEKDAY_BY_DATE_INDEX[date.getDay()]
}

export function getWeekdayFromDateKey(dateKey: string): Weekday {
  return getWeekdayFromDate(parseDateKey(dateKey))
}

export function formatWeekdayName(weekday: Weekday): string {
  return ALL_WEEK_DAYS.find((day) => day.key === weekday)?.label ?? weekday
}

export function formatBlockTypeName(type: RoutineBlockType): string {
  return BLOCK_TYPE_META[type]?.label ?? type
}

export function getRoutineDay(routine: Routine, weekday: Weekday) {
  return routine.days.find((day) => day.weekday === weekday) ?? null
}

export function getRoutineDayBlocks(routine: Routine, weekday: Weekday): RoutineBlock[] {
  const day = getRoutineDay(routine, weekday)
  if (!day?.isActive) return []

  return [...day.blocks].sort((a, b) => a.order - b.order)
}

export function hasRoutineForWeekday(routine: Routine, weekday: Weekday): boolean {
  return getRoutineDayBlocks(routine, weekday).length > 0
}

export function hasRoutineForDateKey(routine: Routine, dateKey: string): boolean {
  return hasRoutineForWeekday(routine, getWeekdayFromDateKey(dateKey))
}

export function findFirstRoutineBlock(routine: Routine, weekday: Weekday): RoutineBlock | null {
  return getRoutineDayBlocks(routine, weekday)[0] ?? null
}

export function findFirstStudyBlock(routine: Routine, weekday: Weekday): RoutineBlock | null {
  return (
    getRoutineDayBlocks(routine, weekday).find((block) =>
      block.type === "study" || block.type === "project",
    ) ?? null
  )
}

export function getOfficialStartTime(routine: Routine, weekday: Weekday): string | null {
  return findFirstRoutineBlock(routine, weekday)?.startTime ?? null
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

