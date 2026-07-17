"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type {
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
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
import { STORAGE_EVENTS } from "@/constants/storage"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import { createRoutineFromMentorProposal } from "@/features/mentor/utils/mentor-routine-proposal"
import {
  clampTimelineMinutes as clampMinutes,
  formatTimelineTime as formatTimeLabel,
  getBlockEndMinutes,
  getBlockStartMinutes,
  getConflictingBlockIds,
  getConflictWeekdays,
  parseTimeToMinutes as timeToMinutes,
  setBlockStartTime,
  snapMinutesToStep,
  sortRoutineDayBlocksByTime,
} from "@/features/routine/domain/routine-timeline"
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
  updateRoutineWeekDay,
  upsertRoutineWeek,
} from "@/features/routine-builder/utils/routine-builder"
import { clearMentorRoutineDraft, loadMentorRoutineDraft } from "@/lib/storage"
import { cn } from "@/lib/utils"
import {
  getMonthLabel,
  getTodayDateKey,
  parseDateKey,
  toDateKey,
} from "@/utils/date"
import type {
  Routine,
  RoutineBlock,
  RoutineBlockType,
  RoutineDay,
  RoutineWeek,
  Weekday,
} from "@/types/study"

interface RoutineBuilderViewProps {
  onBackToSettings: () => void
  onNavigateToRoutine: () => void
}

import {
  DND_MIME_TYPE,
  clearTimeoutRef,
  cancelAnimationFrameRef,
  runCleanupRef,
  MOBILE_BLOCK_PICKER_TRANSITION_MS,
  MOBILE_BLOCK_PICKER_CLOSE_THRESHOLD_PX,
  MOBILE_PALETTE_LONG_PRESS_MS,
  MOBILE_PALETTE_LONG_PRESS_CANCEL_DISTANCE_PX,
  MOBILE_PALETTE_DROP_STEP_MINUTES,
  MOBILE_PALETTE_PREVIEW_Y_OFFSET_PX,
  MOBILE_PALETTE_PREVIEW_FALLBACK_HEIGHT_PX,
  MOBILE_ROUTINE_BLOCK_LONG_PRESS_MS,
  MOBILE_ROUTINE_BLOCK_LONG_PRESS_CANCEL_DISTANCE_PX,
  readDragPayload,
  buildWeekDays,
  getDateKeyOffset,
  getEditingDefaults,
  createBlockFromEditing,
  getWeekdayIndex,
  getDateKeyForWeekdayInWeek,
  getWeekdayRepeatPrefix,
  getMonthDateKeys,
  getYearWeekdayDateKeys,
  HOUR_ROW_HEIGHT,
  SNAP_THRESHOLD_MINUTES,
  TIMELINE_HEADER_HEIGHT,
  TIMELINE_VERTICAL_PADDING,
  INITIAL_SCROLL_OFFSET_MINUTES,
  getTimelineMinutesFromPointer,
  getTimelineRange,
  getTimeSlots,
  minutesToPixels,
  minutesToTimelineTop,
  getDayBlockLayouts,
  formatConflictMessage,
} from "@/features/routine-builder/components/routine-builder-helpers"
import type {
  EditingRepeatMode,
  EditingState,
  DragPayload,
  DragPreviewState,
  DeleteConfirmationState,
  RoutineToastState,
  MobileSwipeState,
  MobileBlockPickerDragState,
  MobilePaletteDragState,
  MobileRoutineBlockDragState,
  MobilePaletteDragPreviewState,
  MobileRoutineBlockDragPreviewState,
  RoutineBlockLayout,
} from "@/features/routine-builder/components/routine-builder-helpers"
export function RoutineBuilderView({
  onBackToSettings,
}: RoutineBuilderViewProps) {
  const { routine, saveRoutine, isLoading } = useRoutine()
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    getTodayDateKey(),
  )
  const [draftRoutine, setDraftRoutine] = useState<Routine | null>(null)
  const [draftWeek, setDraftWeek] = useState<RoutineWeek | null>(null)
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmationState | null>(null)
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false)
  const [toast, setToast] = useState<RoutineToastState | null>(null)
  const [undoStack, setUndoStack] = useState<Routine[]>([])
  const [redoStack, setRedoStack] = useState<Routine[]>([])
  const [viewportTick, setViewportTick] = useState(0)
  const [dragOverWeekday, setDragOverWeekday] = useState<Weekday | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [draggingPayload, setDraggingPayload] = useState<DragPayload | null>(
    null,
  )
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
  const [isBlockPanelOpen, setIsBlockPanelOpen] = useState(false)
  const [isMobileBlockPickerOpen, setIsMobileBlockPickerOpen] = useState(false)
  const [isMobileBlockPickerVisible, setIsMobileBlockPickerVisible] =
    useState(false)
  const [mobilePaletteDragPreview, setMobilePaletteDragPreview] =
    useState<MobilePaletteDragPreviewState | null>(null)
  const [mobileRoutineBlockDragPreview, setMobileRoutineBlockDragPreview] =
    useState<MobileRoutineBlockDragPreviewState | null>(null)
  const dragStartOffsetMinutesRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)
  const openMenuRef = useRef<HTMLDivElement | null>(null)
  const editingDialogRef = useRef<HTMLDivElement | null>(null)
  const editingReturnFocusRef = useRef<HTMLElement | null>(null)
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null)
  const mobileTimelineScrollRef = useRef<HTMLDivElement | null>(null)
  const mobileDayLaneRef = useRef<HTMLDivElement | null>(null)
  const mobileSwipeContainerRef = useRef<HTMLDivElement | null>(null)
  const mobileSwipeTrackRef = useRef<HTMLDivElement | null>(null)
  const mobileSwipeStartRef = useRef<MobileSwipeState | null>(null)
  const mobileSwipeTimeoutRef = useRef<number | null>(null)
  const mobileSwipeAnimationFrameRef = useRef<number | null>(null)
  const mobileDaySwipeOffsetRef = useRef(0)
  const mobileBlockPickerSheetRef = useRef<HTMLDivElement | null>(null)
  const mobileBlockPickerCloseTimeoutRef = useRef<number | null>(null)
  const mobileBlockPickerDragRef = useRef<MobileBlockPickerDragState | null>(
    null,
  )
  const mobileBlockPickerIgnoreClickRef = useRef(false)
  const mobilePaletteDragRef = useRef<MobilePaletteDragState | null>(null)
  const mobilePaletteLongPressTimerRef = useRef<number | null>(null)
  const mobilePaletteDragCleanupRef = useRef<(() => void) | null>(null)
  const mobilePaletteDragFrameRef = useRef<number | null>(null)
  const mobilePalettePreviewRef = useRef<HTMLDivElement | null>(null)
  const mobilePalettePreviewTimeRef = useRef<HTMLSpanElement | null>(null)
  const mobileRoutineBlockDragRef = useRef<MobileRoutineBlockDragState | null>(
    null,
  )
  const mobileRoutineBlockLongPressTimerRef = useRef<number | null>(null)
  const mobileRoutineBlockDragCleanupRef = useRef<(() => void) | null>(null)
  const mobileRoutineBlockDragFrameRef = useRef<number | null>(null)
  const mobileRoutineBlockPreviewRef = useRef<HTMLDivElement | null>(null)
  const mobileRoutineBlockPreviewTimeRef = useRef<HTMLSpanElement | null>(null)
  const selectedDayColumnRef = useRef<HTMLDivElement | null>(null)
  const autoScrollDateKeyRef = useRef<string | null>(null)
  const mobileAutoScrollDateKeyRef = useRef<string | null>(null)
  const dragAutoScrollFrameRef = useRef<number | null>(null)
  const dragAutoScrollSpeedRef = useRef(0)

  useEffect(() => {
    if (!isMobileBlockPickerOpen) return

    const originalBodyOverflow = document.body.style.overflow
    const originalBodyOverscrollBehavior =
      document.body.style.overscrollBehavior

    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.body.style.overscrollBehavior = originalBodyOverscrollBehavior
    }
  }, [isMobileBlockPickerOpen])

  const selectedDate = parseDateKey(selectedDateKey)
  const selectedWeekday = getWeekdayFromDateKey(selectedDateKey)
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate])
  const selectedMonthLabel = getMonthLabel(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
  )
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
        return [
          day.key,
          getDayBlockLayouts(
            routineDay.blocks,
            timelineRange.startMinutes,
            fallbackStartMinutes,
          ),
        ] as const
      }),
    )
  }, [draftWeek, fallbackStartMinutes, timelineRange.startMinutes])
  const selectedDay = draftWeek
    ? getRoutineWeekDay(draftWeek, selectedWeekday)
    : null
  const conflictBlockIds = useMemo(
    () =>
      draftWeek
        ? getConflictingBlockIds(draftWeek, fallbackStartMinutes)
        : new Set<string>(),
    [draftWeek, fallbackStartMinutes],
  )
  const conflictMessage = useMemo(
    () =>
      draftWeek
        ? formatConflictMessage(
            getConflictWeekdays(draftWeek, fallbackStartMinutes),
          )
        : null,
    [draftWeek, fallbackStartMinutes],
  )

  const firstRoutineBlockStartMinutes = useMemo(() => {
    if (!draftWeek) return null

    const blockStarts = draftWeek.days.flatMap((day) =>
      day.blocks.map((block) =>
        getBlockStartMinutes(block, fallbackStartMinutes),
      ),
    )

    return blockStarts.length > 0 ? Math.min(...blockStarts) : null
  }, [draftWeek, fallbackStartMinutes])
  const timelineBaseHeight =
    TIMELINE_VERTICAL_PADDING * 2 +
    minutesToPixels(timelineRange.endMinutes - timelineRange.startMinutes)
  const timelineHeight = Math.max(
    timelineBaseHeight,
    ...Array.from(dayBlockLayouts.values()).flatMap((layouts) =>
      layouts.map((layout) => layout.top + layout.height + 84),
    ),
  )
  const mobileRoutineSnapshot = useMemo(
    () =>
      draftWeek
        ? upsertRoutineWeek(activeDraftRoutine, cloneRoutineWeek(draftWeek))
        : activeDraftRoutine,
    [activeDraftRoutine, draftWeek],
  )
  const mobileDayViews = useMemo(
    () =>
      ([-1, 0, 1] as const).map((offset) => {
        const dateKey = getDateKeyOffset(selectedDateKey, offset)
        const date = parseDateKey(dateKey)
        const weekday = getWeekdayFromDateKey(dateKey)
        const days = buildWeekDays(date)
        const dayInfo =
          days.find((day) => day.dateKey === dateKey) ??
          days[getWeekdayIndex(weekday)]
        const week = createRoutineWeekFromDate(dateKey, mobileRoutineSnapshot)
        const routineDay = getRoutineWeekDay(week, weekday)
        const layouts = getDayBlockLayouts(
          routineDay.blocks,
          timelineRange.startMinutes,
          fallbackStartMinutes,
        )
        const dayConflictBlockIds = getConflictingBlockIds(
          week,
          fallbackStartMinutes,
        )
        const dayTimelineHeight = Math.max(
          timelineBaseHeight,
          ...layouts.map((layout) => layout.top + layout.height + 84),
        )

        return {
          offset,
          dateKey,
          weekday,
          dayInfo,
          layouts,
          conflictBlockIds: dayConflictBlockIds,
          conflictMessage: formatConflictMessage(
            getConflictWeekdays(week, fallbackStartMinutes),
          ),
          timelineHeight: dayTimelineHeight,
        }
      }),
    [
      fallbackStartMinutes,
      mobileRoutineSnapshot,
      selectedDateKey,
      timelineBaseHeight,
      timelineRange.startMinutes,
    ],
  )

  useEffect(() => {
    if (isLoading) return

    const mentorProposal = loadMentorRoutineDraft()

    if (mentorProposal) {
      const nextRoutine = createRoutineFromMentorProposal(
        mentorProposal,
        routine,
      )

      clearMentorRoutineDraft()
      setDraftRoutine(nextRoutine)
      setUndoStack([JSON.parse(JSON.stringify(routine)) as Routine])
      setRedoStack([])
      setIsSaved(false)
      return
    }

    setDraftRoutine(routine)
  }, [isLoading, routine])

  useEffect(() => {
    if (isLoading) return

    const handleMentorRoutineDraft = () => {
      const mentorProposal = loadMentorRoutineDraft()
      if (!mentorProposal) return

      const previousRoutine = draftRoutine ?? routine
      const nextRoutine = createRoutineFromMentorProposal(
        mentorProposal,
        routine,
      )

      clearMentorRoutineDraft()
      setDraftRoutine(nextRoutine)
      setUndoStack([JSON.parse(JSON.stringify(previousRoutine)) as Routine])
      setRedoStack([])
      setSelectedDateKey(getTodayDateKey())
      setOpenMenuBlockId(null)
      setEditing(null)
      setDeleteConfirmation(null)
      setIsSaved(false)
    }

    window.addEventListener(
      STORAGE_EVENTS.mentorRoutineDraftChanged,
      handleMentorRoutineDraft,
    )
    return () =>
      window.removeEventListener(
        STORAGE_EVENTS.mentorRoutineDraftChanged,
        handleMentorRoutineDraft,
      )
  }, [draftRoutine, isLoading, routine])

  useEffect(() => {
    if (!draftRoutine) return

    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, draftRoutine))
    setOpenMenuBlockId(null)
    setEditing(null)
    setDragOverWeekday(null)
    setDragOverBlockId(null)
    setDraggingBlockId(null)
    setMobilePaletteDragPreview(null)
    setMobileRoutineBlockDragPreview(null)
    setIsMobileBlockPickerOpen(false)
    setIsMobileBlockPickerVisible(false)
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

  // As refs precisam ser lidas no instante do unmount, pois seus valores mudam durante a interação.
  useEffect(() => {
    return () => {
      clearTimeoutRef(toastTimerRef)
      clearTimeoutRef(mobileSwipeTimeoutRef)
      cancelAnimationFrameRef(mobileSwipeAnimationFrameRef)
      clearTimeoutRef(mobileBlockPickerCloseTimeoutRef)
      clearTimeoutRef(mobilePaletteLongPressTimerRef)
      cancelAnimationFrameRef(mobilePaletteDragFrameRef)
      clearTimeoutRef(mobileRoutineBlockLongPressTimerRef)
      cancelAnimationFrameRef(mobileRoutineBlockDragFrameRef)
      runCleanupRef(mobilePaletteDragCleanupRef)
      runCleanupRef(mobileRoutineBlockDragCleanupRef)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportTick((current) => current + 1)

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const workspace = workspaceScrollRef.current
    const autoScrollKey = `${selectedDateKey}-${viewportTick}`

    if (
      !workspace ||
      !draftWeek ||
      autoScrollDateKeyRef.current === autoScrollKey
    ) {
      return
    }

    autoScrollDateKeyRef.current = autoScrollKey

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
              Math.floor(
                (firstBlockStart - INITIAL_SCROLL_OFFSET_MINUTES) / 60,
              ) * 60,
            )
      const nextTop =
        firstBlockStart === null
          ? 0
          : TIMELINE_HEADER_HEIGHT +
            minutesToTimelineTop(targetStartMinutes, timelineRange.startMinutes)

      workspace.scrollTo({
        left: Math.max(0, nextLeft),
        top: Math.max(0, nextTop),
        behavior: "auto",
      })
    })
  }, [
    draftWeek,
    firstRoutineBlockStartMinutes,
    selectedDateKey,
    timelineRange.startMinutes,
    viewportTick,
  ])

  useEffect(() => {
    const mobileTimeline = mobileTimelineScrollRef.current
    const autoScrollKey = `${selectedDateKey}-${viewportTick}`

    if (
      !mobileTimeline ||
      !draftWeek ||
      mobileAutoScrollDateKeyRef.current === autoScrollKey
    ) {
      return
    }

    mobileAutoScrollDateKeyRef.current = autoScrollKey

    window.requestAnimationFrame(() => {
      const firstBlockStart = selectedDay?.blocks.length
        ? Math.min(
            ...selectedDay.blocks.map((block) =>
              getBlockStartMinutes(block, fallbackStartMinutes),
            ),
          )
        : null
      const targetStartMinutes =
        firstBlockStart === null
          ? timelineRange.startMinutes
          : Math.max(
              timelineRange.startMinutes,
              Math.floor(
                (firstBlockStart - INITIAL_SCROLL_OFFSET_MINUTES) / 60,
              ) * 60,
            )

      mobileTimeline.scrollTo({
        top:
          firstBlockStart === null
            ? 0
            : Math.max(
                0,
                minutesToTimelineTop(
                  targetStartMinutes,
                  timelineRange.startMinutes,
                ) - 20,
              ),
        behavior: "auto",
      })
    })
  }, [
    draftWeek,
    fallbackStartMinutes,
    selectedDateKey,
    selectedDay,
    timelineRange.startMinutes,
    viewportTick,
  ])

  const getRoutineWithCurrentDraftWeek = (
    baseRoutine: Routine = activeDraftRoutine,
  ) => {
    return draftWeek
      ? upsertRoutineWeek(baseRoutine, cloneRoutineWeek(draftWeek))
      : baseRoutine
  }

  const cloneRoutineSnapshot = (snapshot: Routine): Routine =>
    JSON.parse(JSON.stringify(snapshot)) as Routine

  const applyRoutineSnapshot = (snapshot: Routine) => {
    const nextSnapshot = cloneRoutineSnapshot(snapshot)

    setDraftRoutine(nextSnapshot)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextSnapshot))
    setIsSaved(JSON.stringify(nextSnapshot) === JSON.stringify(routine))
  }

  const pushUndoSnapshot = (
    snapshot: Routine = getRoutineWithCurrentDraftWeek(),
  ) => {
    setUndoStack((current) =>
      [...current, cloneRoutineSnapshot(snapshot)].slice(-30),
    )
    setRedoStack([])
  }

  const undoLastRoutineChange = () => {
    if (undoStack.length === 0) return

    const previousSnapshot = undoStack[undoStack.length - 1]
    const currentSnapshot = getRoutineWithCurrentDraftWeek()

    setUndoStack((current) => current.slice(0, -1))
    setRedoStack((current) =>
      [...current, cloneRoutineSnapshot(currentSnapshot)].slice(-30),
    )
    applyRoutineSnapshot(previousSnapshot)
    showToast({ message: "Alteração desfeita." })
  }

  const redoRoutineChange = () => {
    if (redoStack.length === 0) return

    const nextSnapshot = redoStack[redoStack.length - 1]
    const currentSnapshot = getRoutineWithCurrentDraftWeek()

    setRedoStack((current) => current.slice(0, -1))
    setUndoStack((current) =>
      [...current, cloneRoutineSnapshot(currentSnapshot)].slice(-30),
    )
    applyRoutineSnapshot(nextSnapshot)
    showToast({ message: "Alteração refeita." })
  }

  const showToast = (_toast: { message: string }) => {
    setToast(null)
  }

  const syncRecurringSeriesFromCurrentWeek = (
    routineToSync: Routine,
  ): Routine => {
    if (!draftWeek) return routineToSync

    const templatesBySeries = new Map<string, Map<Weekday, RoutineBlock>>()

    draftWeek.days.forEach((day) => {
      day.blocks.forEach((block) => {
        if (!block.repeatSourceId) return

        const templates =
          templatesBySeries.get(block.repeatSourceId) ??
          new Map<Weekday, RoutineBlock>()
        templates.set(day.weekday, block)
        templatesBySeries.set(block.repeatSourceId, templates)
      })
    })

    if (templatesBySeries.size === 0) return routineToSync

    return {
      ...routineToSync,
      weeks: (routineToSync.weeks ?? []).map((week) => ({
        ...week,
        days: week.days.map((day) => {
          let changed = false
          const blocks = day.blocks.map((candidate) => {
            const repeatSourceId = candidate.repeatSourceId
            if (!repeatSourceId) return candidate

            const template = templatesBySeries
              .get(repeatSourceId)
              ?.get(day.weekday)
            if (!template) return candidate

            changed = true
            return setBlockStartTime(
              { ...template, id: candidate.id, repeatSourceId },
              getBlockStartMinutes(template, fallbackStartMinutes),
            )
          })

          if (!changed) return day

          const normalizedBlocks = sortRoutineDayBlocksByTime(
            blocks,
            fallbackStartMinutes,
          )

          return {
            ...day,
            blocks: normalizedBlocks,
            isActive: normalizedBlocks.length > 0,
          }
        }),
      })),
    }
  }

  const moveWeek = (direction: -1 | 1) => {
    const nextRoutine = getRoutineWithCurrentDraftWeek()
    const nextDate = parseDateKey(selectedDateKey)

    nextDate.setDate(nextDate.getDate() + direction * 7)
    setDraftRoutine(nextRoutine)
    setSelectedDateKey(toDateKey(nextDate))
  }

  const selectDate = (dateKey: string) => {
    setDraftRoutine(getRoutineWithCurrentDraftWeek())
    setSelectedDateKey(dateKey)
  }

  const moveDay = (direction: -1 | 1) => {
    const nextDate = parseDateKey(selectedDateKey)

    nextDate.setDate(nextDate.getDate() + direction)
    selectDate(toDateKey(nextDate))
  }

  const shouldIgnoreMobileSwipeTarget = (target: EventTarget | null) => {
    return target instanceof Element
      ? Boolean(
          target.closest("button, a, input, textarea, select, [role='button']"),
        )
      : false
  }

  const clearMobileSwipeTimeout = () => {
    if (mobileSwipeTimeoutRef.current === null) return

    window.clearTimeout(mobileSwipeTimeoutRef.current)
    mobileSwipeTimeoutRef.current = null
  }

  const getMobileSwipeTransform = (offset: number) =>
    `translate3d(calc(-33.333333% + ${offset}px), 0, 0)`

  const setMobileSwipeTrackTransition = (isEnabled: boolean) => {
    const track = mobileSwipeTrackRef.current

    if (!track) return

    track.style.transition = isEnabled ? "transform 200ms ease-out" : "none"
  }

  const applyMobileSwipeOffset = (offset: number) => {
    mobileDaySwipeOffsetRef.current = offset

    if (mobileSwipeAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(mobileSwipeAnimationFrameRef.current)
    }

    mobileSwipeAnimationFrameRef.current = window.requestAnimationFrame(() => {
      const track = mobileSwipeTrackRef.current

      if (track) {
        track.style.transform = getMobileSwipeTransform(
          mobileDaySwipeOffsetRef.current,
        )
      }

      mobileSwipeAnimationFrameRef.current = null
    })
  }

  const finishMobileSwipeAnimation = (callback?: () => void) => {
    clearMobileSwipeTimeout()

    mobileSwipeTimeoutRef.current = window.setTimeout(() => {
      callback?.()
      setMobileSwipeTrackTransition(false)
      applyMobileSwipeOffset(0)
      mobileSwipeTimeoutRef.current = null
    }, 220)
  }

  const getMobileSwipeWidth = () =>
    mobileSwipeContainerRef.current?.getBoundingClientRect().width ??
    window.innerWidth

  const handleMobileSwipeStart = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    if (shouldIgnoreMobileSwipeTarget(event.target)) return

    clearMobileSwipeTimeout()
    setMobileSwipeTrackTransition(false)
    applyMobileSwipeOffset(0)

    mobileSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      intent: "pending",
      deltaX: 0,
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // O capture pode falhar em alguns navegadores; o swipe ainda funciona sem ele.
    }
  }

  const handleMobileSwipeMove = (event: ReactPointerEvent<HTMLElement>) => {
    const swipeStart = mobileSwipeStartRef.current

    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return

    const deltaX = event.clientX - swipeStart.x
    const deltaY = event.clientY - swipeStart.y
    const horizontalDistance = Math.abs(deltaX)
    const verticalDistance = Math.abs(deltaY)

    if (swipeStart.intent === "pending") {
      if (verticalDistance > 10 && verticalDistance >= horizontalDistance) {
        swipeStart.intent = "vertical"
        return
      }

      if (horizontalDistance > 10 && horizontalDistance > verticalDistance) {
        swipeStart.intent = "horizontal"
      }
    }

    if (swipeStart.intent !== "horizontal") return

    event.preventDefault()

    const swipeWidth = getMobileSwipeWidth()
    const maxOffset = Math.max(96, swipeWidth * 0.92)
    const nextOffset = Math.min(Math.max(deltaX, -maxOffset), maxOffset)

    swipeStart.deltaX = nextOffset
    applyMobileSwipeOffset(nextOffset)
  }

  const handleMobileSwipeEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const swipeStart = mobileSwipeStartRef.current

    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return

    mobileSwipeStartRef.current = null

    if (swipeStart.intent !== "horizontal") {
      setMobileSwipeTrackTransition(true)
      applyMobileSwipeOffset(0)
      finishMobileSwipeAnimation()
      return
    }

    const deltaX = swipeStart.deltaX || event.clientX - swipeStart.x
    const horizontalDistance = Math.abs(deltaX)
    const swipeWidth = getMobileSwipeWidth()
    const shouldChangeDay =
      horizontalDistance >= Math.min(80, swipeWidth * 0.22)

    setMobileSwipeTrackTransition(true)

    if (!shouldChangeDay) {
      applyMobileSwipeOffset(0)
      finishMobileSwipeAnimation()
      return
    }

    const direction = deltaX < 0 ? 1 : -1

    applyMobileSwipeOffset(direction > 0 ? -swipeWidth : swipeWidth)
    finishMobileSwipeAnimation(() => moveDay(direction))
  }

  const handleMobileSwipeCancel = () => {
    mobileSwipeStartRef.current = null
    setMobileSwipeTrackTransition(true)
    applyMobileSwipeOffset(0)
    finishMobileSwipeAnimation()
  }

  const updateDraftDay = (
    weekday: Weekday,
    updater: (day: RoutineDay) => RoutineDay,
  ) => {
    if (!draftWeek) return

    pushUndoSnapshot()

    const nextWeek = updateRoutineWeekDay(draftWeek, weekday, (day) => {
      const updatedDay = updater(day)
      const normalizedBlocks = sortRoutineDayBlocksByTime(
        updatedDay.blocks,
        fallbackStartMinutes,
      )

      return {
        ...updatedDay,
        blocks: normalizedBlocks,
        isActive: normalizedBlocks.length > 0,
      }
    })
    setDraftWeek(nextWeek)
    setIsSaved(false)
  }

  const openEditDialog = (block: RoutineBlock, weekday: Weekday) => {
    editingReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
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

  const closeEditing = () => {
    setEditing(null)
    window.requestAnimationFrame(() => {
      editingReturnFocusRef.current?.focus()
      editingReturnFocusRef.current = null
    })
  }

  const handleEditingDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeEditing()
      return
    }

    if (event.key !== "Tab") return

    const dialog = editingDialogRef.current
    if (!dialog) return

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        element.getAttribute("aria-hidden") !== "true" &&
        element.getClientRects().length > 0,
    )

    if (focusableElements.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

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

    const sourceDateKey = getDateKeyForWeekdayInWeek(
      draftWeek.weekStartDate,
      editingState.weekday,
    )
    const sourceDate = parseDateKey(sourceDateKey)

    if (editingState.repeatMode === "week-daily") {
      return WEEK_DAYS.map((day) =>
        getDateKeyForWeekdayInWeek(draftWeek.weekStartDate, day.key),
      )
    }

    if (editingState.repeatMode === "month-daily") {
      return getMonthDateKeys(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
      )
    }

    if (editingState.repeatMode === "month-weekday") {
      return getMonthDateKeys(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
      ).filter(
        (dateKey) => getWeekdayFromDateKey(dateKey) === editingState.weekday,
      )
    }

    if (editingState.repeatMode === "year-weekday") {
      return getYearWeekdayDateKeys(sourceDateKey, editingState.weekday)
    }

    return [toDateKey(sourceDate)]
  }

  const applyRepeatedBlock = (
    sourceBlock: RoutineBlock,
    targetDateKeys: string[],
  ) => {
    if (!editing || !draftWeek || targetDateKeys.length === 0) return

    pushUndoSnapshot()

    const repeatSourceId =
      sourceBlock.repeatSourceId ?? `repeat-${sourceBlock.id}`
    const sourceDateKey = getDateKeyForWeekdayInWeek(
      draftWeek.weekStartDate,
      editing.weekday,
    )

    const nextRoutine = targetDateKeys.reduce((currentRoutine, dateKey) => {
      const targetWeekday = getWeekdayFromDateKey(dateKey)
      const targetWeek = createRoutineWeekFromDate(dateKey, currentRoutine)
      const targetBlock: RoutineBlock = {
        ...sourceBlock,
        id:
          dateKey === sourceDateKey
            ? sourceBlock.id
            : createId(`block-${targetWeekday}`),
        repeatSourceId,
      }

      const updatedWeek = updateRoutineWeekDay(
        targetWeek,
        targetWeekday,
        (day) => {
          const blocks = day.blocks.filter(
            (block) =>
              block.id !== sourceBlock.id &&
              block.repeatSourceId !== repeatSourceId,
          )
          const normalizedBlocks = sortRoutineDayBlocksByTime(
            [...blocks, targetBlock],
            fallbackStartMinutes,
          )

          return {
            ...day,
            blocks: normalizedBlocks,
            isActive: normalizedBlocks.length > 0,
          }
        },
      )

      return upsertRoutineWeek(currentRoutine, updatedWeek)
    }, getRoutineWithCurrentDraftWeek())

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    setIsSaved(false)
  }

  const handleSaveBlock = () => {
    if (!editing) return

    const startMinutes =
      timeToMinutes(editing.startTime) ?? fallbackStartMinutes
    const normalizedDuration = Math.max(
      1,
      Math.floor(editing.durationMinutes || 1),
    )
    const normalizedDescription = editing.description.trim() || undefined

    if (editing.mode === "edit") {
      const currentDay = draftWeek
        ? getRoutineWeekDay(draftWeek, editing.weekday)
        : null
      const currentBlock = currentDay?.blocks.find(
        (block) => block.id === editing.blockId,
      )

      if (!currentBlock) {
        closeEditing()
        return
      }

      const repeatSourceId =
        editing.repeatMode === "none"
          ? currentBlock.repeatSourceId
          : (currentBlock.repeatSourceId ?? `repeat-${currentBlock.id}`)
      const updatedBlock = setBlockStartTime(
        {
          ...currentBlock,
          type: editing.type,
          title:
            editing.title.trim() ||
            getBuilderBlockOption(editing.type).defaultTitle,
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
        blocks: day.blocks.map((block) =>
          block.id === editing.blockId ? updatedBlock : block,
        ),
      }))

      closeEditing()
      return
    }

    const block = setBlockStartTime(
      createBlockFromEditing(editing),
      startMinutes,
    )

    if (editing.repeatMode !== "none") {
      applyRepeatedBlock(block, getRepeatTargetDateKeys(editing))
      closeEditing()
      return
    }

    updateDraftDay(editing.weekday, (day) => {
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
          const blocks = day.blocks.filter(
            (block) => block.repeatSourceId !== repeatSourceId,
          )

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
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= day.blocks.length)
        return day

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

      const maxScrollTop =
        currentWorkspace.scrollHeight - currentWorkspace.clientHeight
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

  const createBlockFromType = (
    type: RoutineBlockType,
    weekday: Weekday,
    startMinutes: number,
  ): RoutineBlock => {
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

  const moveBlockToDay = (
    sourceWeekday: Weekday,
    blockId: string,
    targetWeekday: Weekday,
    startMinutes: number,
  ) => {
    if (!draftWeek) return

    pushUndoSnapshot()

    const sourceDay = getRoutineWeekDay(draftWeek, sourceWeekday)
    const movedBlock = sourceDay.blocks.find((block) => block.id === blockId)

    if (!movedBlock) return

    const blockToInsert = setBlockStartTime(
      {
        ...movedBlock,
        id:
          sourceWeekday === targetWeekday
            ? movedBlock.id
            : createId(`block-${targetWeekday}`),
      },
      startMinutes,
    )

    const withMovedBlock = draftWeek.days.reduce((currentWeek, currentDay) => {
      if (
        currentDay.weekday !== sourceWeekday &&
        currentDay.weekday !== targetWeekday
      ) {
        return currentWeek
      }

      return updateRoutineWeekDay(currentWeek, currentDay.weekday, (day) => {
        const withoutMovedBlock = day.blocks.filter(
          (block) => block.id !== blockId,
        )
        const blocks =
          currentDay.weekday === targetWeekday
            ? [...withoutMovedBlock, blockToInsert]
            : withoutMovedBlock
        const normalizedBlocks = sortRoutineDayBlocksByTime(
          blocks,
          fallbackStartMinutes,
        )

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
    if (payload.kind === "palette")
      return getEditingDefaults(payload.blockType).durationMinutes

    const sourceDay = draftWeek
      ? getRoutineWeekDay(draftWeek, payload.sourceWeekday)
      : null
    return (
      sourceDay?.blocks.find((block) => block.id === payload.blockId)
        ?.durationMinutes ?? getEditingDefaults("study").durationMinutes
    )
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

      return [blockStart, blockEnd + 1, blockStart - duration - 1]
    })

    const validCandidates = candidates
      .map((candidate) =>
        clampMinutes(candidate, timelineRange.startMinutes, maxStartMinutes),
      )
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

  const getDragMinutesFromEvent = (
    event: DragEvent<HTMLElement>,
    durationMinutes = 1,
  ): number | null => {
    const currentTarget = event.currentTarget as HTMLElement
    const laneElement =
      currentTarget.dataset.routineDayLane === "true"
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

    return clampMinutes(
      adjustedMinutes,
      timelineRange.startMinutes,
      maxStartMinutes,
    )
  }

  const updateDragPreview = (
    event: DragEvent<HTMLElement>,
    weekday: Weekday,
    payload: DragPayload | null = draggingPayload,
  ) => {
    const durationMinutes = getDraggedBlockDuration(payload)
    const rawMinutes = getDragMinutesFromEvent(event, durationMinutes)

    if (rawMinutes === null) {
      setDragPreview(null)
      return null
    }

    const snapResult = getSnapResult(
      rawMinutes,
      weekday,
      durationMinutes,
      payload,
    )

    setDragPreview({
      weekday,
      minutes: snapResult.minutes,
      x: event.clientX,
      y: event.clientY,
      snapped: snapResult.snapped,
    })

    return snapResult.minutes
  }

  const handlePaletteDragStart = (
    event: DragEvent<HTMLButtonElement>,
    blockType: RoutineBlockType,
  ) => {
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
    insertBlockIntoDay(
      selectedWeekday,
      createBlockFromType(type, selectedWeekday, fallbackStartMinutes),
    )
  }

  const resetMobileBlockPickerSheetMotion = () => {
    const sheet = mobileBlockPickerSheetRef.current

    if (!sheet) return

    sheet.style.transition = ""
    sheet.style.transform = ""
  }

  const openMobileBlockPicker = () => {
    setOpenMenuBlockId(null)

    if (mobileBlockPickerCloseTimeoutRef.current !== null) {
      window.clearTimeout(mobileBlockPickerCloseTimeoutRef.current)
      mobileBlockPickerCloseTimeoutRef.current = null
    }

    resetMobileBlockPickerSheetMotion()
    setIsMobileBlockPickerOpen(true)
    setIsMobileBlockPickerVisible(false)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsMobileBlockPickerVisible(true))
    })
  }

  const closeMobileBlockPicker = () => {
    if (!isMobileBlockPickerOpen) return

    if (mobileBlockPickerCloseTimeoutRef.current !== null) {
      window.clearTimeout(mobileBlockPickerCloseTimeoutRef.current)
    }

    resetMobileBlockPickerSheetMotion()
    setIsMobileBlockPickerVisible(false)

    mobileBlockPickerCloseTimeoutRef.current = window.setTimeout(() => {
      setIsMobileBlockPickerOpen(false)
      resetMobileBlockPickerSheetMotion()
      mobileBlockPickerCloseTimeoutRef.current = null
    }, MOBILE_BLOCK_PICKER_TRANSITION_MS)
  }

  const closeMobileBlockPickerFromDrag = () => {
    if (mobileBlockPickerCloseTimeoutRef.current !== null) {
      window.clearTimeout(mobileBlockPickerCloseTimeoutRef.current)
    }

    setIsMobileBlockPickerVisible(false)

    const sheet = mobileBlockPickerSheetRef.current

    if (sheet) {
      sheet.style.transition = `transform ${MOBILE_BLOCK_PICKER_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      sheet.style.transform = "translate3d(0, 100%, 0)"
    }

    mobileBlockPickerCloseTimeoutRef.current = window.setTimeout(() => {
      setIsMobileBlockPickerOpen(false)
      resetMobileBlockPickerSheetMotion()
      mobileBlockPickerCloseTimeoutRef.current = null
    }, MOBILE_BLOCK_PICKER_TRANSITION_MS)
  }

  const handleMobileBlockPickerPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return

    event.stopPropagation()

    mobileBlockPickerDragRef.current = {
      y: event.clientY,
      pointerId: event.pointerId,
      deltaY: 0,
      isDragging: false,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleMobileBlockPickerPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = mobileBlockPickerDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) return

    event.stopPropagation()

    const rawDeltaY = event.clientY - dragState.y
    const deltaY = Math.max(0, rawDeltaY)

    if (!dragState.isDragging && deltaY < 6) return

    dragState.isDragging = true
    dragState.deltaY = deltaY
    mobileBlockPickerIgnoreClickRef.current = true
    event.preventDefault()

    const sheet = mobileBlockPickerSheetRef.current

    if (!sheet) return

    sheet.style.transition = "none"
    sheet.style.transform = `translate3d(0, ${Math.min(deltaY, 340)}px, 0)`
  }

  const handleMobileBlockPickerPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = mobileBlockPickerDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) return

    event.stopPropagation()
    mobileBlockPickerDragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const shouldClose =
      dragState.isDragging &&
      dragState.deltaY >= MOBILE_BLOCK_PICKER_CLOSE_THRESHOLD_PX

    if (shouldClose) {
      event.preventDefault()
      closeMobileBlockPickerFromDrag()
      window.setTimeout(() => {
        mobileBlockPickerIgnoreClickRef.current = false
      }, MOBILE_BLOCK_PICKER_TRANSITION_MS)
      return
    }

    const sheet = mobileBlockPickerSheetRef.current

    if (sheet) {
      sheet.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)"
      sheet.style.transform = "translate3d(0, 0, 0)"

      window.setTimeout(() => {
        resetMobileBlockPickerSheetMotion()
        mobileBlockPickerIgnoreClickRef.current = false
      }, 180)
    } else {
      mobileBlockPickerIgnoreClickRef.current = false
    }
  }

  const handleMobileBlockPickerClickCapture = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!mobileBlockPickerIgnoreClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    mobileBlockPickerIgnoreClickRef.current = false
  }

  const clearMobilePaletteLongPressTimer = () => {
    if (mobilePaletteLongPressTimerRef.current === null) return

    window.clearTimeout(mobilePaletteLongPressTimerRef.current)
    mobilePaletteLongPressTimerRef.current = null
  }

  const cleanupMobilePaletteDragListeners = () => {
    mobilePaletteDragCleanupRef.current?.()
    mobilePaletteDragCleanupRef.current = null
  }

  const getMobilePalettePreviewStartClientY = (clientY: number): number => {
    const previewHeight =
      mobilePalettePreviewRef.current?.getBoundingClientRect().height ??
      MOBILE_PALETTE_PREVIEW_FALLBACK_HEIGHT_PX

    return clientY - MOBILE_PALETTE_PREVIEW_Y_OFFSET_PX - previewHeight / 2
  }

  const getMobileTimelineDropResult = (
    clientX: number,
    previewStartY: number,
    durationMinutes: number,
    payload: DragPayload,
  ) => {
    const lane = mobileDayLaneRef.current

    if (!lane) return null

    const laneRect = lane.getBoundingClientRect()

    if (
      clientX < laneRect.left ||
      clientX > laneRect.right ||
      previewStartY < laneRect.top ||
      previewStartY > laneRect.bottom
    ) {
      return null
    }

    const rawMinutes = getTimelineMinutesFromPointer(
      previewStartY,
      lane,
      timelineRange.startMinutes,
      timelineRange.endMinutes,
    )
    const maxStartMinutes = Math.max(
      timelineRange.startMinutes,
      timelineRange.endMinutes - durationMinutes,
    )
    const steppedMinutes = snapMinutesToStep(
      rawMinutes,
      MOBILE_PALETTE_DROP_STEP_MINUTES,
    )
    const startMinutes = clampMinutes(
      steppedMinutes,
      timelineRange.startMinutes,
      maxStartMinutes,
    )
    const snapResult = getSnapResult(
      startMinutes,
      selectedWeekday,
      durationMinutes,
      payload,
    )

    return {
      minutes: snapResult.minutes,
      snapped: snapResult.snapped || snapResult.minutes !== rawMinutes,
    }
  }

  const getMobilePaletteDropResult = (
    clientX: number,
    clientY: number,
    blockType: RoutineBlockType,
  ) => {
    const previewStartY = getMobilePalettePreviewStartClientY(clientY)
    const durationMinutes = getEditingDefaults(blockType).durationMinutes

    return getMobileTimelineDropResult(
      clientX,
      previewStartY,
      durationMinutes,
      {
        kind: "palette",
        blockType,
      },
    )
  }

  const getMobilePalettePreviewLabel = (
    minutes: number | null,
    snapped: boolean,
  ) => {
    if (minutes === null) return "Arraste para um horário"

    return `${formatTimeLabel(minutes)}${snapped ? " · encaixado" : ""}`
  }

  const cancelMobilePaletteDragFrame = () => {
    if (mobilePaletteDragFrameRef.current === null) return

    window.cancelAnimationFrame(mobilePaletteDragFrameRef.current)
    mobilePaletteDragFrameRef.current = null
  }

  const applyMobilePaletteDragPreview = (
    clientX: number,
    clientY: number,
    blockType: RoutineBlockType,
  ) => {
    const dropResult = getMobilePaletteDropResult(clientX, clientY, blockType)
    const preview = mobilePalettePreviewRef.current
    const timeLabel = mobilePalettePreviewTimeRef.current

    if (preview) {
      preview.style.left = `${clientX}px`
      preview.style.top = `${clientY - MOBILE_PALETTE_PREVIEW_Y_OFFSET_PX}px`
      preview.style.opacity = dropResult ? "1" : "0.75"
    }

    if (timeLabel) {
      timeLabel.textContent = getMobilePalettePreviewLabel(
        dropResult?.minutes ?? null,
        dropResult?.snapped ?? false,
      )
    }
  }

  const scheduleMobilePaletteDragPreview = (
    clientX: number,
    clientY: number,
  ) => {
    const dragState = mobilePaletteDragRef.current

    if (dragState) {
      dragState.currentX = clientX
      dragState.currentY = clientY
    }

    if (mobilePaletteDragFrameRef.current !== null) return

    mobilePaletteDragFrameRef.current = window.requestAnimationFrame(() => {
      mobilePaletteDragFrameRef.current = null

      const latestDragState = mobilePaletteDragRef.current

      if (!latestDragState?.isDragging) return

      applyMobilePaletteDragPreview(
        latestDragState.currentX,
        latestDragState.currentY,
        latestDragState.blockType,
      )
    })
  }

  const showInitialMobilePaletteDragPreview = (
    clientX: number,
    clientY: number,
    blockType: RoutineBlockType,
  ) => {
    const dropResult = getMobilePaletteDropResult(clientX, clientY, blockType)

    setMobilePaletteDragPreview({
      blockType,
      x: clientX,
      y: clientY,
      minutes: dropResult?.minutes ?? null,
      snapped: dropResult?.snapped ?? false,
      isOverTimeline: Boolean(dropResult),
    })

    window.requestAnimationFrame(() => {
      applyMobilePaletteDragPreview(clientX, clientY, blockType)
    })
  }

  const finishMobilePaletteDrag = (event: PointerEvent) => {
    const dragState = mobilePaletteDragRef.current

    clearMobilePaletteLongPressTimer()
    cleanupMobilePaletteDragListeners()
    cancelMobilePaletteDragFrame()
    mobilePaletteDragRef.current = null

    if (!dragState) return

    if (dragState.isDragging) {
      event.preventDefault()
      const dropResult = getMobilePaletteDropResult(
        event.clientX,
        event.clientY,
        dragState.blockType,
      )

      if (dropResult) {
        insertBlockIntoDay(
          selectedWeekday,
          createBlockFromType(
            dragState.blockType,
            selectedWeekday,
            dropResult.minutes,
          ),
        )
      }
    }

    setDraggingPayload(null)
    setDragPreview(null)
    setMobilePaletteDragPreview(null)
  }

  const cancelMobilePaletteDrag = () => {
    clearMobilePaletteLongPressTimer()
    cleanupMobilePaletteDragListeners()
    cancelMobilePaletteDragFrame()
    mobilePaletteDragRef.current = null
    setDraggingPayload(null)
    setDragPreview(null)
    setMobilePaletteDragPreview(null)
  }

  const startMobilePaletteDrag = () => {
    const dragState = mobilePaletteDragRef.current

    if (!dragState || dragState.isDragging) return

    dragState.isDragging = true
    setDraggingPayload({ kind: "palette", blockType: dragState.blockType })
    setOpenMenuBlockId(null)
    closeMobileBlockPickerFromDrag()
    showInitialMobilePaletteDragPreview(
      dragState.currentX,
      dragState.currentY,
      dragState.blockType,
    )
  }

  const handleMobilePaletteBlockPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    blockType: RoutineBlockType,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    clearMobilePaletteLongPressTimer()
    cleanupMobilePaletteDragListeners()

    mobilePaletteDragRef.current = {
      blockType,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      isDragging: false,
    }

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const dragState = mobilePaletteDragRef.current

      if (!dragState || dragState.pointerId !== pointerEvent.pointerId) return

      dragState.currentX = pointerEvent.clientX
      dragState.currentY = pointerEvent.clientY

      const deltaX = pointerEvent.clientX - dragState.startX
      const deltaY = pointerEvent.clientY - dragState.startY
      const distance = Math.hypot(deltaX, deltaY)

      if (
        !dragState.isDragging &&
        distance > MOBILE_PALETTE_LONG_PRESS_CANCEL_DISTANCE_PX
      ) {
        cancelMobilePaletteDrag()
        return
      }

      if (!dragState.isDragging) return

      pointerEvent.preventDefault()
      scheduleMobilePaletteDragPreview(
        pointerEvent.clientX,
        pointerEvent.clientY,
      )
    }

    const handlePointerEnd = (pointerEvent: PointerEvent) => {
      if (mobilePaletteDragRef.current?.pointerId !== pointerEvent.pointerId)
        return

      finishMobilePaletteDrag(pointerEvent)
    }

    const handlePointerCancel = (pointerEvent: PointerEvent) => {
      if (mobilePaletteDragRef.current?.pointerId !== pointerEvent.pointerId)
        return

      cancelMobilePaletteDrag()
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerCancel)

    mobilePaletteDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }

    mobilePaletteLongPressTimerRef.current = window.setTimeout(() => {
      mobilePaletteLongPressTimerRef.current = null
      startMobilePaletteDrag()
    }, MOBILE_PALETTE_LONG_PRESS_MS)
  }

  const clearMobileRoutineBlockLongPressTimer = () => {
    if (mobileRoutineBlockLongPressTimerRef.current !== null) {
      window.clearTimeout(mobileRoutineBlockLongPressTimerRef.current)
      mobileRoutineBlockLongPressTimerRef.current = null
    }
  }

  const cleanupMobileRoutineBlockDragListeners = () => {
    mobileRoutineBlockDragCleanupRef.current?.()
    mobileRoutineBlockDragCleanupRef.current = null
  }

  const getMobileRoutineBlockDropResult = (
    dragState: MobileRoutineBlockDragState,
  ) => {
    const previewStartY = dragState.currentY - dragState.pointerOffsetY

    return getMobileTimelineDropResult(
      dragState.currentX,
      previewStartY,
      dragState.block.durationMinutes,
      {
        kind: "block",
        sourceWeekday: dragState.weekday,
        blockId: dragState.block.id,
      },
    )
  }

  const getMobileRoutineBlockPreviewLabel = (
    minutes: number | null,
    snapped: boolean,
  ) => {
    if (minutes === null) return "Arraste dentro da rotina"

    return `${formatTimeLabel(minutes)}${snapped ? " · encaixado" : ""}`
  }

  const cancelMobileRoutineBlockDragFrame = () => {
    if (mobileRoutineBlockDragFrameRef.current === null) return

    window.cancelAnimationFrame(mobileRoutineBlockDragFrameRef.current)
    mobileRoutineBlockDragFrameRef.current = null
  }

  const applyMobileRoutineBlockDragPreview = () => {
    const dragState = mobileRoutineBlockDragRef.current
    const preview = mobileRoutineBlockPreviewRef.current
    const timeLabel = mobileRoutineBlockPreviewTimeRef.current

    if (!dragState) return

    const lane = mobileDayLaneRef.current
    const laneRect = lane?.getBoundingClientRect()
    const dropResult = getMobileRoutineBlockDropResult(dragState)
    const previewStartY = dragState.currentY - dragState.pointerOffsetY
    const previewCenterY = previewStartY + dragState.blockHeight / 2
    const previewCenterX = laneRect
      ? Math.min(
          Math.max(dragState.currentX, laneRect.left + 24),
          laneRect.right - 24,
        )
      : dragState.currentX

    if (preview) {
      preview.style.left = `${previewCenterX}px`
      preview.style.top = `${previewCenterY}px`
      preview.style.opacity = dropResult ? "1" : "0.45"
    }

    if (timeLabel) {
      timeLabel.textContent = getMobileRoutineBlockPreviewLabel(
        dropResult?.minutes ?? null,
        dropResult?.snapped ?? false,
      )
    }
  }

  const scheduleMobileRoutineBlockDragPreview = (
    clientX: number,
    clientY: number,
  ) => {
    const dragState = mobileRoutineBlockDragRef.current

    if (dragState) {
      dragState.currentX = clientX
      dragState.currentY = clientY
    }

    if (mobileRoutineBlockDragFrameRef.current !== null) return

    mobileRoutineBlockDragFrameRef.current = window.requestAnimationFrame(
      () => {
        mobileRoutineBlockDragFrameRef.current = null
        const latestDragState = mobileRoutineBlockDragRef.current

        if (!latestDragState?.isDragging) return

        applyMobileRoutineBlockDragPreview()
      },
    )
  }

  const showInitialMobileRoutineBlockDragPreview = (
    dragState: MobileRoutineBlockDragState,
  ) => {
    const dropResult = getMobileRoutineBlockDropResult(dragState)
    const previewStartY = dragState.currentY - dragState.pointerOffsetY

    setMobileRoutineBlockDragPreview({
      block: dragState.block,
      x: dragState.currentX,
      y: previewStartY + dragState.blockHeight / 2,
      minutes: dropResult?.minutes ?? null,
      snapped: dropResult?.snapped ?? false,
      isOverTimeline: Boolean(dropResult),
      height: dragState.blockHeight,
    })

    window.requestAnimationFrame(() => {
      applyMobileRoutineBlockDragPreview()
    })
  }

  const finishMobileRoutineBlockDrag = (event: PointerEvent) => {
    const dragState = mobileRoutineBlockDragRef.current

    clearMobileRoutineBlockLongPressTimer()
    cleanupMobileRoutineBlockDragListeners()
    cancelMobileRoutineBlockDragFrame()
    mobileRoutineBlockDragRef.current = null

    if (!dragState) return

    if (dragState.isDragging) {
      event.preventDefault()
      const dropResult = getMobileRoutineBlockDropResult(dragState)

      if (dropResult) {
        moveBlockToDay(
          dragState.weekday,
          dragState.block.id,
          selectedWeekday,
          dropResult.minutes,
        )
      }
    }

    setDraggingPayload(null)
    setDraggingBlockId(null)
    setDragPreview(null)
    setMobileRoutineBlockDragPreview(null)
  }

  const cancelMobileRoutineBlockDrag = () => {
    clearMobileRoutineBlockLongPressTimer()
    cleanupMobileRoutineBlockDragListeners()
    cancelMobileRoutineBlockDragFrame()
    mobileRoutineBlockDragRef.current = null
    setDraggingPayload(null)
    setDraggingBlockId(null)
    setDragPreview(null)
    setMobileRoutineBlockDragPreview(null)
  }

  const startMobileRoutineBlockDrag = () => {
    const dragState = mobileRoutineBlockDragRef.current

    if (!dragState || dragState.isDragging) return

    dragState.isDragging = true
    setDraggingPayload({
      kind: "block",
      sourceWeekday: dragState.weekday,
      blockId: dragState.block.id,
    })
    setDraggingBlockId(dragState.block.id)
    setOpenMenuBlockId(null)
    showInitialMobileRoutineBlockDragPreview(dragState)
  }

  const handleMobileRoutineBlockPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    block: RoutineBlock,
    weekday: Weekday,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return

    event.stopPropagation()

    const target = event.target

    if (target instanceof HTMLElement && target.closest("button")) return

    const blockRect = event.currentTarget.getBoundingClientRect()

    clearMobileRoutineBlockLongPressTimer()
    cleanupMobileRoutineBlockDragListeners()

    mobileRoutineBlockDragRef.current = {
      block,
      weekday,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      pointerOffsetY: Math.min(
        Math.max(event.clientY - blockRect.top, 0),
        blockRect.height,
      ),
      blockHeight: blockRect.height,
      isDragging: false,
    }

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const dragState = mobileRoutineBlockDragRef.current

      if (!dragState || dragState.pointerId !== pointerEvent.pointerId) return

      dragState.currentX = pointerEvent.clientX
      dragState.currentY = pointerEvent.clientY

      const deltaX = pointerEvent.clientX - dragState.startX
      const deltaY = pointerEvent.clientY - dragState.startY
      const distance = Math.hypot(deltaX, deltaY)

      if (
        !dragState.isDragging &&
        distance > MOBILE_ROUTINE_BLOCK_LONG_PRESS_CANCEL_DISTANCE_PX
      ) {
        cancelMobileRoutineBlockDrag()
        return
      }

      if (!dragState.isDragging) return

      pointerEvent.preventDefault()
      scheduleMobileRoutineBlockDragPreview(
        pointerEvent.clientX,
        pointerEvent.clientY,
      )
    }

    const handlePointerEnd = (pointerEvent: PointerEvent) => {
      if (
        mobileRoutineBlockDragRef.current?.pointerId !== pointerEvent.pointerId
      )
        return

      finishMobileRoutineBlockDrag(pointerEvent)
    }

    const handlePointerCancel = (pointerEvent: PointerEvent) => {
      if (
        mobileRoutineBlockDragRef.current?.pointerId !== pointerEvent.pointerId
      )
        return

      cancelMobileRoutineBlockDrag()
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerCancel)

    mobileRoutineBlockDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }

    mobileRoutineBlockLongPressTimerRef.current = window.setTimeout(() => {
      mobileRoutineBlockLongPressTimerRef.current = null
      startMobileRoutineBlockDrag()
    }, MOBILE_ROUTINE_BLOCK_LONG_PRESS_MS)
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
          <span className="text-foreground block text-base font-semibold">
            {option.label}
          </span>
          <span className="text-muted-foreground mt-2 block text-sm">
            {option.defaultDurationMinutes}min
          </span>
        </button>
      ))}
    </div>
  )

  const handleBlockDragStart = (
    event: DragEvent<HTMLDivElement>,
    block: RoutineBlock,
    weekday: Weekday,
  ) => {
    const payload: DragPayload = {
      kind: "block",
      sourceWeekday: weekday,
      blockId: block.id,
    }
    const blockRect = event.currentTarget.getBoundingClientRect()
    const pointerOffsetPixels = Math.min(
      Math.max(event.clientY - blockRect.top, 0),
      blockRect.height,
    )
    const pointerOffsetRatio =
      blockRect.height > 0 ? pointerOffsetPixels / blockRect.height : 0
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

  const handleDayDragOver = (
    event: DragEvent<HTMLElement>,
    weekday: Weekday,
  ) => {
    event.preventDefault()
    updateDragAutoScroll(event)
    event.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy"
    setDragOverWeekday(weekday)
    setDragOverBlockId(null)
    updateDragPreview(event, weekday)
  }

  const handleBlockDragOver = (
    event: DragEvent<HTMLDivElement>,
    weekday: Weekday,
    blockId: string,
  ) => {
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
        ? getSnapResult(rawDropMinutes, weekday, durationMinutes, payload)
            .minutes
        : (dragPreview?.minutes ?? timelineRange.startMinutes)

    if (payload.kind === "palette") {
      insertBlockIntoDay(
        weekday,
        createBlockFromType(payload.blockType, weekday, startMinutes),
      )
    } else {
      moveBlockToDay(
        payload.sourceWeekday,
        payload.blockId,
        weekday,
        startMinutes,
      )
    }

    clearDragState()
  }

  const saveCurrentMonthRoutine = () => {
    if (isSaved) return

    const nextRoutine = syncRecurringSeriesFromCurrentWeek(
      getRoutineWithCurrentDraftWeek(),
    )

    setDraftRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    saveRoutine(nextRoutine)
    setIsSaved(true)
    setUndoStack([])
    setRedoStack([])
    showToast({ message: "Rotina salva com sucesso." })
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

    const nextRoutine = weekStartKeys.reduce(
      (currentRoutine, weekStartDate) => {
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
      },
      getRoutineWithCurrentDraftWeek(),
    )

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
        <div className="text-muted-foreground p-6 text-center text-base">
          Carregando rotina...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="hidden xl:block">
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
                    className="bg-background/80 shrink-0 rounded-full shadow-sm"
                    onClick={() => moveWeek(-1)}
                    aria-label="Semana anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <h2 className="text-foreground min-w-0 flex-1 text-center text-xl font-semibold sm:text-2xl">
                    {selectedMonthLabel}
                  </h2>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="bg-background/80 shrink-0 rounded-full shadow-sm"
                    onClick={() => moveWeek(1)}
                    aria-label="Próxima semana"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div
                ref={workspaceScrollRef}
                className="border-border/50 bg-muted/10 max-h-[calc(100svh-15rem)] overflow-auto overscroll-contain rounded-[1.75rem] border p-3 shadow-sm sm:p-4"
              >
                <div
                  className="routine-builder-scheduler-grid grid min-w-[1240px] items-stretch gap-x-2 gap-y-3 2xl:min-w-0 2xl:gap-x-3"
                  style={{
                    ["--routine-builder-timeline-height" as string]: `${timelineHeight}px`,
                    gridTemplateColumns: "76px repeat(7, minmax(152px, 1fr))",
                    gridTemplateRows: `${TIMELINE_HEADER_HEIGHT}px ${timelineHeight}px`,
                  }}
                >
                  <div
                    className="sticky top-0 z-30 min-h-16"
                    aria-hidden="true"
                  />

                  {weekDays.map((day) => (
                    <div
                      key={`${day.dateKey}-header`}
                      ref={
                        day.key === selectedWeekday
                          ? selectedDayColumnRef
                          : undefined
                      }
                      className={cn(
                        "routine-builder-day-header border-border/60 bg-background/95 sticky top-0 z-30 flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.25rem] border px-3 py-2 shadow-sm backdrop-blur",
                        day.isToday &&
                          "routine-builder-day-header-today border-cyan-400/80 bg-cyan-400/10 shadow-cyan-400/10",
                      )}
                    >
                      <span className="text-muted-foreground text-sm leading-5 font-medium">
                        {day.label}
                      </span>
                      <span className="text-foreground font-mono text-xl leading-none font-semibold tabular-nums">
                        {day.dayNumber}
                      </span>
                    </div>
                  ))}

                  <div
                    className="routine-builder-time-column border-border/40 bg-background/70 relative rounded-[1.5rem] border shadow-sm"
                    style={{ height: timelineHeight }}
                  >
                    {timeSlots.map((slot) => (
                      <span
                        key={`time-${slot}`}
                        className="routine-builder-time-label text-muted-foreground absolute right-0 left-0 -translate-y-1/2 text-center text-sm leading-5 whitespace-nowrap"
                        style={{
                          top:
                            minutesToTimelineTop(
                              slot,
                              timelineRange.startMinutes,
                            ) +
                            HOUR_ROW_HEIGHT / 2,
                        }}
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
                          dragOverWeekday === day.key &&
                            "routine-builder-day-lane-active",
                        )}
                        data-routine-day-lane="true"
                        data-routine-weekday={day.key}
                        style={{ height: timelineHeight }}
                        onDragOver={(event) =>
                          handleDayDragOver(event, day.key)
                        }
                        onDrop={(event) => handleDrop(event, day.key)}
                        onDragEnd={clearDragState}
                      >
                        {timeSlots.map((slot) => (
                          <span
                            key={`${day.dateKey}-line-${slot}`}
                            className="routine-builder-hour-line border-border/50 absolute right-0 left-0 border-t"
                            style={{
                              top: minutesToTimelineTop(
                                slot,
                                timelineRange.startMinutes,
                              ),
                            }}
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
                              onDragStart={(event) =>
                                handleBlockDragStart(event, block, day.key)
                              }
                              onDragOver={(event) =>
                                handleBlockDragOver(event, day.key, block.id)
                              }
                              onDrop={(event) => handleDrop(event, day.key)}
                              onDragEnd={clearDragState}
                              ref={menuOpen ? openMenuRef : undefined}
                              className={cn(
                                "routine-builder-schedule-block group absolute right-2 left-2 cursor-grab overflow-visible rounded-2xl border text-left shadow-sm transition active:cursor-grabbing",
                                menuOpen ? "z-[900]" : "z-20",
                                option.className,
                                hasConflict &&
                                  "border-red-400/80 bg-red-500/20 ring-1 shadow-red-950/30 ring-red-400/50",
                                draggingBlockId === block.id && "opacity-50",
                                dragOverBlockId === block.id &&
                                  "ring-primary/60 ring-2",
                                isCompactBlock ? "px-2 py-1.5" : "p-3",
                              )}
                              style={{ top, height }}
                              data-routine-block-id={block.id}
                              data-routine-block-start-time={block.startTime}
                            >
                              <div
                                className={cn(
                                  "flex h-full min-w-0 justify-between gap-2",
                                  isCompactBlock
                                    ? "items-center"
                                    : "items-start",
                                )}
                              >
                                <div
                                  className={cn(
                                    "min-w-0 flex-1",
                                    isCompactBlock
                                      ? "flex items-center gap-2"
                                      : "",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "text-foreground block font-semibold wrap-break-word",
                                      isCompactBlock
                                        ? "truncate text-sm leading-none"
                                        : "text-base leading-snug whitespace-normal",
                                      hasConflict && "text-red-50",
                                    )}
                                  >
                                    {block.title}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-muted-foreground text-sm",
                                      hasConflict && "text-red-100/80",
                                      isCompactBlock
                                        ? "shrink-0 leading-none"
                                        : "mt-1 block leading-5",
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
                                  onClick={() =>
                                    setOpenMenuBlockId(
                                      menuOpen ? null : block.id,
                                    )
                                  }
                                  aria-label="Abrir ações do bloco"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </div>

                              {menuOpen ? (
                                <div
                                  className="border-border text-foreground absolute top-0 left-full z-[9999] ml-3 grid min-w-44 gap-1 rounded-2xl border p-2 shadow-[0_28px_90px_rgba(0,0,0,1)] ring-1 ring-white/10"
                                  style={{
                                    backgroundColor: "#050b12",
                                    isolation: "isolate",
                                  }}
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-9 justify-start"
                                    onClick={() =>
                                      openEditDialog(block, day.key)
                                    }
                                  >
                                    <Pencil className="mr-2 size-4" />
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-9 justify-start"
                                    onClick={() =>
                                      duplicateBlock(block, day.key)
                                    }
                                  >
                                    <Copy className="mr-2 size-4" />
                                    Duplicar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-9 justify-start"
                                    disabled={blockIndex === 0}
                                    onClick={() =>
                                      moveBlock(block.id, -1, day.key)
                                    }
                                  >
                                    ↑ Subir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-9 justify-start"
                                    disabled={blockIndex === layouts.length - 1}
                                    onClick={() =>
                                      moveBlock(block.id, 1, day.key)
                                    }
                                  >
                                    ↓ Descer
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive min-h-9 justify-start"
                                    onClick={() =>
                                      requestDeleteBlock(block, day.key)
                                    }
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
                        "border-border bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-not-allowed border opacity-70",
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
                "routine-builder-block-panel fixed top-24 right-0 z-40 h-[calc(100vh-7rem)] w-[320px] transition-transform duration-300",
                "xl:block",
                isBlockPanelOpen
                  ? "translate-x-0"
                  : "translate-x-[calc(100%-12px)]",
              )}
              aria-label="Painel de blocos"
              onMouseEnter={() => setIsBlockPanelOpen(true)}
              onMouseLeave={() => setIsBlockPanelOpen(false)}
            >
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 left-0 -translate-x-[calc(100%+0.5rem)] -translate-y-1/2 transition-all duration-300 ease-out",
                  isBlockPanelOpen
                    ? "scale-90 opacity-0"
                    : "scale-100 opacity-100",
                )}
                aria-hidden="true"
              >
                <div className="routine-builder-panel-hint-motion flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-400/10 shadow-[0_12px_32px_rgba(0,0,0,0.28)] ring-1 ring-cyan-300/10 backdrop-blur-xl">
                  <ChevronRight className="size-5 text-cyan-200" />
                </div>
              </div>

              <div className="border-border/70 bg-background/95 h-full rounded-l-2xl border border-r-0 p-4 shadow-2xl backdrop-blur">
                <h2 className="text-foreground mb-4 text-xl font-semibold">
                  Blocos
                </h2>

                {renderBlockPalette()}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="xl:hidden">
        <section className="bg-background -mx-4 -my-6 flex h-[calc(100svh-3.5rem)] flex-col sm:-mx-6 sm:-my-8 sm:h-[calc(100svh-4rem)]">
          <header className="border-border/70 bg-background/95 z-30 border-b px-3 py-3 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="size-9 rounded-full"
                onClick={onBackToSettings}
                aria-label="Voltar para configurações"
              >
                <ChevronLeft className="size-5" />
              </Button>

              <h1 className="text-foreground min-w-0 flex-1 truncate px-1 text-sm font-semibold sm:text-lg">
                {selectedMonthLabel}
              </h1>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full"
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
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={redoRoutineChange}
                  disabled={redoStack.length === 0}
                  aria-label="Refazer alteração"
                  title="Refazer"
                >
                  <Redo2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "h-8 rounded-full px-2.5 text-sm",
                    isSaved &&
                      "border-border bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-not-allowed border opacity-70",
                  )}
                  onClick={saveCurrentMonthRoutine}
                  disabled={isSaved}
                >
                  <Save className="hidden size-3.5 sm:block" />
                  {isSaved ? "Salvo" : "Salvar"}
                </Button>
              </div>
            </div>
          </header>

          <div
            ref={mobileSwipeContainerRef}
            data-mobile-swipe-container="true"
            className="relative flex-1 overflow-hidden"
            onPointerDown={handleMobileSwipeStart}
            onPointerMove={handleMobileSwipeMove}
            onPointerUp={handleMobileSwipeEnd}
            onPointerCancel={handleMobileSwipeCancel}
          >
            <div
              ref={mobileSwipeTrackRef}
              className="flex h-full w-[300%] will-change-transform"
              style={{
                transform: getMobileSwipeTransform(0),
                transition: "none",
              }}
            >
              {mobileDayViews.map((dayView) => {
                const isCurrentMobileDay = dayView.offset === 0

                return (
                  <div
                    key={dayView.dateKey}
                    className="flex h-full w-1/3 shrink-0 flex-col overflow-hidden"
                    aria-hidden={!isCurrentMobileDay}
                  >
                    <div className="border-border/60 bg-background border-b px-4 py-5 sm:px-6">
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate text-sm font-medium">
                          {dayView.dayInfo.isToday
                            ? "Dia atual"
                            : "Dia selecionado"}
                        </p>
                        <p className="text-foreground mt-1 truncate text-2xl font-semibold sm:text-3xl">
                          {dayView.dayInfo.label}, {dayView.dayInfo.dayNumber}
                        </p>
                      </div>

                      {dayView.conflictMessage ? (
                        <p className="mt-3 flex items-start gap-2 text-sm leading-5 font-medium text-red-300">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <span className="min-w-0">
                            {dayView.conflictMessage}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div
                      ref={
                        isCurrentMobileDay ? mobileTimelineScrollRef : undefined
                      }
                      className="relative flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pt-2 pb-28 sm:px-5"
                    >
                      <div
                        className="relative mx-auto w-full max-w-4xl"
                        style={{ height: dayView.timelineHeight }}
                      >
                        {timeSlots.map((slot) => (
                          <div
                            key={`mobile-time-${dayView.dateKey}-${slot}`}
                            className="absolute right-0 left-0 flex items-center gap-2"
                            style={{
                              top: minutesToTimelineTop(
                                slot,
                                timelineRange.startMinutes,
                              ),
                            }}
                            aria-hidden="true"
                          >
                            <span className="text-muted-foreground font-mono text-[0.7rem] leading-none whitespace-nowrap tabular-nums sm:w-14 sm:text-xs">
                              {formatTimeLabel(slot)}
                            </span>
                            <span className="border-border/55 min-w-0 flex-1 border-t" />
                          </div>
                        ))}

                        <div
                          ref={
                            isCurrentMobileDay ? mobileDayLaneRef : undefined
                          }
                          className="absolute top-0 right-0 bottom-0 left-[3.25rem] sm:left-[4.5rem]"
                          data-mobile-routine-day-lane="true"
                          data-mobile-current-day={
                            isCurrentMobileDay ? "true" : "false"
                          }
                          data-routine-weekday={dayView.weekday}
                        >
                          {dayView.layouts.map(
                            ({ block, top, height }, blockIndex) => {
                              const option = getBuilderBlockOption(block.type)
                              const menuOpen =
                                isCurrentMobileDay &&
                                openMenuBlockId === block.id
                              const hasConflict = dayView.conflictBlockIds.has(
                                block.id,
                              )
                              const isCompactBlock = height < 54

                              return (
                                <div
                                  key={block.id}
                                  ref={menuOpen ? openMenuRef : undefined}
                                  className={cn(
                                    "absolute z-10 touch-none overflow-visible rounded-2xl border text-left shadow-sm select-none",
                                    option.className,
                                    hasConflict &&
                                      "border-red-400/80 bg-red-500/25 ring-1 shadow-red-950/30 ring-red-400/50",
                                    draggingBlockId === block.id &&
                                      "opacity-30",
                                    isCompactBlock ? "px-2 py-1.5" : "p-3",
                                  )}
                                  onPointerDown={(event) =>
                                    isCurrentMobileDay
                                      ? handleMobileRoutineBlockPointerDown(
                                          event,
                                          block,
                                          dayView.weekday,
                                        )
                                      : undefined
                                  }
                                  style={{
                                    top,
                                    height,
                                    left: 8,
                                    right: 0,
                                  }}
                                  data-routine-block-id={block.id}
                                  data-routine-block-start-time={
                                    block.startTime
                                  }
                                >
                                  <div className="flex h-full min-w-0 items-start justify-between gap-2">
                                    <div
                                      className={cn(
                                        "min-w-0 flex-1 text-left",
                                        isCompactBlock &&
                                          "flex items-center gap-2 overflow-hidden",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "text-foreground block truncate font-semibold",
                                          isCompactBlock
                                            ? "min-w-0 flex-1 text-sm leading-none"
                                            : "text-base leading-snug",
                                          hasConflict && "text-red-50",
                                        )}
                                      >
                                        {block.title}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-muted-foreground block truncate text-xs",
                                          isCompactBlock
                                            ? "mt-0 shrink-0 leading-none"
                                            : "mt-0.5",
                                          hasConflict && "text-red-100/80",
                                        )}
                                      >
                                        {block.durationMinutes}min
                                      </span>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="-mt-1 -mr-1 size-7 shrink-0 rounded-full"
                                      onClick={() =>
                                        isCurrentMobileDay
                                          ? setOpenMenuBlockId(
                                              menuOpen ? null : block.id,
                                            )
                                          : undefined
                                      }
                                      disabled={!isCurrentMobileDay}
                                      aria-label="Abrir ações do bloco"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </div>

                                  {menuOpen ? (
                                    <div className="border-border bg-background text-foreground absolute top-9 right-0 z-50 grid min-w-44 gap-1 rounded-2xl border p-2 shadow-2xl ring-1 ring-white/10">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="min-h-9 justify-start"
                                        onClick={() =>
                                          openEditDialog(block, dayView.weekday)
                                        }
                                      >
                                        <Pencil className="mr-2 size-4" />
                                        Editar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="min-h-9 justify-start"
                                        onClick={() =>
                                          duplicateBlock(block, dayView.weekday)
                                        }
                                      >
                                        <Copy className="mr-2 size-4" />
                                        Duplicar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="min-h-9 justify-start"
                                        disabled={blockIndex === 0}
                                        onClick={() =>
                                          moveBlock(
                                            block.id,
                                            -1,
                                            dayView.weekday,
                                          )
                                        }
                                      >
                                        ↑ Subir
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="min-h-9 justify-start"
                                        disabled={
                                          blockIndex ===
                                          dayView.layouts.length - 1
                                        }
                                        onClick={() =>
                                          moveBlock(
                                            block.id,
                                            1,
                                            dayView.weekday,
                                          )
                                        }
                                      >
                                        ↓ Descer
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive min-h-9 justify-start"
                                        onClick={() =>
                                          requestDeleteBlock(
                                            block,
                                            dayView.weekday,
                                          )
                                        }
                                      >
                                        <Trash2 className="mr-2 size-4" />
                                        Excluir
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Button
            type="button"
            className="fixed right-5 bottom-5 z-40 size-14 rounded-full bg-cyan-500 text-white shadow-[0_18px_45px_rgba(8,145,178,0.45)] hover:bg-cyan-400"
            onClick={openMobileBlockPicker}
            aria-label="Adicionar bloco"
          >
            <Plus className="size-7" />
          </Button>
        </section>
      </div>

      {isMobileBlockPickerOpen ? (
        <div
          className={cn(
            "fixed inset-0 z-[80] flex touch-none items-end justify-center overflow-hidden overscroll-none bg-black/35 backdrop-blur-sm transition-opacity duration-200 xl:hidden",
            isMobileBlockPickerVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeMobileBlockPicker}
            aria-label="Fechar menu de blocos"
          />
          <div
            ref={mobileBlockPickerSheetRef}
            data-mobile-block-picker-sheet="true"
            className={cn(
              "border-border bg-background relative max-h-[calc(100svh-3rem)] w-full touch-none overflow-y-auto overscroll-contain rounded-t-3xl border p-4 shadow-2xl transition-transform duration-300 ease-out will-change-transform select-none",
              isMobileBlockPickerVisible ? "translate-y-0" : "translate-y-full",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-block-picker-title"
            onPointerDown={handleMobileBlockPickerPointerDown}
            onPointerMove={handleMobileBlockPickerPointerMove}
            onPointerUp={handleMobileBlockPickerPointerEnd}
            onPointerCancel={handleMobileBlockPickerPointerEnd}
            onClickCapture={handleMobileBlockPickerClickCapture}
          >
            <div
              className="bg-muted mx-auto mb-4 h-1.5 w-12 rounded-full"
              aria-hidden="true"
            />
            <h2
              id="mobile-block-picker-title"
              className="text-foreground mb-4 text-lg font-semibold"
            >
              Adicionar bloco
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {BUILDER_BLOCK_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onPointerDown={(event) =>
                    handleMobilePaletteBlockPointerDown(event, option.type)
                  }
                  className={cn(
                    "min-h-16 touch-none rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors select-none hover:brightness-110",
                    option.className,
                  )}
                >
                  <span className="text-foreground block text-base font-semibold">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {option.defaultDurationMinutes}min
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mobilePaletteDragPreview ? (
        <div
          ref={mobilePalettePreviewRef}
          data-mobile-palette-drag-preview="true"
          className={cn(
            "pointer-events-none fixed z-[10000] w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3 text-left shadow-2xl ring-1 ring-white/10 will-change-transform xl:hidden",
            getBuilderBlockOption(mobilePaletteDragPreview.blockType).className,
          )}
          style={{
            left: mobilePaletteDragPreview.x,
            top:
              mobilePaletteDragPreview.y - MOBILE_PALETTE_PREVIEW_Y_OFFSET_PX,
            opacity: mobilePaletteDragPreview.isOverTimeline ? 1 : 0.75,
          }}
          aria-hidden="true"
        >
          <span className="text-foreground block truncate text-sm font-semibold">
            {getBuilderBlockOption(mobilePaletteDragPreview.blockType).label}
          </span>
          <span
            ref={mobilePalettePreviewTimeRef}
            className="text-muted-foreground mt-1 block text-xs"
          >
            {getMobilePalettePreviewLabel(
              mobilePaletteDragPreview.minutes,
              mobilePaletteDragPreview.snapped,
            )}
          </span>
        </div>
      ) : null}

      {mobileRoutineBlockDragPreview ? (
        <div
          ref={mobileRoutineBlockPreviewRef}
          className={cn(
            "pointer-events-none fixed z-[10000] w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3 text-left shadow-2xl ring-1 ring-white/10 will-change-transform xl:hidden",
            getBuilderBlockOption(mobileRoutineBlockDragPreview.block.type)
              .className,
          )}
          style={{
            left: mobileRoutineBlockDragPreview.x,
            top: mobileRoutineBlockDragPreview.y,
            minHeight: Math.max(56, mobileRoutineBlockDragPreview.height),
            opacity: mobileRoutineBlockDragPreview.isOverTimeline ? 1 : 0.45,
          }}
          aria-hidden="true"
        >
          <span className="text-foreground block truncate text-sm font-semibold">
            {mobileRoutineBlockDragPreview.block.title}
          </span>
          <span
            ref={mobileRoutineBlockPreviewTimeRef}
            className="text-muted-foreground mt-1 block text-xs"
          >
            {getMobileRoutineBlockPreviewLabel(
              mobileRoutineBlockDragPreview.minutes,
              mobileRoutineBlockDragPreview.snapped,
            )}
          </span>
        </div>
      ) : null}

      {toast ? (
        <div className="border-border bg-background text-foreground fixed right-5 bottom-5 z-[10000] flex max-w-sm items-center rounded-2xl border px-4 py-3 text-sm shadow-2xl ring-1 ring-white/10">
          <span className="min-w-0 flex-1">{toast.message}</span>
        </div>
      ) : null}

      {isClearConfirmationOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm xl:items-center xl:p-4">
          <div
            className="border-border bg-background w-full max-w-md overflow-hidden rounded-t-2xl rounded-b-none border shadow-2xl xl:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-clear-modal-title"
          >
            <div className="border-border border-b px-5 py-4">
              <h2
                id="routine-clear-modal-title"
                className="text-foreground text-xl font-semibold"
              >
                Limpar rotina?
              </h2>
            </div>

            <div className="text-muted-foreground grid gap-3 px-5 py-4 text-sm">
              <p>Todos os blocos do mês visível serão removidos do rascunho.</p>
              <p>
                Você poderá usar a seta de desfazer enquanto não salvar ou sair
                da página.
              </p>
            </div>

            <div className="border-border bg-muted/20 flex flex-col-reverse gap-3 border-t px-5 py-4 xl:flex-row xl:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full xl:w-auto"
                onClick={() => setIsClearConfirmationOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full xl:w-auto"
                onClick={confirmClearCurrentMonthRoutine}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmation ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm xl:items-center xl:p-4">
          <div
            className="border-border bg-background w-full max-w-md overflow-hidden rounded-t-2xl rounded-b-none border shadow-2xl xl:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-delete-modal-title"
          >
            <div className="border-border border-b px-5 py-4">
              <h2
                id="routine-delete-modal-title"
                className="text-foreground text-xl font-semibold"
              >
                {deleteConfirmation.repeatSourceId
                  ? "Excluir tarefa recorrente"
                  : "Excluir bloco?"}
              </h2>
            </div>

            <div className="text-muted-foreground grid gap-3 px-5 py-4 text-sm">
              {deleteConfirmation.repeatSourceId ? (
                <>
                  <p>Essa tarefa faz parte de uma repetição.</p>
                </>
              ) : (
                <>
                  <p>Essa ação removerá este bloco da rotina.</p>
                  <p>
                    Você poderá usar a seta de desfazer enquanto não salvar ou
                    sair da página.
                  </p>
                </>
              )}
            </div>

            <div className="border-border bg-muted/20 grid gap-3 border-t px-5 py-4">
              {deleteConfirmation.repeatSourceId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                    onClick={() =>
                      deleteSingleBlock(
                        deleteConfirmation.blockId,
                        deleteConfirmation.weekday,
                      )
                    }
                  >
                    Apenas esta tarefa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11 w-full"
                    onClick={() =>
                      deleteRecurringSeries(deleteConfirmation.repeatSourceId!)
                    }
                  >
                    Todas as repetições
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11 w-full"
                  onClick={() =>
                    deleteSingleBlock(
                      deleteConfirmation.blockId,
                      deleteConfirmation.weekday,
                    )
                  }
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
          className="border-border bg-background text-foreground pointer-events-none fixed z-[10000] rounded-full border px-3 py-1 text-sm font-medium shadow-2xl ring-1 ring-white/10"
          style={{
            left: dragPreview.x + 14,
            top: dragPreview.y + 14,
          }}
          aria-hidden="true"
        >
          {formatTimeLabel(dragPreview.minutes)}
          {dragPreview.snapped ? (
            <span className="text-muted-foreground ml-1">· encaixado</span>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm xl:items-center xl:p-4">
          <div
            ref={editingDialogRef}
            className="border-border bg-background flex max-h-[92svh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl rounded-b-none border shadow-2xl xl:max-h-[calc(100svh-4rem)] xl:max-w-2xl xl:rounded-2xl"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleEditingDialogKeyDown}
            aria-modal="true"
            aria-labelledby="routine-block-modal-title"
          >
            <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 sm:py-5">
              <h2
                id="routine-block-modal-title"
                className="text-foreground text-xl font-semibold"
              >
                {editing.mode === "edit" ? "Editar bloco" : "Adicionar bloco"}
              </h2>

              <button
                type="button"
                onClick={closeEditing}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
                aria-label="Fechar modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-5 overflow-y-auto px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
              {editing.mode === "edit" ? (
                <div className="grid gap-3">
                  <Label>Tipo do bloco</Label>

                  <div className="grid grid-cols-2 gap-3">
                    {BUILDER_BLOCK_OPTIONS.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => handleSelectEditingType(option.type)}
                        className={cn(
                          "min-h-20 rounded-xl border px-4 py-4 text-left text-base transition-colors hover:brightness-110 sm:px-5 xl:rounded-2xl",
                          option.className,
                          editing.type === option.type &&
                            "ring-primary/70 ring-2",
                        )}
                      >
                        <span className="text-foreground block text-base font-medium">
                          {option.label}
                        </span>
                        <span className="text-muted-foreground block text-sm">
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
                  autoFocus
                  className="h-12 text-base sm:h-14"
                  value={editing.title}
                  onChange={(event) =>
                    setEditing((current) =>
                      current
                        ? { ...current, title: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Ex.: Linux, React, leitura..."
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="routine-block-description">Descrição</Label>
                <textarea
                  id="routine-block-description"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full resize-none rounded-xl border px-3 py-3 text-base shadow-sm transition-colors outline-none focus-visible:ring-[3px] sm:px-4"
                  value={editing.description}
                  onChange={(event) =>
                    setEditing((current) =>
                      current
                        ? { ...current, description: event.target.value }
                        : current,
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
                          current
                            ? { ...current, startTime: event.target.value }
                            : current,
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="routine-block-duration">
                      Duração em minutos
                    </Label>
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
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
                    <div className="grid gap-3">
                      <Label htmlFor="routine-block-start-time-edit">
                        Horário
                      </Label>
                      <Input
                        id="routine-block-start-time-edit"
                        className="h-12 text-base sm:h-14"
                        type="time"
                        step={60}
                        value={editing.startTime}
                        onChange={(event) =>
                          setEditing((current) =>
                            current
                              ? { ...current, startTime: event.target.value }
                              : current,
                          )
                        }
                      />
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="routine-block-duration-edit-mobile">
                        Duração em minutos
                      </Label>
                      <Input
                        id="routine-block-duration-edit-mobile"
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

                  <div className="hidden gap-3 xl:grid">
                    <Label htmlFor="routine-block-duration-edit-desktop">
                      Duração em minutos
                    </Label>
                    <Input
                      id="routine-block-duration-edit-desktop"
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
                </>
              )}

              {editing.mode === "create" ? (
                <div className="grid gap-3 xl:hidden">
                  <Label htmlFor="routine-block-repeat-create">
                    Repetir tarefa
                  </Label>

                  <div className="relative">
                    <select
                      id="routine-block-repeat-create"
                      className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-12 w-full appearance-none rounded-xl border pr-12 pl-3 text-base shadow-sm transition-colors outline-none focus-visible:ring-[3px] sm:h-14 sm:pr-14 sm:pl-4"
                      value={editing.repeatMode}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                repeatMode: event.target
                                  .value as EditingRepeatMode,
                              }
                            : current,
                        )
                      }
                    >
                      <option value="none">Não repetir</option>
                      <option value="week-daily">
                        Todos os dias desta semana
                      </option>
                      <option value="month-daily">
                        Todos os dias deste mês
                      </option>
                      <option value="month-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} deste mês
                      </option>
                      <option value="year-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} até o fim do
                        ano
                      </option>
                    </select>

                    <ChevronDown
                      className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ) : null}

              {editing.mode === "edit" ? (
                <div className="grid gap-3">
                  <Label htmlFor="routine-block-repeat">Repetir tarefa</Label>

                  <div className="relative">
                    <select
                      id="routine-block-repeat"
                      className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-12 w-full appearance-none rounded-xl border pr-12 pl-3 text-base shadow-sm transition-colors outline-none focus-visible:ring-[3px] sm:h-14 sm:pr-14 sm:pl-4"
                      value={editing.repeatMode}
                      onChange={(event) =>
                        setEditing((current) =>
                          current
                            ? {
                                ...current,
                                repeatMode: event.target
                                  .value as EditingRepeatMode,
                              }
                            : current,
                        )
                      }
                    >
                      <option value="none">Não repetir</option>
                      <option value="week-daily">
                        Todos os dias desta semana
                      </option>
                      <option value="month-daily">
                        Todos os dias deste mês
                      </option>
                      <option value="month-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} deste mês
                      </option>
                      <option value="year-weekday">
                        {getWeekdayRepeatPrefix(editing.weekday)} até o fim do
                        ano
                      </option>
                    </select>

                    <ChevronDown
                      className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-border bg-muted/20 flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
    </>
  )
}
