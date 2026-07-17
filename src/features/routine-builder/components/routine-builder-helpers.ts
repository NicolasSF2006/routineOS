import type { DragEvent } from "react"
import { WEEK_DAYS } from "@/constants/routine"
import {
  FULL_DAY_END_MINUTES,
  FULL_DAY_START_MINUTES,
  clampTimelineMinutes as clampMinutes,
  getBlockStartMinutes,
} from "@/features/routine/domain/routine-timeline"
import { getWeekdayFromDateKey } from "@/features/routine/utils/routine-domain"
import {
  createId,
  getBuilderBlockOption,
} from "@/features/routine-builder/utils/routine-builder"
import { getTodayDateKey, parseDateKey, toDateKey } from "@/utils/date"
import type { RoutineBlock, RoutineBlockType, Weekday } from "@/types/study"

export type EditingMode = "create" | "edit"
export type EditingRepeatMode =
  "none" | "week-daily" | "month-daily" | "month-weekday" | "year-weekday"

export interface EditingState {
  mode: EditingMode
  weekday: Weekday
  type: RoutineBlockType
  title: string
  description: string
  durationMinutes: number
  startTime: string
  repeatMode: EditingRepeatMode
  blockId?: string
}

export const DND_MIME_TYPE = "application/routineos-routine-block"

export type DragPayload =
  | { kind: "palette"; blockType: RoutineBlockType }
  | { kind: "block"; sourceWeekday: Weekday; blockId: string }

export interface DragPreviewState {
  weekday: Weekday
  minutes: number
  x: number
  y: number
  snapped?: boolean
}

export interface DeleteConfirmationState {
  blockId: string
  weekday: Weekday
  title: string
  repeatSourceId?: string
}

export interface RoutineToastState {
  id: string
  message: string
}

export type MobileSwipeIntent = "pending" | "horizontal" | "vertical"

export function clearTimeoutRef(ref: { current: number | null }) {
  if (ref.current !== null) window.clearTimeout(ref.current)
}

export function cancelAnimationFrameRef(ref: { current: number | null }) {
  if (ref.current !== null) window.cancelAnimationFrame(ref.current)
}

export function runCleanupRef(ref: { current: (() => void) | null }) {
  ref.current?.()
}

export interface MobileSwipeState {
  x: number
  y: number
  pointerId: number
  intent: MobileSwipeIntent
  deltaX: number
}

export interface MobileBlockPickerDragState {
  y: number
  pointerId: number
  deltaY: number
  isDragging: boolean
}

export interface MobilePaletteDragState {
  blockType: RoutineBlockType
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
}

export interface MobileRoutineBlockDragState {
  block: RoutineBlock
  weekday: Weekday
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  pointerOffsetY: number
  blockHeight: number
  isDragging: boolean
}

export interface MobilePaletteDragPreviewState {
  blockType: RoutineBlockType
  x: number
  y: number
  minutes: number | null
  snapped: boolean
  isOverTimeline: boolean
}

export interface MobileRoutineBlockDragPreviewState {
  block: RoutineBlock
  x: number
  y: number
  minutes: number | null
  snapped: boolean
  isOverTimeline: boolean
  height: number
}

export const MOBILE_BLOCK_PICKER_TRANSITION_MS = 220
export const MOBILE_BLOCK_PICKER_CLOSE_THRESHOLD_PX = 90
export const MOBILE_PALETTE_LONG_PRESS_MS = 260
export const MOBILE_PALETTE_LONG_PRESS_CANCEL_DISTANCE_PX = 14
export const MOBILE_PALETTE_DROP_STEP_MINUTES = 1
export const MOBILE_PALETTE_PREVIEW_Y_OFFSET_PX = 18
export const MOBILE_PALETTE_PREVIEW_FALLBACK_HEIGHT_PX = 72
export const MOBILE_ROUTINE_BLOCK_LONG_PRESS_MS = 240
export const MOBILE_ROUTINE_BLOCK_LONG_PRESS_CANCEL_DISTANCE_PX = 12

export function readDragPayload(
  event: DragEvent<HTMLElement>,
): DragPayload | null {
  const rawPayload =
    event.dataTransfer.getData(DND_MIME_TYPE) ||
    event.dataTransfer.getData("text/plain")

  if (!rawPayload) return null

  try {
    const parsedPayload = JSON.parse(rawPayload) as DragPayload

    if (parsedPayload.kind === "palette" || parsedPayload.kind === "block") {
      return parsedPayload
    }
  } catch {
    return null
  }

  return null
}

export function buildWeekDays(baseDate: Date) {
  const weekStart = new Date(baseDate)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(baseDate.getDate() - baseDate.getDay())
  const todayKey = getTodayDateKey()

  return WEEK_DAYS.map((day, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const dateKey = toDateKey(date)
    return {
      ...day,
      date,
      dateKey,
      dayNumber: String(date.getDate()).padStart(2, "0"),
      isToday: dateKey === todayKey,
    }
  })
}

export function getDateKeyOffset(dateKey: string, offsetDays: number): string {
  const date = parseDateKey(dateKey)

  date.setDate(date.getDate() + offsetDays)

  return toDateKey(date)
}

export function getEditingDefaults(type: RoutineBlockType) {
  const option = getBuilderBlockOption(type)

  const defaults: Partial<
    Record<RoutineBlockType, { title: string; durationMinutes: number }>
  > = {
    study: {
      title: "Nova tarefa",
      durationMinutes: 50,
    },
    "short-break": {
      title: "Pausa",
      durationMinutes: 5,
    },
    "long-break": {
      title: "Pausa longa",
      durationMinutes: 15,
    },
    lunch: {
      title: "Almoço",
      durationMinutes: 60,
    },
    project: {
      title: "Novo projeto",
      durationMinutes: 80,
    },
    other: {
      title: "Outro",
      durationMinutes: 50,
    },
  }

  return {
    title: defaults[type]?.title ?? option.defaultTitle,
    durationMinutes:
      defaults[type]?.durationMinutes ?? option.defaultDurationMinutes,
  }
}

export function createBlockFromEditing(editing: EditingState): RoutineBlock {
  return {
    id: createId(`block-${editing.weekday}`),
    type: editing.type,
    title:
      editing.title.trim() || getBuilderBlockOption(editing.type).defaultTitle,
    description: editing.description.trim() || undefined,
    durationMinutes: Math.max(1, Math.floor(editing.durationMinutes || 1)),
    startTime: editing.startTime,
    endTime: editing.startTime,
    order: 1,
  }
}

export function getWeekdayIndex(weekday: Weekday): number {
  return Math.max(
    0,
    WEEK_DAYS.findIndex((day) => day.key === weekday),
  )
}

export function getDateKeyForWeekdayInWeek(
  weekStartDate: string,
  weekday: Weekday,
): string {
  const date = parseDateKey(weekStartDate)
  date.setDate(date.getDate() + getWeekdayIndex(weekday))
  return toDateKey(date)
}

export function getWeekdayRepeatName(weekday: Weekday): string {
  const labels: Record<Weekday, string> = {
    sunday: "domingo",
    monday: "segunda-feira",
    tuesday: "terça-feira",
    wednesday: "quarta-feira",
    thursday: "quinta-feira",
    friday: "sexta-feira",
    saturday: "sábado",
  }

  return labels[weekday]
}

export function getWeekdayRepeatPrefix(weekday: Weekday): string {
  const prefix =
    weekday === "sunday" || weekday === "saturday" ? "Todo" : "Toda"
  return `${prefix} ${getWeekdayRepeatName(weekday)}`
}

export function getMonthDateKeys(year: number, month: number): string[] {
  const keys: string[] = []
  const cursor = new Date(year, month, 1)

  while (cursor.getMonth() === month) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

export function getYearWeekdayDateKeys(
  startDateKey: string,
  weekday: Weekday,
): string[] {
  const startDate = parseDateKey(startDateKey)
  const cursor = new Date(startDate)
  const endDate = new Date(startDate.getFullYear(), 11, 31)

  while (getWeekdayFromDateKey(toDateKey(cursor)) !== weekday) {
    cursor.setDate(cursor.getDate() + 1)
  }

  const keys: string[] = []

  while (cursor <= endDate) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return keys
}

export const HOUR_ROW_HEIGHT = 144
export const SNAP_THRESHOLD_MINUTES = 5
export const TIMELINE_HEADER_HEIGHT = 64
export const TIMELINE_VERTICAL_PADDING = 42
export const MIN_VISIBLE_BLOCK_HEIGHT = 20
export const VISUAL_BLOCK_GAP = 8
export const INITIAL_SCROLL_OFFSET_MINUTES = 60

export interface RoutineBlockLayout {
  block: RoutineBlock
  top: number
  height: number
}

export function getTimelineMinutesFromPointer(
  clientY: number,
  laneElement: HTMLElement,
  timelineStartMinutes: number,
  timelineEndMinutes: number,
): number {
  const laneRect = laneElement.getBoundingClientRect()
  const pointerY = clientY - laneRect.top - TIMELINE_VERTICAL_PADDING
  const minutesFromTop = Math.round((pointerY / HOUR_ROW_HEIGHT) * 60)

  return clampMinutes(
    timelineStartMinutes + minutesFromTop,
    timelineStartMinutes,
    timelineEndMinutes - 1,
  )
}

export function getTimelineRange() {
  return {
    startMinutes: FULL_DAY_START_MINUTES,
    endMinutes: FULL_DAY_END_MINUTES,
  }
}

export function getTimeSlots(
  startMinutes: number,
  endMinutes: number,
): number[] {
  const slots: number[] = []

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    slots.push(minutes)
  }

  return slots
}

export function minutesToPixels(minutes: number): number {
  return (minutes / 60) * HOUR_ROW_HEIGHT
}

export function minutesToTimelineTop(
  minutes: number,
  timelineStartMinutes: number,
): number {
  return (
    TIMELINE_VERTICAL_PADDING + minutesToPixels(minutes - timelineStartMinutes)
  )
}

export function getDayBlockLayouts(
  blocks: RoutineBlock[],
  timelineStartMinutes: number,
  fallbackStartMinutes: number,
): RoutineBlockLayout[] {
  let previousBottom = TIMELINE_VERTICAL_PADDING - VISUAL_BLOCK_GAP

  return [...blocks]
    .sort(
      (a, b) =>
        getBlockStartMinutes(a, fallbackStartMinutes) -
        getBlockStartMinutes(b, fallbackStartMinutes),
    )
    .map((block) => {
      const blockStart = getBlockStartMinutes(block, fallbackStartMinutes)
      const naturalTop = Math.max(
        TIMELINE_VERTICAL_PADDING,
        minutesToTimelineTop(blockStart, timelineStartMinutes),
      )
      const top = Math.max(naturalTop, previousBottom + VISUAL_BLOCK_GAP)
      const rawHeight = minutesToPixels(Math.max(1, block.durationMinutes))
      const height = Math.max(MIN_VISIBLE_BLOCK_HEIGHT, rawHeight)

      previousBottom = top + height

      return { block, top, height }
    })
}

export function formatConflictMessage(weekdays: Weekday[]): string | null {
  if (weekdays.length === 0) return null

  const labels = weekdays.map((weekday) => getWeekdayRepeatName(weekday))

  if (labels.length === 1) {
    return `Existe conflito de horário na ${labels[0]}.`
  }

  const lastLabel = labels[labels.length - 1]
  const initialLabels = labels.slice(0, -1).join(", ")

  return `Existem conflitos de horário na ${initialLabels} e ${lastLabel}.`
}
