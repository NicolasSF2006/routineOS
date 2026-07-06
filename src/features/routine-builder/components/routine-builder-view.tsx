"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import type { RoutineBlock, RoutineBlockType, RoutineDay, RoutineWeek, Weekday } from "@/types/study"

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

export function RoutineBuilderView({ onBackToSettings, onNavigateToRoutine }: RoutineBuilderViewProps) {
  const { routine, saveRoutine, isLoading } = useRoutine()
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayDateKey())
  const [draftWeek, setDraftWeek] = useState<RoutineWeek | null>(null)
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  const selectedDate = parseDateKey(selectedDateKey)
  const selectedWeekday = getWeekdayFromDateKey(selectedDateKey)
  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDateKey])
  const selectedMonthLabel = getMonthLabel(selectedDate.getFullYear(), selectedDate.getMonth())
  const startTime = getRoutineStartTime(routine)

  useEffect(() => {
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, routine))
    setOpenMenuBlockId(null)
    setEditing(null)
    setIsSaved(false)
  }, [routine, selectedDateKey])

  const selectedDay = draftWeek ? getRoutineWeekDay(draftWeek, selectedWeekday) : null

  const moveWeek = (direction: -1 | 1) => {
    const nextDate = parseDateKey(selectedDateKey)
    nextDate.setDate(nextDate.getDate() + direction * 7)
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

  const saveCurrentWeek = () => {
    if (!draftWeek) return
    saveRoutine(upsertRoutineWeek(routine, cloneRoutineWeek(draftWeek)))
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
    }, routine)

    saveRoutine(nextRoutine)
    setDraftWeek(createRoutineWeekFromDate(selectedDateKey, nextRoutine))
    setOpenMenuBlockId(null)
    setEditing(null)
    setIsSaved(true)
  }

  if (isLoading || !draftWeek || !selectedDay) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
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
    <div className="flex flex-col gap-6">
      <div className="relative flex w-full items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
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

          <div className="mb-6 flex flex-col items-center gap-3">
            <h2 className="text-2xl font-semibold text-foreground">{selectedMonthLabel}</h2>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="grid min-w-[1320px] grid-cols-[56px_repeat(7,minmax(0,1fr))_56px] gap-4 sm:min-w-0">
              <div className="flex items-start justify-center pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
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
                  <div key={day.dateKey} className="flex min-w-0 flex-col gap-3">
                    <button
                      type="button"
                        className={cn(
                          "rounded-xl px-2 pb-1 text-center transition-colors",
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
                        "flex min-h-[640px] flex-col gap-4",
                        index === 0 ? "pr-2" : "border-l border-border/30 pl-4 pr-2",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openCreateDialog("study", day.key)}
                        className="order-last flex min-h-[76px] w-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 text-base font-medium text-muted-foreground transition-colors hover:border-primary/70 hover:bg-primary/5 hover:text-primary"
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
                            className={cn(
                              "relative min-h-[112px] rounded-2xl border p-4 text-left shadow-sm transition-colors",
                              option.className,
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-base font-semibold text-foreground">
                                  {block.title}
                                </span>
                                <span className="mt-2 block text-sm text-muted-foreground">
                                  {block.startTime} – {block.endTime}
                                </span>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0"
                                onClick={() => setOpenMenuBlockId(menuOpen ? null : block.id)}
                                aria-label="Abrir ações do bloco"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </div>

                            {menuOpen ? (
                              <div className="absolute left-full top-2 z-50 ml-3 grid min-w-[180px] gap-1 rounded-xl border border-border/80 bg-background p-2 shadow-2xl">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  onClick={() => openEditDialog(block, day.key)}
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  onClick={() => duplicateBlock(block, day.key)}
                                >
                                  <Copy className="mr-2 size-4" />
                                  Duplicar
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  disabled={blockIndex === 0}
                                  onClick={() => moveBlock(block.id, -1, day.key)}
                                >
                                  ↑ Subir
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  disabled={blockIndex === blocks.length - 1}
                                  onClick={() => moveBlock(block.id, 1, day.key)}
                                >
                                  ↓ Descer
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start text-destructive hover:text-destructive"
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
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => moveWeek(1)}
                  aria-label="Próxima semana"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5">
            <Button type="button" variant="outline" onClick={clearCurrentMonthRoutine}>
              Limpar
            </Button>

            <Button type="button" onClick={repeatCurrentWeekForMonth}>
              <Save className="mr-2 size-4" />
              Salvar
            </Button>
          </div>
        </section>

        <aside className="group fixed right-0 top-24 z-40 hidden h-[calc(100vh-7rem)] w-[320px] translate-x-[calc(100%-12px)] transition-transform duration-300 hover:translate-x-0 xl:block">
          <div className="h-full rounded-l-2xl border border-r-0 border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">

            <h2 className="mb-4 text-xl font-semibold text-foreground">Blocos</h2>

            <div className="grid gap-3">
              {BUILDER_BLOCK_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => openCreateDialog(option.type)}
                  className={cn(
                    "rounded-2xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md",
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
          </div>
        </aside>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-block-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 id="routine-block-modal-title" className="text-xl font-semibold text-foreground">
                {editing.mode === "edit" ? "Editar bloco" : "Adicionar bloco"}
              </h2>

              <button
                type="button"
                onClick={closeEditing}
                className="flex size-9 items-center justify-center rounded-full text-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6">
              <div className="grid gap-3">
                <Label>Tipo do bloco</Label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {BUILDER_BLOCK_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => handleSelectEditingType(option.type)}
                      className={cn(
                        "rounded-2xl border px-5 py-4 text-left text-base transition-colors hover:brightness-110",
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
                  className="h-14 text-base"
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
                  className="h-14 text-base"
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

            <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeEditing}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveBlock}>
                Salvar bloco
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
