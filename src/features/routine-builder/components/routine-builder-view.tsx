"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Redo2,
  Save,
  Trash2,
  Undo2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeading } from "@/components/shared/page-heading"
import { WEEK_DAYS } from "@/constants/routine"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import { getWeekdayFromDateKey } from "@/features/routine/utils/routine-domain"
import {
  BUILDER_BLOCK_OPTIONS,
  cloneRoutineWeek,
  createId,
  createRoutineWeekFromDate,
  getBuilderBlockOption,
  getRoutineStartTime,
  getRoutineWeekDay,
  getVisibleMonthWeekStartKeys,
  repeatWeekForMonth,
  updateRoutineWeekDay,
  upsertRoutineWeek,
} from "@/features/routine-builder/utils/routine-builder"
import { cn } from "@/lib/utils"
import { getMonthLabel, getTodayDateKey, parseDateKey, toDateKey } from "@/utils/date"
import type { Routine, RoutineBlock, RoutineBlockType, RoutineDay, RoutineWeek, Weekday } from "@/types/study"

interface RoutineBuilderViewProps {
  onBackToSettings: () => void
  onNavigateToRoutine: () => void
}

type EditingMode = "create" | "edit"
type EditingRepeatMode = "none" | "week-daily" | "month-daily" | "month-weekday" | "year-weekday"

interface EditingState {
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

const DND_MIME_TYPE = "application/routineos-routine-block"

type DragPayload =
  | { kind: "palette"; blockType: RoutineBlockType }
  | { kind: "block"; sourceWeekday: Weekday; blockId: string }

interface DragPreviewState {
  weekday: Weekday
  minutes: number
  x: number
  y: number
  snapped?: boolean
}

interface DeleteConfirmationState {
  blockId: string
  weekday: Weekday
  title: string
  repeatSourceId?: string
}

interface RoutineToastState {
  id: string
  message: string
}

function readDragPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const rawPayload = event.dataTransfer.getData(DND_MIME_TYPE) || event.dataTransfer.getData("text/plain")

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

function buildWeekDays(baseDate: Date) {
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

function getEditingDefaults(type: RoutineBlockType) {
  const option = getBuilderBlockOption(type)

  const defaults: Partial<Record<RoutineBlockType, { title: string; durationMinutes: number }>> = {
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
    durationMinutes: defaults[type]?.durationMinutes ?? option.defaultDurationMinutes,
  }
}

function createBlockFromEditing(editing: EditingState): RoutineBlock {
  return {
    id: createId(`block-${editing.weekday}`),
    type: editing.type,
    title: editing.title.trim() || getBuilderBlockOption(editing.type).defaultTitle,
    description: editing.description.trim() || undefined,
    durationMinutes: Math.max(1, Math.floor(editing.durationMinutes || 1)),
    startTime: editing.startTime,
    endTime: editing.startTime,
    order: 1,
  }
}

function getWeekdayIndex(weekday: Weekday): number {
  return Math.max(0, WEEK_DAYS.findIndex((day) => day.key === weekday))
}

function getDateKeyForWeekdayInWeek(weekStartDate: string, weekday: Weekday): string {
  const date = parseDateKey(weekStartDate)
  date.setDate(date.getDate() + getWeekdayIndex(weekday))
  return toDateKey(date)
}

function getWeekdayRepeatName(weekday: Weekday): string {
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

function getWeekdayRepeatPrefix(weekday: Weekday): string {
  const prefix = weekday === "sunday" || weekday === "saturday" ? "Todo" : "Toda"
  return `${prefix} ${getWeekdayRepeatName(weekday)}`
}

function getMonthDateKeys(year: number, month: number): string[] {
  const keys: string[] = []
  const cursor = new Date(year, month, 1)

  while (cursor.getMonth() === month) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

function getYearWeekdayDateKeys(startDateKey: string, weekday: Weekday): string[] {
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

const HOUR_ROW_HEIGHT = 144
const SNAP_THRESHOLD_MINUTES = 5
const TIMELINE_HEADER_HEIGHT = 64
const TIMELINE_VERTICAL_PADDING = 42
const MIN_VISIBLE_BLOCK_HEIGHT = 20
const VISUAL_BLOCK_GAP = 8
const FULL_DAY_START_MINUTES = 0
const FULL_DAY_END_MINUTES = 24 * 60
const INITIAL_SCROLL_OFFSET_MINUTES = 60

interface RoutineBlockLayout {
  block: RoutineBlock
  top: number
  height: number
}

function timeToMinutes(time: string): number | null {
  const [rawHours, rawMinutes] = time.split(":")
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

function formatTimeLabel(minutes: number): string {
  const normalizedMinutes = Math.max(0, minutes)
  const hours = Math.floor(normalizedMinutes / 60) % 24
  const mins = normalizedMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function getBlockStartMinutes(block: RoutineBlock, fallbackStartMinutes: number): number {
  return timeToMinutes(block.startTime) ?? fallbackStartMinutes
}

function getBlockEndMinutes(block: RoutineBlock, fallbackStartMinutes: number): number {
  return timeToMinutes(block.endTime) ?? getBlockStartMinutes(block, fallbackStartMinutes) + block.durationMinutes
}

function clampMinutes(minutes: number, minMinutes = FULL_DAY_START_MINUTES, maxMinutes = FULL_DAY_END_MINUTES - 1): number {
  return Math.min(maxMinutes, Math.max(minMinutes, minutes))
}

function getBlockEndTime(startMinutes: number, durationMinutes: number): string {
  return formatTimeLabel(startMinutes + Math.max(1, Math.floor(durationMinutes || 1)))
}

function setBlockStartTime(block: RoutineBlock, startMinutes: number): RoutineBlock {
  const normalizedStartMinutes = clampMinutes(Math.round(startMinutes))
  const durationMinutes = Math.max(1, Math.floor(block.durationMinutes || 1))

  return {
    ...block,
    durationMinutes,
    startTime: formatTimeLabel(normalizedStartMinutes),
    endTime: getBlockEndTime(normalizedStartMinutes, durationMinutes),
  }
}

function sortRoutineDayBlocksByTime(blocks: RoutineBlock[], fallbackStartMinutes: number): RoutineBlock[] {
  return blocks
    .map((block, originalIndex) => ({ block, originalIndex }))
    .sort((a, b) => {
      const timeDiff =
        getBlockStartMinutes(a.block, fallbackStartMinutes) - getBlockStartMinutes(b.block, fallbackStartMinutes)

      if (timeDiff !== 0) return timeDiff

      const orderDiff = (a.block.order ?? a.originalIndex + 1) - (b.block.order ?? b.originalIndex + 1)
      return orderDiff !== 0 ? orderDiff : a.originalIndex - b.originalIndex
    })
    .map(({ block }, index) => ({
      ...setBlockStartTime(block, getBlockStartMinutes(block, fallbackStartMinutes)),
      order: index + 1,
    }))
}

function getTimelineMinutesFromPointer(
  clientY: number,
  laneElement: HTMLElement,
  timelineStartMinutes: number,
  timelineEndMinutes: number,
): number {
  const laneRect = laneElement.getBoundingClientRect()
  const pointerY = clientY - laneRect.top - TIMELINE_VERTICAL_PADDING
  const minutesFromTop = Math.round((pointerY / HOUR_ROW_HEIGHT) * 60)

  return clampMinutes(timelineStartMinutes + minutesFromTop, timelineStartMinutes, timelineEndMinutes - 1)
}

function getTimelineRange() {
  return {
    startMinutes: FULL_DAY_START_MINUTES,
    endMinutes: FULL_DAY_END_MINUTES,
  }
}

function getTimeSlots(startMinutes: number, endMinutes: number): number[] {
  const slots: number[] = []

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    slots.push(minutes)
  }

  return slots
}

function minutesToPixels(minutes: number): number {
  return (minutes / 60) * HOUR_ROW_HEIGHT
}

function minutesToTimelineTop(minutes: number, timelineStartMinutes: number): number {
  return TIMELINE_VERTICAL_PADDING + minutesToPixels(minutes - timelineStartMinutes)
}

function getDayBlockLayouts(
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

function getConflictingBlockIds(week: RoutineWeek, fallbackStartMinutes: number): Set<string> {
  const conflictingBlockIds = new Set<string>()

  week.days.forEach((day) => {
    const blocks = [...day.blocks].sort(
      (a, b) => getBlockStartMinutes(a, fallbackStartMinutes) - getBlockStartMinutes(b, fallbackStartMinutes),
    )

    blocks.forEach((currentBlock, currentIndex) => {
      const currentStart = getBlockStartMinutes(currentBlock, fallbackStartMinutes)
      const currentEnd = getBlockEndMinutes(currentBlock, fallbackStartMinutes)

      blocks.slice(currentIndex + 1).forEach((nextBlock) => {
        const nextStart = getBlockStartMinutes(nextBlock, fallbackStartMinutes)
        const nextEnd = getBlockEndMinutes(nextBlock, fallbackStartMinutes)

        if (currentStart < nextEnd && nextStart < currentEnd) {
          conflictingBlockIds.add(currentBlock.id)
          conflictingBlockIds.add(nextBlock.id)
        }
      })
    })
  })

  return conflictingBlockIds
}

function getConflictWeekdays(week: RoutineWeek, fallbackStartMinutes: number): Weekday[] {
  return week.days
    .filter((day) => getConflictingBlockIds({ ...week, days: [day] }, fallbackStartMinutes).size > 0)
    .map((day) => day.weekday)
}

function formatConflictMessage(weekdays: Weekday[]): string | null {
  if (weekdays.length === 0) return null

  const labels = weekdays.map((weekday) => getWeekdayRepeatName(weekday))

  if (labels.length === 1) {
    return `Existe conflito de horário na ${labels[0]}.`
  }

  const lastLabel = labels[labels.length - 1]
  const initialLabels = labels.slice(0, -1).join(", ")

  return `Existem conflitos de horário na ${initialLabels} e ${lastLabel}.`
}

export function RoutineBuilderView({ onBackToSettings }: RoutineBuilderViewProps) {
  const { routine, saveRoutine, isLoading } = useRoutine()
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayDateKey())
  const [draftRoutine, setDraftRoutine] = useState<Routine | null>(null)
  const [draftWeek, setDraftWeek] = useState<RoutineWeek | null>(null)
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null)
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false)
  const [toast, setToast] = useState<RoutineToastState | null>(null)
  const [undoStack, setUndoStack] = useState<Routine[]>([])
  const [redoStack, setRedoStack] = useState<Routine[]>([])
  const [dragOverWeekday, setDragOverWeekday] = useState<Weekday | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [draggingPayload, setDraggingPayload] = useState<DragPayload | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
  const [isBlockPanelOpen, setIsBlockPanelOpen] = useState(false)
  const dragStartOffsetMinutesRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)
  const openMenuRef = useRef<HTMLDivElement | null>(null)
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null)
  const selectedDayColumnRef = useRef<HTMLDivElement | null>(null)
  const autoScrollDateKeyRef = useRef<string | null>(null)
  const dragAutoScrollFrameRef = useRef<number | null>(null)
  const dragAutoScrollSpeedRef = useRef(0)

  const selectedDate = parseDateKey(selectedDateKey)
  const selectedWeekday = getWeekdayFromDateKey(selectedDateKey)
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDateKey])
  const selectedMonthLabel = getMonthLabel(selectedDate.getFullYear(), selectedDate.getMonth())
  const activeDraftRoutine = draftRoutine ?? routine
  const startTime = getRoutineStartTime(activeDraftRoutine)
  const fallbackStartMinutes = timeToMinutes(startTime) ?? 8 * 60
  const timelineRange = useMemo(() => getTimelineRange(), [])
  const timeSlots = useMemo(
    () => getTimeSlots(timelineRange.startMinutes, timelineRange.endMinutes),
    [timelineRange.endMinutes, timelineRange.startMinutes],
  )
  const dayBlockLayouts = useMemo(() => {
    if (!draftWeek) return new Map<Weekday, RoutineBlockLayout[]>()

    return new Map(
      WEEK_DAYS.map((day) => {
        const routineDay = getRoutineWeekDay(draftWeek, day.key)
        return [day.key, getDayBlockLayouts(routineDay.blocks, timelineRange.startMinutes, fallbackStartMinutes)] as const
      }),
    )
  }, [draftWeek, fallbackStartMinutes, timelineRange.startMinutes])
  const conflictBlockIds = useMemo(
    () => (draftWeek ? getConflictingBlockIds(draftWeek, fallbackStartMinutes) : new Set<string>()),
    [draftWeek, fallbackStartMinutes],
  )
  const conflictMessage = useMemo(
    () => (draftWeek ? formatConflictMessage(getConflictWeekdays(draftWeek, fallbackStartMinutes)) : null),
    [draftWeek, fallbackStartMinutes],
  )

  const firstRoutineBlockStartMinutes = useMemo(() => {
    if (!draftWeek) return null

    const blockStarts = draftWeek.days.flatMap((day) =>
      day.blocks.map((block) => getBlockStartMinutes(block, fallbackStartMinutes)),
    )

    return blockStarts.length > 0 ? Math.min(...blockStarts) : null
  }, [draftWeek, fallbackStartMinutes])
  const timelineBaseHeight =
    TIMELINE_VERTICAL_PADDING * 2 + minutesToPixels(timelineRange.endMinutes - timelineRange.startMinutes)
  const timelineHeight = Math.max(
    timelineBaseHeight,
    ...Array.from(dayBlockLayouts.values()).flatMap((layouts) =>
      layouts.map((layout) => layout.top + layout.height + 84),
    ),
  )

  useEffect(() => {
    if (isLoading) return
    setDraftRoutine(routine)
  }, [isLoading, routine])

  useEffect(() => {
    if (!draftRoutine) return

    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, draftRoutine))
    setOpenMenuBlockId(null)
    setEditing(null)
    setDragOverWeekday(null)
    setDragOverBlockId(null)
    setDraggingBlockId(null)
    setIsSaved(JSON.stringify(draftRoutine) === JSON.stringify(routine))
  }, [draftRoutine, routine, selectedDateKey])

  useEffect(() => {
    if (!openMenuBlockId) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (target instanceof Node && openMenuRef.current?.contains(target)) {
        return
      }

      setOpenMenuBlockId(null)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [openMenuBlockId])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const workspace = workspaceScrollRef.current

    if (!workspace || !draftWeek || autoScrollDateKeyRef.current === selectedDateKey) {
      return
    }

    autoScrollDateKeyRef.current = selectedDateKey

    window.requestAnimationFrame(() => {
      const selectedColumn = selectedDayColumnRef.current
      let nextLeft = workspace.scrollLeft

      if (selectedColumn && workspace.scrollWidth > workspace.clientWidth) {
        const workspaceRect = workspace.getBoundingClientRect()
        const selectedRect = selectedColumn.getBoundingClientRect()

        nextLeft =
          workspace.scrollLeft +
          selectedRect.left -
          workspaceRect.left -
          Math.max(0, (workspace.clientWidth - selectedRect.width) / 2)
      }

      const firstBlockStart = firstRoutineBlockStartMinutes
      const targetStartMinutes =
        firstBlockStart === null
          ? timelineRange.startMinutes
          : Math.max(
              timelineRange.startMinutes,
              Math.floor((firstBlockStart - INITIAL_SCROLL_OFFSET_MINUTES) / 60) * 60,
            )
      const nextTop =
        firstBlockStart === null
          ? 0
          : TIMELINE_HEADER_HEIGHT + minutesToTimelineTop(targetStartMinutes, timelineRange.startMinutes)

      workspace.scrollTo({
        left: Math.max(0, nextLeft),
        top: Math.max(0, nextTop),
        behavior: "auto",
      })
    })
  }, [draftWeek, firstRoutineBlockStartMinutes, selectedDateKey, timelineRange.startMinutes])

  const selectedDay = draftWeek ? getRoutineWeekDay(draftWeek, selectedWeekday) : null

  const getRoutineWithCurrentDraftWeek = (baseRoutine: Routine = activeDraftRoutine) => {
    return draftWeek ? upsertRoutineWeek(baseRoutine, cloneRoutineWeek(draftWeek)) : baseRoutine
  }

  const cloneRoutineSnapshot = (snapshot: Routine): Routine => JSON.parse(JSON.stringify(snapshot)) as Routine

  const applyRoutineSnapshot = (snapshot: Routine) => {
    const nextSnapshot = cloneRoutineSnapshot(snapshot)

    setDraftRoutine(nextSnapshot)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextSnapshot))
    setIsSaved(JSON.stringify(nextSnapshot) === JSON.stringify(routine))
  }

  const pushUndoSnapshot = (snapshot: Routine = getRoutineWithCurrentDraftWeek()) => {
    setUndoStack((current) => [...current, cloneRoutineSnapshot(snapshot)].slice(-30))
    setRedoStack([])
  }

  const undoLastRoutineChange = () => {
    if (undoStack.length === 0) return

    const previousSnapshot = undoStack[undoStack.length - 1]
    const currentSnapshot = getRoutineWithCurrentDraftWeek()

    setUndoStack((current) => current.slice(0, -1))
    setRedoStack((current) => [...current, cloneRoutineSnapshot(currentSnapshot)].slice(-30))
    applyRoutineSnapshot(previousSnapshot)
    showToast({ message: "Alteração desfeita." })
  }

  const redoRoutineChange = () => {
    if (redoStack.length === 0) return

    const nextSnapshot = redoStack[redoStack.length - 1]
    const currentSnapshot = getRoutineWithCurrentDraftWeek()

    setRedoStack((current) => current.slice(0, -1))
    setUndoStack((current) => [...current, cloneRoutineSnapshot(currentSnapshot)].slice(-30))
    applyRoutineSnapshot(nextSnapshot)
    showToast({ message: "Alteração refeita." })
  }

  const showToast = (
    _message: string,
    _action?: ToastAction,
  ) => {
    setToast(null)
  }


  const syncRecurringSeriesFromCurrentWeek = (routineToSync: Routine): Routine => {
    if (!draftWeek) return routineToSync

    const recurringBlocks = draftWeek.days.flatMap((day) =>
      day.blocks.flatMap((block) =>
        block.repeatSourceId ? [{ weekday: day.weekday, block }] : [],
      ),
    )

    if (recurringBlocks.length === 0) return routineToSync

    return recurringBlocks.reduce((currentRoutine, { weekday, block }) => {
      const repeatSourceId = block.repeatSourceId
      if (!repeatSourceId) return currentRoutine

      const sourceStartMinutes = getBlockStartMinutes(block, fallbackStartMinutes)
      const sourceBlock = setBlockStartTime({ ...block, repeatSourceId }, sourceStartMinutes)
      const weeks = currentRoutine.weeks ?? []

      return {
        ...currentRoutine,
        weeks: weeks.map((week) => {
          const existingBlock = week.days
            .flatMap((day) => day.blocks)
            .find((candidate) => candidate.repeatSourceId === repeatSourceId)

          if (!existingBlock) return week

          return {
            ...week,
            days: week.days.map((day) => {
              const remainingBlocks = day.blocks.filter(
                (candidate) => candidate.repeatSourceId !== repeatSourceId,
              )
              const nextBlocks =
                day.weekday === weekday
                  ? [
                      ...remainingBlocks,
                      {
                        ...sourceBlock,
                        id: existingBlock.id,
                      },
                    ]
                  : remainingBlocks
              const normalizedBlocks = sortRoutineDayBlocksByTime(nextBlocks, fallbackStartMinutes)

              return {
                ...day,
                blocks: normalizedBlocks,
                isActive: normalizedBlocks.length > 0,
              }
            }),
          }
        }),
      }
    }, routineToSync)
  }

  const moveWeek = (direction: -1 | 1) => {
    const nextRoutine = getRoutineWithCurrentDraftWeek()
    const nextDate = parseDateKey(selectedDateKey)

    nextDate.setDate(nextDate.getDate() + direction * 7)
    setDraftRoutine(nextRoutine)
    setSelectedDateKey(toDateKey(nextDate))
  }

  const updateDraftDay = (weekday: Weekday, updater: (day: RoutineDay) => RoutineDay) => {
    if (!draftWeek) return

    pushUndoSnapshot()

    const nextWeek = updateRoutineWeekDay(draftWeek, weekday, (day) => {
      const updatedDay = updater(day)
      const normalizedBlocks = sortRoutineDayBlocksByTime(updatedDay.blocks, fallbackStartMinutes)

      return {
        ...updatedDay,
        blocks: normalizedBlocks,
        isActive: normalizedBlocks.length > 0,
      }
    })
    setDraftWeek(nextWeek)
    setIsSaved(false)
  }

  const openCreateDialog = (
    type: RoutineBlockType,
    weekday: Weekday = selectedWeekday,
    startMinutes = fallbackStartMinutes,
  ) => {
    const defaults = getEditingDefaults(type)

    setOpenMenuBlockId(null)
    setEditing({
      mode: "create",
      weekday,
      type,
      title: defaults.title,
      description: "",
      durationMinutes: defaults.durationMinutes,
      startTime: formatTimeLabel(clampMinutes(startMinutes)),
      repeatMode: "none",
    })
  }

  const openEditDialog = (block: RoutineBlock, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    setEditing({
      mode: "edit",
      weekday,
      type: block.type,
      title: block.title,
      description: block.description ?? "",
      durationMinutes: block.durationMinutes,
      startTime: block.startTime,
      repeatMode: "none",
      blockId: block.id,
    })
  }

  const closeEditing = () => setEditing(null)

  const handleSelectEditingType = (type: RoutineBlockType) => {
    const defaults = getEditingDefaults(type)

    setEditing((current) =>
      current
        ? {
            ...current,
            type,
            title:
              current.mode === "create"
                ? defaults.title
                : current.title || defaults.title,
            durationMinutes: defaults.durationMinutes,
          }
        : current,
    )
  }

  const getRepeatTargetDateKeys = (editingState: EditingState): string[] => {
    if (!draftWeek || editingState.repeatMode === "none") return []

    const sourceDateKey = getDateKeyForWeekdayInWeek(draftWeek.weekStartDate, editingState.weekday)
    const sourceDate = parseDateKey(sourceDateKey)

    if (editingState.repeatMode === "week-daily") {
      return WEEK_DAYS.map((day) => getDateKeyForWeekdayInWeek(draftWeek.weekStartDate, day.key))
    }

    if (editingState.repeatMode === "month-daily") {
      return getMonthDateKeys(selectedDate.getFullYear(), selectedDate.getMonth())
    }

    if (editingState.repeatMode === "month-weekday") {
      return getMonthDateKeys(selectedDate.getFullYear(), selectedDate.getMonth()).filter(
        (dateKey) => getWeekdayFromDateKey(dateKey) === editingState.weekday,
      )
    }

    if (editingState.repeatMode === "year-weekday") {
      return getYearWeekdayDateKeys(sourceDateKey, editingState.weekday)
    }

    return [toDateKey(sourceDate)]
  }

  const applyRepeatedBlock = (sourceBlock: RoutineBlock, targetDateKeys: string[]) => {
    if (!editing || !draftWeek || targetDateKeys.length === 0) return

    pushUndoSnapshot()

    const repeatSourceId = sourceBlock.repeatSourceId ?? `repeat-${sourceBlock.id}`
    const sourceDateKey = getDateKeyForWeekdayInWeek(draftWeek.weekStartDate, editing.weekday)

    const nextRoutine = targetDateKeys.reduce((currentRoutine, dateKey) => {
      const targetWeekday = getWeekdayFromDateKey(dateKey)
      const targetWeek = createRoutineWeekFromDate(dateKey, currentRoutine)
      const targetBlock: RoutineBlock = {
        ...sourceBlock,
        id: dateKey === sourceDateKey ? sourceBlock.id : createId(`block-${targetWeekday}`),
        repeatSourceId,
      }

      const updatedWeek = updateRoutineWeekDay(targetWeek, targetWeekday, (day) => {
        const blocks = day.blocks.filter(
          (block) => block.id !== sourceBlock.id && block.repeatSourceId !== repeatSourceId,
        )
        const normalizedBlocks = sortRoutineDayBlocksByTime([...blocks, targetBlock], fallbackStartMinutes)

        return {
          ...day,
          blocks: normalizedBlocks,
          isActive: normalizedBlocks.length > 0,
        }
      })

      return upsertRoutineWeek(currentRoutine, updatedWeek)
    }, getRoutineWithCurrentDraftWeek())

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    setIsSaved(false)
  }

  const handleSaveBlock = () => {
    if (!editing) return

    const startMinutes = timeToMinutes(editing.startTime) ?? fallbackStartMinutes
    const normalizedDuration = Math.max(1, Math.floor(editing.durationMinutes || 1))
    const normalizedDescription = editing.description.trim() || undefined

    if (editing.mode === "edit") {
      const currentDay = draftWeek ? getRoutineWeekDay(draftWeek, editing.weekday) : null
      const currentBlock = currentDay?.blocks.find((block) => block.id === editing.blockId)

      if (!currentBlock) {
        closeEditing()
        return
      }

      const repeatSourceId =
        editing.repeatMode === "none"
          ? currentBlock.repeatSourceId
          : currentBlock.repeatSourceId ?? `repeat-${currentBlock.id}`
      const updatedBlock = setBlockStartTime(
        {
          ...currentBlock,
          type: editing.type,
          title: editing.title.trim() || getBuilderBlockOption(editing.type).defaultTitle,
          description: normalizedDescription,
          durationMinutes: normalizedDuration,
          repeatSourceId,
        },
        startMinutes,
      )

      if (editing.repeatMode !== "none") {
        applyRepeatedBlock(updatedBlock, getRepeatTargetDateKeys(editing))
        closeEditing()
        return
      }

      updateDraftDay(editing.weekday, (day) => ({
        ...day,
        blocks: day.blocks.map((block) => (block.id === editing.blockId ? updatedBlock : block)),
      }))

      closeEditing()
      return
    }

    updateDraftDay(editing.weekday, (day) => {
      const block = setBlockStartTime(createBlockFromEditing(editing), startMinutes)
      return {
        ...day,
        blocks: [...day.blocks, block],
      }
    })

    closeEditing()
  }

  const duplicateBlock = (block: RoutineBlock, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    updateDraftDay(weekday, (day) => ({
      ...day,
      blocks: [
        ...day.blocks,
        {
          ...block,
          id: createId(`block-${weekday}`),
          title: `${block.title} cópia`,
        },
      ],
    }))
  }

  const deleteSingleBlock = (blockId: string, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    updateDraftDay(weekday, (day) => ({
      ...day,
      blocks: day.blocks.filter((block) => block.id !== blockId),
    }))
    setDeleteConfirmation(null)
    showToast({ message: "Tarefa removida." })
  }

  const deleteRecurringSeries = (repeatSourceId: string) => {
    const currentRoutine = getRoutineWithCurrentDraftWeek()

    pushUndoSnapshot(currentRoutine)

    const nextRoutine: Routine = {
      ...currentRoutine,
      weeks: currentRoutine.weeks?.map((week) => ({
        ...week,
        days: week.days.map((day) => {
          const blocks = day.blocks.filter((block) => block.repeatSourceId !== repeatSourceId)

          return {
            ...day,
            blocks,
            isActive: blocks.length > 0,
          }
        }),
      })),
    }

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    setOpenMenuBlockId(null)
    setDeleteConfirmation(null)
    setIsSaved(false)
    showToast({ message: "Repetições removidas." })
  }

  const requestDeleteBlock = (block: RoutineBlock, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    setDeleteConfirmation({
      blockId: block.id,
      weekday,
      title: block.title,
      repeatSourceId: block.repeatSourceId,
    })
  }

  const moveBlock = (blockId: string, direction: -1 | 1, weekday: Weekday) => {
    updateDraftDay(weekday, (day) => {
      const currentIndex = day.blocks.findIndex((block) => block.id === blockId)
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= day.blocks.length) return day

      const blocks = [...day.blocks]
      const [block] = blocks.splice(currentIndex, 1)
      blocks.splice(nextIndex, 0, block)
      return { ...day, blocks }
    })
  }

  const stopDragAutoScroll = () => {
    dragAutoScrollSpeedRef.current = 0

    if (dragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollFrameRef.current)
      dragAutoScrollFrameRef.current = null
    }
  }

  const updateDragAutoScroll = (event: DragEvent<HTMLElement>) => {
    const workspace = workspaceScrollRef.current
    if (!workspace) return

    const rect = workspace.getBoundingClientRect()
    const edgeSize = 96
    const maxSpeed = 28

    const distanceToTop = event.clientY - rect.top
    const distanceToBottom = rect.bottom - event.clientY

    let nextSpeed = 0

    if (distanceToTop >= 0 && distanceToTop < edgeSize) {
      const intensity = 1 - distanceToTop / edgeSize
      nextSpeed = -Math.ceil(maxSpeed * intensity)
    } else if (distanceToBottom >= 0 && distanceToBottom < edgeSize) {
      const intensity = 1 - distanceToBottom / edgeSize
      nextSpeed = Math.ceil(maxSpeed * intensity)
    }

    dragAutoScrollSpeedRef.current = nextSpeed

    if (nextSpeed === 0) {
      stopDragAutoScroll()
      return
    }

    if (dragAutoScrollFrameRef.current !== null) return

    const tick = () => {
      const currentWorkspace = workspaceScrollRef.current
      const speed = dragAutoScrollSpeedRef.current

      if (!currentWorkspace || speed === 0) {
        dragAutoScrollFrameRef.current = null
        return
      }

      const maxScrollTop = currentWorkspace.scrollHeight - currentWorkspace.clientHeight
      currentWorkspace.scrollTop = Math.min(
        Math.max(currentWorkspace.scrollTop + speed, 0),
        Math.max(0, maxScrollTop),
      )

      dragAutoScrollFrameRef.current = window.requestAnimationFrame(tick)
    }

    dragAutoScrollFrameRef.current = window.requestAnimationFrame(tick)
  }

  const clearDragState = () => {
    stopDragAutoScroll()
    setDragOverWeekday(null)
    setDragOverBlockId(null)
    setDraggingBlockId(null)
    setDraggingPayload(null)
    setDragPreview(null)
    dragStartOffsetMinutesRef.current = 0
  }

  const createBlockFromType = (type: RoutineBlockType, weekday: Weekday, startMinutes: number): RoutineBlock => {
    const defaults = getEditingDefaults(type)

    return setBlockStartTime(
      {
        id: createId(`block-${weekday}`),
        type,
        title: defaults.title,
        description: "",
        durationMinutes: defaults.durationMinutes,
        startTime: "00:00",
        endTime: "00:00",
        order: 1,
      },
      startMinutes,
    )
  }

  const insertBlockIntoDay = (weekday: Weekday, block: RoutineBlock) => {
    updateDraftDay(weekday, (day) => ({
      ...day,
      blocks: [...day.blocks, block],
    }))
  }

  const moveBlockToDay = (sourceWeekday: Weekday, blockId: string, targetWeekday: Weekday, startMinutes: number) => {
    if (!draftWeek) return

    pushUndoSnapshot()

    const sourceDay = getRoutineWeekDay(draftWeek, sourceWeekday)
    const movedBlock = sourceDay.blocks.find((block) => block.id === blockId)

    if (!movedBlock) return

    const blockToInsert = setBlockStartTime(
      {
        ...movedBlock,
        id: sourceWeekday === targetWeekday ? movedBlock.id : createId(`block-${targetWeekday}`),
      },
      startMinutes,
    )

    const withMovedBlock = draftWeek.days.reduce((currentWeek, currentDay) => {
      if (currentDay.weekday !== sourceWeekday && currentDay.weekday !== targetWeekday) {
        return currentWeek
      }

      return updateRoutineWeekDay(currentWeek, currentDay.weekday, (day) => {
        const withoutMovedBlock = day.blocks.filter((block) => block.id !== blockId)
        const blocks = currentDay.weekday === targetWeekday
          ? [...withoutMovedBlock, blockToInsert]
          : withoutMovedBlock
        const normalizedBlocks = sortRoutineDayBlocksByTime(blocks, fallbackStartMinutes)

        return {
          ...day,
          blocks: normalizedBlocks,
          isActive: normalizedBlocks.length > 0,
        }
      })
    }, draftWeek)

    setDraftWeek(withMovedBlock)
    setOpenMenuBlockId(null)
    setIsSaved(false)
    showToast({ message: "Bloco movido." })
  }

  const getDraggedBlockDuration = (payload: DragPayload | null): number => {
    if (!payload) return getEditingDefaults("study").durationMinutes
    if (payload.kind === "palette") return getEditingDefaults(payload.blockType).durationMinutes

    const sourceDay = draftWeek ? getRoutineWeekDay(draftWeek, payload.sourceWeekday) : null
    return sourceDay?.blocks.find((block) => block.id === payload.blockId)?.durationMinutes ?? getEditingDefaults("study").durationMinutes
  }

  const getSnapResult = (
    minutes: number,
    weekday: Weekday,
    durationMinutes: number,
    payload: DragPayload | null,
  ): { minutes: number; snapped: boolean } => {
    if (!draftWeek) return { minutes, snapped: false }

    const targetDay = getRoutineWeekDay(draftWeek, weekday)
    const duration = Math.max(1, Math.floor(durationMinutes || 1))
    const maxStartMinutes = Math.max(
      timelineRange.startMinutes,
      timelineRange.endMinutes - duration,
    )

    const candidates = targetDay.blocks.flatMap((block) => {
      const isMovingSameBlock =
        payload?.kind === "block" &&
        payload.sourceWeekday === weekday &&
        payload.blockId === block.id

      if (isMovingSameBlock) return []

      const blockStart = getBlockStartMinutes(block, fallbackStartMinutes)
      const blockEnd = getBlockEndMinutes(block, fallbackStartMinutes)

      return [
        blockStart,
        blockEnd + 1,
        blockStart - duration - 1,
      ]
    })

    const validCandidates = candidates
      .map((candidate) => clampMinutes(candidate, timelineRange.startMinutes, maxStartMinutes))
      .filter((candidate, index, list) => list.indexOf(candidate) === index)

    if (validCandidates.length === 0) return { minutes, snapped: false }

    const closest = validCandidates.reduce((best, candidate) => {
      const bestDistance = Math.abs(best - minutes)
      const candidateDistance = Math.abs(candidate - minutes)

      return candidateDistance < bestDistance ? candidate : best
    }, validCandidates[0])

    if (Math.abs(closest - minutes) <= SNAP_THRESHOLD_MINUTES) {
      return { minutes: closest, snapped: true }
    }

    return { minutes, snapped: false }
  }

  const getDragMinutesFromEvent = (event: DragEvent<HTMLElement>, durationMinutes = 1): number | null => {
    const currentTarget = event.currentTarget as HTMLElement
    const laneElement = currentTarget.dataset.routineDayLane === "true"
      ? currentTarget
      : currentTarget.closest<HTMLElement>("[data-routine-day-lane='true']")

    if (!laneElement) return null

    const rawMinutes = getTimelineMinutesFromPointer(
      event.clientY,
      laneElement,
      timelineRange.startMinutes,
      timelineRange.endMinutes,
    )

    const adjustedMinutes = rawMinutes - dragStartOffsetMinutesRef.current
    const maxStartMinutes = Math.max(
      timelineRange.startMinutes,
      timelineRange.endMinutes - Math.max(1, durationMinutes),
    )

    return clampMinutes(adjustedMinutes, timelineRange.startMinutes, maxStartMinutes)
  }

  const updateDragPreview = (event: DragEvent<HTMLElement>, weekday: Weekday, payload: DragPayload | null = draggingPayload) => {
    const durationMinutes = getDraggedBlockDuration(payload)
    const rawMinutes = getDragMinutesFromEvent(event, durationMinutes)

    if (rawMinutes === null) {
      setDragPreview(null)
      return null
    }

    const snapResult = getSnapResult(rawMinutes, weekday, durationMinutes, payload)

    setDragPreview({
      weekday,
      minutes: snapResult.minutes,
      x: event.clientX,
      y: event.clientY,
      snapped: snapResult.snapped,
    })

    return snapResult.minutes
  }

  const handlePaletteDragStart = (event: DragEvent<HTMLButtonElement>, blockType: RoutineBlockType) => {
    const payload: DragPayload = { kind: "palette", blockType }

    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(DND_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.setData("text/plain", JSON.stringify(payload))
    dragStartOffsetMinutesRef.current = 0
    setDraggingPayload(payload)
    setDragPreview(null)
    setIsBlockPanelOpen(false)
  }

  const handlePaletteClick = (type: RoutineBlockType) => {
    insertBlockIntoDay(selectedWeekday, createBlockFromType(type, selectedWeekday, fallbackStartMinutes))
  }

  const renderBlockPalette = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {BUILDER_BLOCK_OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          draggable
          onDragStart={(event) => handlePaletteDragStart(event, option.type)}
          onDragEnd={clearDragState}
          onClick={() => handlePaletteClick(option.type)}
          className={cn(
            "min-h-20 cursor-grab rounded-xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing xl:rounded-2xl",
            option.className,
          )}
        >
          <span className="block text-base font-semibold text-foreground">{option.label}</span>
          <span className="mt-2 block text-sm text-muted-foreground">
            {option.defaultDurationMinutes}min
          </span>
        </button>
      ))}
    </div>
  )

  const handleBlockDragStart = (event: DragEvent<HTMLDivElement>, block: RoutineBlock, weekday: Weekday) => {
    const payload: DragPayload = { kind: "block", sourceWeekday: weekday, blockId: block.id }
    const blockRect = event.currentTarget.getBoundingClientRect()
    const pointerOffsetPixels = Math.min(
      Math.max(event.clientY - blockRect.top, 0),
      blockRect.height,
    )
    const pointerOffsetRatio = blockRect.height > 0 ? pointerOffsetPixels / blockRect.height : 0
    dragStartOffsetMinutesRef.current = Math.round(
      pointerOffsetRatio * Math.max(0, block.durationMinutes - 1),
    )

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(DND_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.setData("text/plain", JSON.stringify(payload))
    setDraggingPayload(payload)
    setDraggingBlockId(block.id)
    setDragPreview(null)
    setOpenMenuBlockId(null)
  }

  const handleDayDragOver = (event: DragEvent<HTMLElement>, weekday: Weekday) => {
    event.preventDefault()
    updateDragAutoScroll(event)
    event.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy"
    setDragOverWeekday(weekday)
    setDragOverBlockId(null)
    updateDragPreview(event, weekday)
  }

  const handleBlockDragOver = (event: DragEvent<HTMLDivElement>, weekday: Weekday, blockId: string) => {
    event.preventDefault()
    updateDragAutoScroll(event)
    event.stopPropagation()
    event.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy"
    setDragOverWeekday(weekday)
    setDragOverBlockId(blockId)
    updateDragPreview(event, weekday)
  }

  const handleDrop = (event: DragEvent<HTMLElement>, weekday: Weekday) => {
    event.preventDefault()
    event.stopPropagation()

    const payload = readDragPayload(event)

    if (!payload) {
      clearDragState()
      return
    }

    const durationMinutes = getDraggedBlockDuration(payload)
    const rawDropMinutes = getDragMinutesFromEvent(event, durationMinutes)
    const startMinutes =
      rawDropMinutes !== null
        ? getSnapResult(rawDropMinutes, weekday, durationMinutes, payload).minutes
        : dragPreview?.minutes ?? timelineRange.startMinutes

    if (payload.kind === "palette") {
      insertBlockIntoDay(weekday, createBlockFromType(payload.blockType, weekday, startMinutes))
    } else {
      moveBlockToDay(payload.sourceWeekday, payload.blockId, weekday, startMinutes)
    }

    clearDragState()
  }

  const saveCurrentWeek = () => {
    if (!draftWeek) return
    const nextRoutine = getRoutineWithCurrentDraftWeek()

    setDraftRoutine(nextRoutine)
    saveRoutine(nextRoutine)
    setIsSaved(true)
  }

  const saveCurrentMonthRoutine = () => {
    if (isSaved) return

    const nextRoutine = syncRecurringSeriesFromCurrentWeek(getRoutineWithCurrentDraftWeek())

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    saveRoutine(nextRoutine)
    setIsSaved(true)
    setUndoStack([])
    setRedoStack([])
    showToast({ message: "Rotina salva com sucesso." })
  }

  const repeatCurrentWeekForMonth = () => {
    if (!draftWeek) return
    const withCurrentWeek = upsertRoutineWeek(routine, cloneRoutineWeek(draftWeek))
    const nextRoutine = repeatWeekForMonth(
      withCurrentWeek,
      draftWeek,
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
    )
    saveRoutine(nextRoutine)
    setIsSaved(true)
  }

  const clearCurrentMonthRoutine = () => {
    setIsClearConfirmationOpen(true)
  }

  const confirmClearCurrentMonthRoutine = () => {
    const previousRoutine = getRoutineWithCurrentDraftWeek()

    pushUndoSnapshot(previousRoutine)

    const weekStartKeys = getVisibleMonthWeekStartKeys(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
    )

    const nextRoutine = weekStartKeys.reduce((currentRoutine, weekStartDate) => {
      return upsertRoutineWeek(currentRoutine, {
        id: `week-${weekStartDate}`,
        weekStartDate,
        days: WEEK_DAYS.map((day) => ({
          id: `${weekStartDate}-${day.key}`,
          weekday: day.key,
          blocks: [],
          isActive: false,
        })),
      })
    }, getRoutineWithCurrentDraftWeek())

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    setOpenMenuBlockId(null)
    setEditing(null)
    setIsClearConfirmationOpen(false)
    setIsSaved(false)
    showToast({ message: "Rotina limpa." })
  }

  if (isLoading || !draftWeek || !selectedDay) {
    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="relative flex w-full items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute left-0 rounded-full"
            onClick={onBackToSettings}
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Button>

          <PageHeading title="Configurar rotina" align="center" />
        </div>
        <div className="p-6 text-center text-base text-muted-foreground">Carregando rotina...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="relative flex w-full items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute left-0 rounded-full"
          onClick={onBackToSettings}
          aria-label="Voltar para configurações"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <PageHeading title="Configurar rotina" align="center" />
      </div>

      <div className="grid gap-6">
        <section className="min-w-0">
          <div className="mb-5 flex flex-col items-center gap-3 sm:mb-6">
            <div className="flex w-full max-w-xl items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="shrink-0 rounded-full bg-background/80 shadow-sm"
                onClick={() => moveWeek(-1)}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <h2 className="min-w-0 flex-1 text-center text-xl font-semibold text-foreground sm:text-2xl">
                {selectedMonthLabel}
              </h2>

              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="shrink-0 rounded-full bg-background/80 shadow-sm"
                onClick={() => moveWeek(1)}
                aria-label="Próxima semana"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div
            ref={workspaceScrollRef}
            className="max-h-[calc(100svh-15rem)] overflow-auto overscroll-contain rounded-[1.75rem] border border-border/50 bg-muted/10 p-3 shadow-sm sm:p-4"
          >
            <div
              className="routine-builder-scheduler-grid grid min-w-[1240px] items-stretch gap-x-2 gap-y-3 2xl:min-w-0 2xl:gap-x-3"
              style={{
                ["--routine-builder-timeline-height" as string]: `${timelineHeight}px`,
                gridTemplateColumns: "76px repeat(7, minmax(152px, 1fr))",
                gridTemplateRows: `${TIMELINE_HEADER_HEIGHT}px ${timelineHeight}px`,
              }}
            >
              <div className="sticky top-0 z-30 min-h-16" aria-hidden="true" />

              {weekDays.map((day) => (
                <div
                  key={`${day.dateKey}-header`}
                  ref={day.key === selectedWeekday ? selectedDayColumnRef : undefined}
                  className={cn(
                    "routine-builder-day-header sticky top-0 z-30 flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.25rem] border border-border/60 bg-background/95 px-3 py-2 shadow-sm backdrop-blur",
                    day.isToday && "routine-builder-day-header-today border-cyan-400/80 bg-cyan-400/10 shadow-cyan-400/10",
                  )}
                >
                  <span className="text-sm font-medium leading-5 text-muted-foreground">{day.label}</span>
                  <span className="font-mono text-xl font-semibold leading-none text-foreground tabular-nums">
                    {day.dayNumber}
                  </span>
                </div>
              ))}

              <div className="routine-builder-time-column relative rounded-[1.5rem] border border-border/40 bg-background/70 shadow-sm" style={{ height: timelineHeight }}>
                {timeSlots.map((slot) => (
                  <span
                    key={`time-${slot}`}
                    className="routine-builder-time-label absolute left-0 right-0 -translate-y-1/2 whitespace-nowrap text-center text-sm leading-5 text-muted-foreground"
                    style={{ top: minutesToTimelineTop(slot, timelineRange.startMinutes) + HOUR_ROW_HEIGHT / 2 }}
                  >
                    {formatTimeLabel(slot)}
                  </span>
                ))}
              </div>

              {weekDays.map((day) => {
                const layouts = dayBlockLayouts.get(day.key) ?? []
                return (
                  <div
                    key={`${day.dateKey}-lane`}
                    className={cn(
                      "routine-builder-day-lane group/day-lane relative rounded-[1.5rem] transition-colors",
                      dragOverWeekday === day.key && "routine-builder-day-lane-active",
                    )}
                    data-routine-day-lane="true"
                    style={{ height: timelineHeight }}
                    onDragOver={(event) => handleDayDragOver(event, day.key)}
                    onDrop={(event) => handleDrop(event, day.key)}
                    onDragEnd={clearDragState}
                  >
                    {timeSlots.map((slot) => (
                      <span
                        key={`${day.dateKey}-line-${slot}`}
                        className="routine-builder-hour-line absolute left-0 right-0 border-t border-border/50"
                        style={{ top: minutesToTimelineTop(slot, timelineRange.startMinutes) }}
                        aria-hidden="true"
                      />
                    ))}

                    {layouts.map(({ block, top, height }, blockIndex) => {
                      const option = getBuilderBlockOption(block.type)
                      const menuOpen = openMenuBlockId === block.id
                      const isCompactBlock = height < 64
                      const hasConflict = conflictBlockIds.has(block.id)

                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={(event) => handleBlockDragStart(event, block, day.key)}
                          onDragOver={(event) => handleBlockDragOver(event, day.key, block.id)}
                          onDrop={(event) => handleDrop(event, day.key)}
                          onDragEnd={clearDragState}
                          ref={menuOpen ? openMenuRef : undefined}
                          className={cn(
                            "routine-builder-schedule-block group absolute left-2 right-2 cursor-grab overflow-visible rounded-2xl border text-left shadow-sm transition active:cursor-grabbing",
                            menuOpen ? "z-[900]" : "z-20",
                            option.className,
                            hasConflict && "border-red-400/80 bg-red-500/20 shadow-red-950/30 ring-1 ring-red-400/50",
                            draggingBlockId === block.id && "opacity-50",
                            dragOverBlockId === block.id && "ring-2 ring-primary/60",
                            isCompactBlock ? "px-2 py-1.5" : "p-3",
                          )}
                          style={{ top, height }}
                        >
                          <div
                            className={cn(
                              "flex h-full min-w-0 justify-between gap-2",
                              isCompactBlock ? "items-center" : "items-start",
                            )}
                          >
                            <div
                              className={cn(
                                "min-w-0 flex-1",
                                isCompactBlock ? "flex items-center gap-2" : "",
                              )}
                            >
                              <span
                                className={cn(
                                  "wrap-break-word block font-semibold text-foreground",
                                  isCompactBlock
                                    ? "truncate text-sm leading-none"
                                    : "whitespace-normal text-base leading-snug",
                                  hasConflict && "text-red-50",
                                )}
                              >
                                {block.title}
                              </span>
                              <span
                                className={cn(
                                  "text-sm text-muted-foreground",
                                  hasConflict && "text-red-100/80",
                                  isCompactBlock ? "shrink-0 leading-none" : "mt-1 block leading-5",
                                )}
                              >
                                {block.durationMinutes}min
                              </span>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className={cn(
                                "-mr-1 shrink-0 rounded-full opacity-75 hover:opacity-100",
                                isCompactBlock ? "mt-0" : "-mt-1",
                              )}
                              onClick={() => setOpenMenuBlockId(menuOpen ? null : block.id)}
                              aria-label="Abrir ações do bloco"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </div>

                          {menuOpen ? (
                            <div className="absolute left-full top-0 z-[9999] ml-3 grid min-w-44 gap-1 rounded-2xl border border-border p-2 text-foreground shadow-[0_28px_90px_rgba(0,0,0,1)] ring-1 ring-white/10" style={{ backgroundColor: "#050b12", isolation: "isolate" }}>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 justify-start"
                                onClick={() => openEditDialog(block, day.key)}
                              >
                                <Pencil className="mr-2 size-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 justify-start"
                                onClick={() => duplicateBlock(block, day.key)}
                              >
                                <Copy className="mr-2 size-4" />
                                Duplicar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 justify-start"
                                disabled={blockIndex === 0}
                                onClick={() => moveBlock(block.id, -1, day.key)}
                              >
                                ↑ Subir
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 justify-start"
                                disabled={blockIndex === layouts.length - 1}
                                onClick={() => moveBlock(block.id, 1, day.key)}
                              >
                                ↓ Descer
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="min-h-9 justify-start text-destructive hover:text-destructive"
                                onClick={() => requestDeleteBlock(block, day.key)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Excluir
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-6">
              {conflictMessage ? (
                <p className="flex items-center gap-2 text-sm font-medium text-red-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  {conflictMessage}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="size-11 rounded-xl"
                  onClick={undoLastRoutineChange}
                  disabled={undoStack.length === 0}
                  aria-label="Desfazer última alteração"
                  title="Desfazer"
                >
                  <Undo2 className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="size-11 rounded-xl"
                  onClick={redoRoutineChange}
                  disabled={redoStack.length === 0}
                  aria-label="Refazer alteração"
                  title="Refazer"
                >
                  <Redo2 className="size-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={clearCurrentMonthRoutine}
              >
                Limpar
              </Button>

              <Button
                type="button"
                className={cn(
                  "min-h-11 w-full sm:w-auto",
                  isSaved &&
                    "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-70 hover:bg-muted hover:text-muted-foreground",
                )}
                onClick={saveCurrentMonthRoutine}
                disabled={isSaved}
              >
                <Save className="mr-2 size-4" />
                {isSaved ? "Salvo" : "Salvar"}
              </Button>
            </div>
          </div>
        </section>

                        <aside
          className={cn(
            "routine-builder-block-panel fixed right-0 top-24 z-40 h-[calc(100vh-7rem)] w-[320px] transition-transform duration-300",
            isBlockPanelOpen ? "translate-x-0" : "translate-x-[calc(100%-12px)]",
          )}
          aria-label="Painel de blocos"
          onMouseEnter={() => setIsBlockPanelOpen(true)}
          onMouseLeave={() => setIsBlockPanelOpen(false)}
        >
          <div
            className={cn(
              "pointer-events-none absolute left-0 top-1/2 -translate-x-[calc(100%+0.5rem)] -translate-y-1/2 transition-all duration-300 ease-out",
              isBlockPanelOpen ? "scale-90 opacity-0" : "scale-100 opacity-100",
            )}
            aria-hidden="true"
          >
            <div className="routine-builder-panel-hint-motion flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-400/10 shadow-[0_12px_32px_rgba(0,0,0,0.28)] ring-1 ring-cyan-300/10 backdrop-blur-xl">
              <ChevronRight className="size-5 text-cyan-200" />
            </div>
          </div>

          <div className="h-full rounded-l-2xl border border-r-0 border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Blocos</h2>

            {renderBlockPalette()}
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[10000] flex max-w-sm items-center rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-2xl ring-1 ring-white/10">
          <span className="min-w-0 flex-1">{toast.message}</span>
        </div>
      ) : null}

      {isClearConfirmationOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-clear-modal-title"
          >
            <div className="border-b border-border px-5 py-4">
              <h2 id="routine-clear-modal-title" className="text-xl font-semibold text-foreground">
                Limpar rotina do mês?
              </h2>
            </div>

            <div className="grid gap-3 px-5 py-4 text-sm text-muted-foreground">
              <p>Todos os blocos do mês visível serão removidos do rascunho.</p>
              <p>Você poderá usar a seta de desfazer enquanto não salvar ou sair da página.</p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => setIsClearConfirmationOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full sm:w-auto"
                onClick={confirmClearCurrentMonthRoutine}
              >
                Limpar mês
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-delete-modal-title"
          >
            <div className="border-b border-border px-5 py-4">
              <h2 id="routine-delete-modal-title" className="text-xl font-semibold text-foreground">
                {deleteConfirmation.repeatSourceId ? "Excluir tarefa recorrente" : "Excluir bloco?"}
              </h2>
            </div>

            <div className="grid gap-3 px-5 py-4 text-sm text-muted-foreground">
              {deleteConfirmation.repeatSourceId ? (
                <>
                  <p>
                    <span className="font-medium text-foreground">{deleteConfirmation.title}</span> faz parte de uma repetição.
                  </p>
                  <p>Escolha se deseja remover somente este bloco ou todas as repetições da mesma série.</p>
                </>
              ) : (
                <>
                  <p>
                    Deseja remover <span className="font-medium text-foreground">{deleteConfirmation.title}</span> da rotina?
                  </p>
                  <p>Você poderá usar a seta de desfazer enquanto não salvar ou sair da página.</p>
                </>
              )}
            </div>

            <div className="grid gap-3 border-t border-border bg-muted/20 px-5 py-4">
              {deleteConfirmation.repeatSourceId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                    onClick={() => deleteSingleBlock(deleteConfirmation.blockId, deleteConfirmation.weekday)}
                  >
                    Apenas esta tarefa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11 w-full"
                    onClick={() => deleteRecurringSeries(deleteConfirmation.repeatSourceId!)}
                  >
                    Todas as repetições
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11 w-full"
                  onClick={() => deleteSingleBlock(deleteConfirmation.blockId, deleteConfirmation.weekday)}
                >
                  Excluir bloco
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {dragPreview ? (
        <div
          className="pointer-events-none fixed z-[10000] rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground shadow-2xl ring-1 ring-white/10"
          style={{
            left: dragPreview.x + 14,
            top: dragPreview.y + 14,
          }}
          aria-hidden="true"
        >
          {formatTimeLabel(dragPreview.minutes)}
          {dragPreview.snapped ? <span className="ml-1 text-muted-foreground">· encaixado</span> : null}
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="flex max-h-[calc(100svh-4rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-block-modal-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <h2 id="routine-block-modal-title" className="text-xl font-semibold text-foreground">
                {editing.mode === "edit" ? "Editar bloco" : "Adicionar bloco"}
              </h2>

              <button
                type="button"
                onClick={closeEditing}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-5 overflow-y-auto px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
              {editing.mode === "edit" ? (
                <div className="grid gap-3">
                  <Label>Tipo do bloco</Label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {BUILDER_BLOCK_OPTIONS.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => handleSelectEditingType(option.type)}
                        className={cn(
                          "min-h-20 rounded-xl border px-4 py-4 text-left text-base transition-colors hover:brightness-110 sm:px-5 xl:rounded-2xl",
                          option.className,
                          editing.type === option.type && "ring-2 ring-primary/70",
                        )}
                      >
                        <span className="block text-base font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {option.defaultDurationMinutes}min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <Label htmlFor="routine-block-title">Nome</Label>
                <Input
                  id="routine-block-title"
                  className="h-12 text-base sm:h-14"
                  value={editing.title}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                  placeholder="Ex.: Linux, React, leitura..."
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="routine-block-description">Descrição</Label>
                <textarea
                  id="routine-block-description"
                  className="min-h-28 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-4"
                  value={editing.description}
                  onChange={(event) =>
                    setEditing((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                  placeholder="Ex.: estudar fundamentos, revisar anotações, resolver exercícios..."
                />
              </div>

              {editing.mode === "create" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-3">
                    <Label htmlFor="routine-block-start-time">Horário</Label>
                    <Input
                      id="routine-block-start-time"
                      className="h-12 text-base sm:h-14"
                      type="time"
                      step={60}
                      value={editing.startTime}
                      onChange={(event) =>
                        setEditing((current) =>
                          current ? { ...current, startTime: event.target.value } : current,
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="routine-block-duration">Duração em minutos</Label>
                    <Input
                      id="routine-block-duration"
                      className="h-12 text-base sm:h-14"
                      type="number"
                      min={1}
                      value={editing.durationMinutes}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                durationMinutes: Number(event.target.value),
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Label htmlFor="routine-block-duration">Duração em minutos</Label>
                  <Input
                    id="routine-block-duration"
                    className="h-12 text-base sm:h-14"
                    type="number"
                    min={1}
                    value={editing.durationMinutes}
                    onChange={(event) =>
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              durationMinutes: Number(event.target.value),
                            }
                          : current,
                      )
                    }
                  />
                </div>
              )}

              {editing.mode === "edit" ? (
                <div className="grid gap-3">
                  <Label htmlFor="routine-block-repeat">Repetir tarefa</Label>

                  <div className="relative">
                    <select
                      id="routine-block-repeat"
                      className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-3 pr-12 text-base text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-14 sm:pl-4 sm:pr-14"
                      value={editing.repeatMode}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                repeatMode: event.target.value as EditingRepeatMode,
                              }
                            : current,
                        )
                      }
                    >
                      <option value="none">Não repetir</option>
                      <option value="week-daily">Todos os dias desta semana</option>
                      <option value="month-daily">Todos os dias deste mês</option>
                      <option value="month-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} deste mês
                      </option>
                      <option value="year-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} até o fim do ano
                      </option>
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={closeEditing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                onClick={handleSaveBlock}
              >
                Salvar bloco
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
