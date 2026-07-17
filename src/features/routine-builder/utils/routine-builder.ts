import { DEFAULT_ROUTINE, WEEK_DAYS } from "@/constants/routine"
import { getWeekStartDateKey } from "@/features/routine/utils/routine-domain"
import { parseDateKey, toDateKey } from "@/utils/date"
import type {
  Routine,
  RoutineBlock,
  RoutineBlockType,
  RoutineDay,
  RoutineWeek,
  Weekday,
} from "@/types/study"

export const BUILDER_BLOCK_OPTIONS: {
  type: RoutineBlockType
  label: string
  description: string
  defaultTitle: string
  defaultDurationMinutes: number
  className: string
}[] = [
  {
    type: "study",
    label: "Tarefa",
    description: "Bloco de estudo ativo",
    defaultTitle: "Nova tarefa",
    defaultDurationMinutes: 50,
    className: "border-chart-1/30 bg-chart-1/15 text-chart-1",
  },
  {
    type: "short-break",
    label: "Pausa curta",
    description: "Descanso rápido",
    defaultTitle: "Pausa",
    defaultDurationMinutes: 5,
    className: "border-chart-2/30 bg-chart-2/15 text-chart-2",
  },
  {
    type: "long-break",
    label: "Pausa longa",
    description: "Descanso maior",
    defaultTitle: "Pausa longa",
    defaultDurationMinutes: 15,
    className: "border-chart-3/30 bg-chart-3/15 text-chart-3",
  },
  {
    type: "lunch",
    label: "Almoço",
    description: "Intervalo principal",
    defaultTitle: "Almoço",
    defaultDurationMinutes: 60,
    className: "border-chart-4/30 bg-chart-4/15 text-chart-4",
  },
  {
    type: "project",
    label: "Projeto",
    description: "Aplicação prática",
    defaultTitle: "Novo projeto",
    defaultDurationMinutes: 80,
    className: "border-chart-5/30 bg-chart-5/15 text-chart-5",
  },
  {
    type: "other",
    label: "Outro",
    description: "Atividade personalizada",
    defaultTitle: "Outro",
    defaultDurationMinutes: 50,
    className: "border-border bg-muted text-muted-foreground",
  },
]

export function getBuilderBlockOption(type: RoutineBlockType) {
  return (
    BUILDER_BLOCK_OPTIONS.find((option) => option.type === type) ??
    BUILDER_BLOCK_OPTIONS[0]
  )
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(":").map(Number)
  const total = Math.max(0, hours * 60 + mins + minutes)
  const nextHours = Math.floor(total / 60) % 24
  const nextMinutes = total % 60
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}

export function getRoutineStartTime(routine: Routine): string {
  const firstBlock = routine.days
    .flatMap((day) => day.blocks)
    .sort((a, b) => a.order - b.order)[0]

  return (
    firstBlock?.startTime ??
    DEFAULT_ROUTINE.days.flatMap((day) => day.blocks)[0]?.startTime ??
    "10:30"
  )
}

export function recalculateRoutineDayBlocks(
  blocks: RoutineBlock[],
  startTime: string,
): RoutineBlock[] {
  let cursor = startTime

  return blocks.map((block, index) => {
    const durationMinutes = Math.max(1, Math.floor(block.durationMinutes || 1))
    const endTime = addMinutesToTime(cursor, durationMinutes)
    const nextBlock = {
      ...block,
      startTime: cursor,
      endTime,
      durationMinutes,
      order: index + 1,
    }
    cursor = endTime
    return nextBlock
  })
}

function createEmptyRoutineDay(
  weekday: Weekday,
  weekStartDate: string,
): RoutineDay {
  return {
    id: `${weekStartDate}-${weekday}`,
    weekday,
    blocks: [],
    isActive: false,
  }
}

export function createRoutineWeekFromDate(
  dateKey: string,
  routine: Routine,
): RoutineWeek {
  const weekStartDate = getWeekStartDateKey(dateKey)
  const existingWeek = routine.weeks?.find(
    (week) => week.weekStartDate === weekStartDate,
  )

  if (existingWeek) {
    return cloneRoutineWeek(existingWeek)
  }

  return {
    id: `week-${weekStartDate}`,
    weekStartDate,
    days: WEEK_DAYS.map((day) => {
      const fallbackDay = routine.days.find(
        (routineDay) => routineDay.weekday === day.key,
      )
      return fallbackDay
        ? {
            ...fallbackDay,
            id: `${weekStartDate}-${day.key}`,
            blocks: fallbackDay.blocks.map((block) => ({
              ...block,
              id: `${weekStartDate}-${day.key}-${block.order}`,
            })),
          }
        : createEmptyRoutineDay(day.key, weekStartDate)
    }),
  }
}

export function cloneRoutineWeek(week: RoutineWeek): RoutineWeek {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      blocks: day.blocks.map((block) => ({ ...block })),
    })),
  }
}

export function getRoutineWeekDay(
  week: RoutineWeek,
  weekday: Weekday,
): RoutineDay {
  return (
    week.days.find((day) => day.weekday === weekday) ??
    createEmptyRoutineDay(weekday, week.weekStartDate)
  )
}

export function updateRoutineWeekDay(
  week: RoutineWeek,
  weekday: Weekday,
  updater: (day: RoutineDay) => RoutineDay,
): RoutineWeek {
  const exists = week.days.some((day) => day.weekday === weekday)
  const days = exists
    ? week.days.map((day) => (day.weekday === weekday ? updater(day) : day))
    : [
        ...week.days,
        updater(createEmptyRoutineDay(weekday, week.weekStartDate)),
      ]

  return { ...week, days }
}

export function upsertRoutineWeek(
  routine: Routine,
  week: RoutineWeek,
): Routine {
  const weeks = routine.weeks ?? []
  const nextWeeks = weeks.some(
    (item) => item.weekStartDate === week.weekStartDate,
  )
    ? weeks.map((item) =>
        item.weekStartDate === week.weekStartDate ? week : item,
      )
    : [...weeks, week]

  return {
    ...routine,
    id: routine.id === DEFAULT_ROUTINE.id ? "custom-routine" : routine.id,
    name:
      routine.name === DEFAULT_ROUTINE.name
        ? "Rotina personalizada"
        : routine.name,
    weeks: nextWeeks.sort((a, b) =>
      a.weekStartDate.localeCompare(b.weekStartDate),
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function getVisibleMonthWeekStartKeys(
  year: number,
  month: number,
): string[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstWeekStart = parseDateKey(getWeekStartDateKey(toDateKey(firstDay)))
  const lastWeekStartKey = getWeekStartDateKey(toDateKey(lastDay))
  const keys: string[] = []
  const cursor = firstWeekStart

  while (toDateKey(cursor) <= lastWeekStartKey) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return keys
}

export function cloneWeekForStartDate(
  week: RoutineWeek,
  weekStartDate: string,
): RoutineWeek {
  return {
    id: `week-${weekStartDate}`,
    weekStartDate,
    days: week.days.map((day) => ({
      ...day,
      id: `${weekStartDate}-${day.weekday}`,
      blocks: day.blocks.map((block, index) => ({
        ...block,
        id: `${weekStartDate}-${day.weekday}-${index + 1}`,
        order: index + 1,
      })),
    })),
  }
}

export function repeatWeekForMonth(
  routine: Routine,
  sourceWeek: RoutineWeek,
  year: number,
  month: number,
): Routine {
  const weekStartKeys = getVisibleMonthWeekStartKeys(year, month)
  return weekStartKeys.reduce(
    (nextRoutine, weekStartDate) =>
      upsertRoutineWeek(
        nextRoutine,
        cloneWeekForStartDate(sourceWeek, weekStartDate),
      ),
    routine,
  )
}
