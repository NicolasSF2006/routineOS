import { WEEK_DAYS } from "@/constants/routine"
import { getCurrentRoutineBlockIndex as getCurrentBlockIndex } from "@/features/routine/utils/routine-domain"
import type { RoutineBlock, Weekday } from "@/types/study"

export function getDefaultWeekdayKey(date: Date): Weekday {
  const index = Math.min(date.getDay() - 1, WEEK_DAYS.length - 1)
  return WEEK_DAYS[index]?.key ?? WEEK_DAYS[0].key
}

export function getCurrentRoutineBlockIndex(
  nowMinutes: number | null,
  blocks: RoutineBlock[],
): number {
  return getCurrentBlockIndex(blocks, nowMinutes)
}
