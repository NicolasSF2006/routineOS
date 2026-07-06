"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
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
  recalculateRoutineDayBlocks,
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

interface EditingState {
  mode: EditingMode
  weekday: Weekday
  type: RoutineBlockType
  title: string
  durationMinutes: number
  blockId?: string
}

const DND_MIME_TYPE = "application/routineos-routine-block"

type DragPayload =
  | { kind: "palette"; blockType: RoutineBlockType }
  | { kind: "block"; sourceWeekday: Weekday; blockId: string }

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
    durationMinutes: Math.max(1, Math.floor(editing.durationMinutes || 1)),
    startTime: "00:00",
    endTime: "00:00",
    order: 1,
  }
}

export function RoutineBuilderView({ onBackToSettings }: RoutineBuilderViewProps) {
  const { routine, saveRoutine, isLoading } = useRoutine()
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayDateKey())
  const [draftRoutine, setDraftRoutine] = useState<Routine | null>(null)
  const [draftWeek, setDraftWeek] = useState<RoutineWeek | null>(null)
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [dragOverWeekday, setDragOverWeekday] = useState<Weekday | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const openMenuRef = useRef<HTMLDivElement | null>(null)
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null)
  const selectedDayColumnRef = useRef<HTMLDivElement | null>(null)

  const selectedDate = parseDateKey(selectedDateKey)
  const selectedWeekday = getWeekdayFromDateKey(selectedDateKey)
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDateKey])
  const selectedMonthLabel = getMonthLabel(selectedDate.getFullYear(), selectedDate.getMonth())
  const activeDraftRoutine = draftRoutine ?? routine
  const startTime = getRoutineStartTime(activeDraftRoutine)

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
    setIsSaved(false)
  }, [draftRoutine, selectedDateKey])

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
    const workspace = workspaceScrollRef.current
    const selectedColumn = selectedDayColumnRef.current

    if (!workspace || !selectedColumn || workspace.scrollWidth <= workspace.clientWidth) {
      return
    }

    window.requestAnimationFrame(() => {
      const workspaceRect = workspace.getBoundingClientRect()
      const selectedRect = selectedColumn.getBoundingClientRect()
      const centeredLeft =
        workspace.scrollLeft +
        selectedRect.left -
        workspaceRect.left -
        Math.max(0, (workspace.clientWidth - selectedRect.width) / 2)

      workspace.scrollTo({ left: Math.max(0, centeredLeft), behavior: "auto" })
    })
  }, [selectedDateKey, draftWeek])

  const selectedDay = draftWeek ? getRoutineWeekDay(draftWeek, selectedWeekday) : null

  const getRoutineWithCurrentDraftWeek = (baseRoutine: Routine = activeDraftRoutine) => {
    return draftWeek ? upsertRoutineWeek(baseRoutine, cloneRoutineWeek(draftWeek)) : baseRoutine
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
    const nextWeek = updateRoutineWeekDay(draftWeek, weekday, (day) => {
      const updatedDay = updater(day)
      const recalculatedBlocks = recalculateRoutineDayBlocks(updatedDay.blocks, startTime)
      return {
        ...updatedDay,
        blocks: recalculatedBlocks,
        isActive: recalculatedBlocks.length > 0,
      }
    })
    setDraftWeek(nextWeek)
    setIsSaved(false)
  }

  const openCreateDialog = (type: RoutineBlockType, weekday: Weekday = selectedWeekday) => {
    const defaults = getEditingDefaults(type)

    setOpenMenuBlockId(null)
    setEditing({
      mode: "create",
      weekday,
      type,
      title: defaults.title,
      durationMinutes: defaults.durationMinutes,
    })
  }

  const openEditDialog = (block: RoutineBlock, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    setEditing({
      mode: "edit",
      weekday,
      type: block.type,
      title: block.title,
      durationMinutes: block.durationMinutes,
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

  const handleSaveBlock = () => {
    if (!editing) return

    updateDraftDay(editing.weekday, (day) => {
      if (editing.mode === "edit") {
        return {
          ...day,
          blocks: day.blocks.map((block) =>
            block.id === editing.blockId
              ? {
                  ...block,
                  type: editing.type,
                  title: editing.title.trim() || getBuilderBlockOption(editing.type).defaultTitle,
                  durationMinutes: Math.max(1, Math.floor(editing.durationMinutes || 1)),
                }
              : block,
          ),
        }
      }

      const block = createBlockFromEditing(editing)
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

  const deleteBlock = (blockId: string, weekday: Weekday) => {
    setOpenMenuBlockId(null)
    updateDraftDay(weekday, (day) => ({
      ...day,
      blocks: day.blocks.filter((block) => block.id !== blockId),
    }))
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

  const clearDragState = () => {
    setDragOverWeekday(null)
    setDragOverBlockId(null)
    setDraggingBlockId(null)
  }

  const createBlockFromType = (type: RoutineBlockType, weekday: Weekday): RoutineBlock => {
    const defaults = getEditingDefaults(type)

    return {
      id: createId(`block-${weekday}`),
      type,
      title: defaults.title,
      durationMinutes: defaults.durationMinutes,
      startTime: "00:00",
      endTime: "00:00",
      order: 1,
    }
  }

  const insertBlockIntoDay = (weekday: Weekday, block: RoutineBlock, targetBlockId?: string) => {
    updateDraftDay(weekday, (day) => {
      const blocks = [...day.blocks]
      const targetIndex = targetBlockId ? blocks.findIndex((item) => item.id === targetBlockId) : -1
      const insertIndex = targetIndex >= 0 ? targetIndex : blocks.length

      blocks.splice(insertIndex, 0, block)

      return { ...day, blocks }
    })
  }

  const moveBlockToDay = (sourceWeekday: Weekday, blockId: string, targetWeekday: Weekday, targetBlockId?: string) => {
    if (!draftWeek || blockId === targetBlockId) return

    const sourceDay = getRoutineWeekDay(draftWeek, sourceWeekday)
    const movedBlock = sourceDay.blocks.find((block) => block.id === blockId)

    if (!movedBlock) return

    const withoutSourceBlock = updateRoutineWeekDay(draftWeek, sourceWeekday, (day) => ({
      ...day,
      blocks: day.blocks.filter((block) => block.id !== blockId),
    }))

    const blockToInsert: RoutineBlock = {
      ...movedBlock,
      id: sourceWeekday === targetWeekday ? movedBlock.id : createId(`block-${targetWeekday}`),
    }

    const withMovedBlock = updateRoutineWeekDay(withoutSourceBlock, targetWeekday, (day) => {
      const blocks = [...day.blocks]
      const targetIndex = targetBlockId ? blocks.findIndex((block) => block.id === targetBlockId) : -1
      const insertIndex = targetIndex >= 0 ? targetIndex : blocks.length

      blocks.splice(insertIndex, 0, blockToInsert)

      return { ...day, blocks }
    })

    const recalculatedWeek = {
      ...withMovedBlock,
      days: withMovedBlock.days.map((day) =>
        day.weekday === sourceWeekday || day.weekday === targetWeekday
          ? {
              ...day,
              blocks: recalculateRoutineDayBlocks(day.blocks, startTime),
              isActive: day.blocks.length > 0,
            }
          : day,
      ),
    }

    setDraftWeek(recalculatedWeek)
    setOpenMenuBlockId(null)
    setIsSaved(false)
  }

  const handlePaletteDragStart = (event: DragEvent<HTMLButtonElement>, blockType: RoutineBlockType) => {
    const payload: DragPayload = { kind: "palette", blockType }

    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(DND_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.setData("text/plain", JSON.stringify(payload))
  }

  const handlePaletteClick = (type: RoutineBlockType) => {
    openCreateDialog(type)
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

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(DND_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.setData("text/plain", JSON.stringify(payload))
    setDraggingBlockId(block.id)
    setOpenMenuBlockId(null)
  }

  const handleDayDragOver = (event: DragEvent<HTMLElement>, weekday: Weekday) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy"
    setDragOverWeekday(weekday)
    setDragOverBlockId(null)
  }

  const handleBlockDragOver = (event: DragEvent<HTMLDivElement>, weekday: Weekday, blockId: string) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = draggingBlockId ? "move" : "copy"
    setDragOverWeekday(weekday)
    setDragOverBlockId(blockId)
  }

  const handleDrop = (event: DragEvent<HTMLElement>, weekday: Weekday, targetBlockId?: string) => {
    event.preventDefault()
    event.stopPropagation()

    const payload = readDragPayload(event)

    if (!payload) {
      clearDragState()
      return
    }

    if (payload.kind === "palette") {
      insertBlockIntoDay(weekday, createBlockFromType(payload.blockType, weekday), targetBlockId)
    } else {
      moveBlockToDay(payload.sourceWeekday, payload.blockId, weekday, targetBlockId)
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
    const nextRoutine = getRoutineWithCurrentDraftWeek()

    setDraftRoutine(nextRoutine)
    saveRoutine(nextRoutine)
    setIsSaved(true)
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
    const confirmed = window.confirm(
      "Limpar vai remover todos os blocos do mês atual no rascunho. Clique em Salvar depois para persistir a limpeza. Deseja continuar?",
    )

    if (!confirmed) return

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
    setIsSaved(false)
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
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{selectedMonthLabel}</h2>
          </div>

          <div ref={workspaceScrollRef} className="overflow-x-auto overscroll-x-contain pb-4">
            <div className="routine-builder-workspace-grid grid">
              <div className="flex items-start justify-center pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="shrink-0 rounded-full"
                  onClick={() => moveWeek(-1)}
                  aria-label="Semana anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>

              {weekDays.map((day, index) => {
                const routineDay = draftWeek ? getRoutineWeekDay(draftWeek, day.key) : null
                const blocks = routineDay?.blocks ?? []

                return (
                  <div
                    key={day.dateKey}
                    ref={day.key === selectedWeekday ? selectedDayColumnRef : undefined}
                    className="flex min-w-0 flex-col gap-3"
                  >
                    <button
                      type="button"
                      className={cn(
                        "min-h-14 rounded-xl px-2 py-2 text-center transition-colors",
                        "text-muted-foreground",
                        day.isToday && "border border-cyan-400/70 bg-cyan-500/5 text-foreground",
                      )}
                    >
                      <span className="block text-center text-lg font-semibold leading-tight">{day.label}</span>
                      <span className="mt-1 block font-mono text-lg font-semibold leading-none tabular-nums">
                        {day.dayNumber}
                      </span>
                    </button>

                    <div
                      className={cn(
                        "flex min-h-[480px] flex-col gap-3 rounded-xl transition-colors md:min-h-[560px] xl:min-h-[640px] xl:gap-4 xl:rounded-2xl",
                        index === 0 ? "pr-2" : "border-l border-border/30 pl-3 pr-2 xl:pl-4",
                        dragOverWeekday === day.key && "bg-primary/[0.04] ring-1 ring-primary/30",
                      )}
                      onDragOver={(event) => handleDayDragOver(event, day.key)}
                      onDrop={(event) => handleDrop(event, day.key)}
                      onDragEnd={clearDragState}
                    >
                      <button
                        type="button"
                        onClick={() => openCreateDialog("study", day.key)}
                        onDragOver={(event) => handleDayDragOver(event, day.key)}
                        onDrop={(event) => handleDrop(event, day.key)}
                        className="order-last flex min-h-[68px] w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 text-base font-medium text-muted-foreground transition-colors hover:border-primary/70 hover:bg-primary/5 hover:text-primary xl:min-h-[76px] xl:rounded-2xl"
                        aria-label={`Adicionar bloco em ${day.label}`}
                      >
                        <Plus className="size-5" />
                      </button>

                      {blocks.map((block, blockIndex) => {
                        const option = getBuilderBlockOption(block.type)
                        const menuOpen = openMenuBlockId === block.id

                        return (
                          <div
                            key={block.id}
                            draggable
                            onDragStart={(event) => handleBlockDragStart(event, block, day.key)}
                            onDragOver={(event) => handleBlockDragOver(event, day.key, block.id)}
                            onDrop={(event) => handleDrop(event, day.key, block.id)}
                            onDragEnd={clearDragState}
                            ref={menuOpen ? openMenuRef : undefined}
                            className={cn(
                              "relative min-h-[96px] cursor-grab rounded-xl border p-3 text-left shadow-sm transition-colors active:cursor-grabbing md:min-h-[104px] xl:min-h-[112px] xl:rounded-2xl xl:p-4",
                              option.className,
                              draggingBlockId === block.id && "opacity-50",
                              dragOverBlockId === block.id && "ring-2 ring-primary/60",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="wrap-break-word block whitespace-normal text-base font-semibold text-foreground">
                                  {block.title}
                                </span>
                                <span className="mt-2 block text-sm text-muted-foreground">
                                  {block.startTime} – {block.endTime}
                                </span>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 rounded-full"
                                onClick={() => setOpenMenuBlockId(menuOpen ? null : block.id)}
                                aria-label="Abrir ações do bloco"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </div>

                            {menuOpen ? (
                              <div className="absolute right-2 top-12 z-50 grid w-44 max-w-[calc(100vw-2rem)] gap-1 rounded-xl border border-border/80 bg-background p-2 shadow-2xl md:left-[calc(100%+0.5rem)] md:right-auto md:top-2">
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
                                  disabled={blockIndex === blocks.length - 1}
                                  onClick={() => moveBlock(block.id, 1, day.key)}
                                >
                                  ↓ Descer
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="min-h-9 justify-start text-destructive hover:text-destructive"
                                  onClick={() => deleteBlock(block.id, day.key)}
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
                  </div>
                )
              })}

              <div className="flex items-start justify-center pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="shrink-0 rounded-full"
                  onClick={() => moveWeek(1)}
                  aria-label="Próxima semana"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border/50 pt-5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
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
              className="min-h-11 w-full sm:w-auto"
              onClick={saveCurrentMonthRoutine}
            >
              <Save className="mr-2 size-4" />
              Salvar
            </Button>
          </div>
        </section>

        <aside
          className="routine-builder-block-panel group fixed right-0 top-24 z-40 h-[calc(100vh-7rem)] w-[320px] translate-x-[calc(100%-12px)] transition-transform duration-300 hover:translate-x-0"
          aria-label="Painel de blocos"
        >
          <div className="h-full rounded-l-2xl border border-r-0 border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Blocos</h2>

            {renderBlockPalette()}
          </div>
        </aside>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
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
