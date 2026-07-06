"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeading } from "@/components/shared/page-heading"
import { StudyControl } from "@/features/study-session/components/study-control"
import { useStudySession } from "@/features/study-session/hooks/use-study-session"
import { RoutineBlockRow } from "@/features/routine/components/routine-block-row"
import { useRoutineSchedule } from "@/features/routine/hooks/use-routine-schedule"
import { getRoutineDayBlocksForDateKey } from "@/features/routine/utils/routine-domain"
import { cn } from "@/lib/utils"
import { getMonthLabel, getTodayDateKey } from "@/utils/date"

function getSelectedDateRelation(dateKey: string): "past" | "today" | "future" {
  const todayKey = getTodayDateKey()
  if (dateKey === todayKey) return "today"
  return dateKey < todayKey ? "past" : "future"
}

export function RoutineView() {
  const {
    routine,
    activeDateKey,
    setActiveDateKey,
    activeDate,
    currentWeekDays,
    activeBlocks,
    currentBlockIndex,
    goToPreviousWeek,
    goToNextWeek,
  } = useRoutineSchedule()
  const [autoAdvance, setAutoAdvance] = useState(false)
  const monthLabel = getMonthLabel(activeDate.getFullYear(), activeDate.getMonth())
  const hasRoutine = activeBlocks.length > 0
  const selectedDateRelation = getSelectedDateRelation(activeDateKey)
  const isActionableDate = selectedDateRelation === "today"
  const session = useStudySession({
    dateKey: activeDateKey,
    routineBlocks: activeBlocks,
    hasRoutine: hasRoutine && isActionableDate,
    autoAdvance,
  })
  const todayKey = getTodayDateKey()

  useEffect(() => {
    setAutoAdvance(false)
  }, [activeDateKey])

  const useSessionBlockHighlight =
    session.record?.studyStartedAt &&
    (session.controlState === "estudando" ||
      session.controlState === "pausado" ||
      session.controlState === "aguardando")
  const highlightedBlockIndex = useSessionBlockHighlight
    ? session.currentBlockIndex
    : currentBlockIndex

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title={monthLabel} align="center" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Tabs
          value={activeDateKey}
          onValueChange={(value) => setActiveDateKey(value)}
          className="w-full"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={goToPreviousWeek}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-w-0 flex-1 overflow-x-auto pb-1">
              <TabsList className="!h-auto min-w-max justify-start gap-1 p-1 sm:grid sm:w-full sm:grid-cols-7">
                {currentWeekDays.map((day) => (
                  <TabsTrigger
                    key={day.dateKey}
                    value={day.dateKey}
                    className={cn(
                      "!h-auto min-w-24 flex-col gap-0.5 px-3 py-2 text-sm sm:min-w-0 sm:text-sm",
                      day.isToday && "ring-1 ring-primary/35",
                    )}
                  >
                    <span>{day.short}</span>
                    <span className="font-mono text-base font-semibold tabular-nums leading-none">
                      {day.dayNumber}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={goToNextWeek}
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {currentWeekDays.map((day) => {
            const blocks = getRoutineDayBlocksForDateKey(routine, day.dateKey)
            const hasBlocks = blocks.length > 0

            return (
              <TabsContent key={day.dateKey} value={day.dateKey} className="mt-4">
                <div className="flex flex-col gap-2">
                  {hasBlocks ? (
                    blocks.map((block, index) => (
                      <RoutineBlockRow
                        key={block.id}
                        block={block}
                        isCurrent={
                          day.dateKey === activeDateKey && index === highlightedBlockIndex
                        }
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-6 text-center text-sm font-medium text-muted-foreground">
                      {day.dateKey === todayKey
                        ? "Hoje não tem tarefas. Descanse."
                        : "Este dia não tem tarefas programadas."}
                    </div>
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="lg:sticky lg:top-20">
          <StudyControl
            session={session}
            hasRoutine={hasRoutine}
            selectedDateRelation={selectedDateRelation}
            autoAdvance={autoAdvance}
            onAutoAdvanceChange={setAutoAdvance}
          />
        </div>
      </div>
    </div>
  )
}
