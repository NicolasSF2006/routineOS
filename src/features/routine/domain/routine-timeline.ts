import type { RoutineBlock, RoutineWeek, Weekday } from "@/types/study"

export const FULL_DAY_START_MINUTES = 0
export const FULL_DAY_END_MINUTES = 24 * 60

/** Converte um horário estrito de 24 horas em minutos desde 00:00. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

/** Formata minutos no relógio de 24 horas, preservando o comportamento circular do construtor. */
export function formatTimelineTime(minutes: number): string {
  const normalizedMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(normalizedMinutes / 60) % 24
  const remainingMinutes = normalizedMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

export function clampTimelineMinutes(
  minutes: number,
  minimum = FULL_DAY_START_MINUTES,
  maximum = FULL_DAY_END_MINUTES - 1,
): number {
  return Math.min(maximum, Math.max(minimum, minutes))
}

export function snapMinutesToStep(
  minutes: number,
  stepMinutes: number,
): number {
  if (stepMinutes <= 1) return Math.round(minutes)
  return Math.round(minutes / stepMinutes) * stepMinutes
}

export function getBlockStartMinutes(
  block: RoutineBlock,
  fallbackStartMinutes: number,
): number {
  return parseTimeToMinutes(block.startTime) ?? fallbackStartMinutes
}

export function getBlockEndMinutes(
  block: RoutineBlock,
  fallbackStartMinutes: number,
): number {
  return (
    parseTimeToMinutes(block.endTime) ??
    getBlockStartMinutes(block, fallbackStartMinutes) + block.durationMinutes
  )
}

export function setBlockStartTime(
  block: RoutineBlock,
  startMinutes: number,
): RoutineBlock {
  const normalizedStartMinutes = clampTimelineMinutes(Math.round(startMinutes))
  const durationMinutes = Math.max(1, Math.floor(block.durationMinutes || 1))

  return {
    ...block,
    durationMinutes,
    startTime: formatTimelineTime(normalizedStartMinutes),
    endTime: formatTimelineTime(normalizedStartMinutes + durationMinutes),
  }
}

export function sortRoutineDayBlocksByTime(
  blocks: RoutineBlock[],
  fallbackStartMinutes: number,
): RoutineBlock[] {
  return blocks
    .map((block, originalIndex) => ({ block, originalIndex }))
    .sort((first, second) => {
      const timeDifference =
        getBlockStartMinutes(first.block, fallbackStartMinutes) -
        getBlockStartMinutes(second.block, fallbackStartMinutes)

      if (timeDifference !== 0) return timeDifference

      const orderDifference =
        (first.block.order ?? first.originalIndex + 1) -
        (second.block.order ?? second.originalIndex + 1)
      return orderDifference !== 0
        ? orderDifference
        : first.originalIndex - second.originalIndex
    })
    .map(({ block }, index) => ({
      ...setBlockStartTime(
        block,
        getBlockStartMinutes(block, fallbackStartMinutes),
      ),
      order: index + 1,
    }))
}

export function getConflictingBlockIds(
  week: RoutineWeek,
  fallbackStartMinutes: number,
): Set<string> {
  const conflictingBlockIds = new Set<string>()

  for (const day of week.days) {
    const blocks = [...day.blocks].sort(
      (first, second) =>
        getBlockStartMinutes(first, fallbackStartMinutes) -
        getBlockStartMinutes(second, fallbackStartMinutes),
    )

    blocks.forEach((currentBlock, currentIndex) => {
      const currentStart = getBlockStartMinutes(
        currentBlock,
        fallbackStartMinutes,
      )
      const currentEnd = getBlockEndMinutes(currentBlock, fallbackStartMinutes)

      for (const nextBlock of blocks.slice(currentIndex + 1)) {
        const nextStart = getBlockStartMinutes(nextBlock, fallbackStartMinutes)
        const nextEnd = getBlockEndMinutes(nextBlock, fallbackStartMinutes)

        if (currentStart < nextEnd && nextStart < currentEnd) {
          conflictingBlockIds.add(currentBlock.id)
          conflictingBlockIds.add(nextBlock.id)
        }
      }
    })
  }

  return conflictingBlockIds
}

export function getConflictWeekdays(
  week: RoutineWeek,
  fallbackStartMinutes: number,
): Weekday[] {
  return week.days
    .filter(
      (day) =>
        getConflictingBlockIds({ ...week, days: [day] }, fallbackStartMinutes)
          .size > 0,
    )
    .map((day) => day.weekday)
}
