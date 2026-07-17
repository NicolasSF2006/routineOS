"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatDuration, formatTime } from "@/utils/date"
import { PresenceStatus } from "@/features/study-session/components/presence-status"
import { StudyActionButtons } from "@/features/study-session/components/study-action-buttons"
import { StudyControlHeader } from "@/features/study-session/components/study-control-header"
import { StudyControlLoading } from "@/features/study-session/components/study-control-loading"
import { StudyGoalBanner } from "@/features/study-session/components/study-goal-banner"
import { StudyTimerPanel } from "@/features/study-session/components/study-timer-panel"
import { isRoutineBreakBlock } from "@/features/study-session/utils/study-session"
import { cn } from "@/lib/utils"
import type { UseStudySessionResult } from "@/features/study-session/hooks/use-study-session"

interface StudyControlProps {
  session: UseStudySessionResult
  hasRoutine: boolean
  hasConfiguredRoutine: boolean
  selectedDateRelation: "past" | "today" | "future"
  autoAdvance: boolean
  onAutoAdvanceChange: (checked: boolean) => void
}

export function StudyControl({
  session,
  hasRoutine,
  hasConfiguredRoutine,
  selectedDateRelation,
  autoAdvance,
  onAutoAdvanceChange,
}: StudyControlProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [confirmingResume, setConfirmingResume] = useState(false)

  const {
    record,
    controlState,
    activeSeconds,
    bonusSeconds,
    goalSeconds,
    metaReached,
    progress,
    hydrated,
    currentBlock,
    currentBlockElapsedSeconds,
    currentBlockDurationSeconds,
    currentBlockProgress,
    nextBlock,
    hasNextBlock,
    isCurrentBlockRoutineBreak,
    markPresence,
    startStudy,
    pauseStudy,
    resumeStudy,
    completeStudy,
    cancelDay,
    resumeCanceledDay,
    advanceRoutineBlock,
  } = session

  if (!hydrated) {
    return <StudyControlLoading />
  }

  const presenceTime =
    controlState === "presente" && record?.presenceAt
      ? formatTime(record.presenceAt)
      : null
  const canceledTime =
    controlState === "cancelado" && record?.canceledAt
      ? formatTime(record.canceledAt)
      : null
  const completedTime =
    controlState === "concluido" && record?.completedAt
      ? formatTime(record.completedAt)
      : null
  const showTimer =
    controlState === "estudando" ||
    controlState === "pausado" ||
    controlState === "aguardando" ||
    controlState === "cancelado" ||
    controlState === "concluido"
  const showPresenceStatus =
    controlState === "inicial" ||
    controlState === "presente" ||
    controlState === "cancelado"
  const showCurrentBlock = Boolean(
    currentBlock &&
    record?.studyStartedAt &&
    controlState !== "concluido" &&
    controlState !== "cancelado",
  )
  const nextBlockIsBreak = nextBlock
    ? isRoutineBreakBlock(nextBlock.type)
    : false

  const handleConfirmCancel = () => {
    cancelDay()
    setConfirmingCancel(false)
  }

  const handleConfirmResume = () => {
    resumeCanceledDay()
    setConfirmingResume(false)
  }

  return (
    <>
      <Card className="border-border/80 w-full max-w-full min-w-0 overflow-hidden">
        <StudyControlHeader />

        <div className="flex w-full max-w-full min-w-0 flex-col gap-5 p-4 sm:p-5">
          {!hasConfiguredRoutine ? (
            <p className="bg-muted/50 text-muted-foreground rounded-xl px-4 py-3 text-base">
              Você ainda não criou uma rotina. Use a aba Montar rotina para
              configurar seus estudos.
            </p>
          ) : selectedDateRelation === "future" ? (
            <p className="bg-muted/50 text-muted-foreground rounded-xl px-4 py-3 text-base">
              Você está visualizando uma data futura. A presença só pode ser
              marcada no dia atual.
            </p>
          ) : selectedDateRelation === "past" ? (
            <p className="bg-muted/50 text-muted-foreground rounded-xl px-4 py-3 text-base">
              Este dia já passou. Use o calendário para consultar o histórico.
            </p>
          ) : !hasRoutine ? (
            <p className="bg-muted/50 text-muted-foreground rounded-xl px-4 py-3 text-base">
              Não há rotina para este dia.
            </p>
          ) : (
            <>
              {showPresenceStatus ? (
                <PresenceStatus
                  presenceTime={presenceTime}
                  canceledTime={canceledTime}
                />
              ) : null}

              {showCurrentBlock && currentBlock ? (
                <div className="border-border/70 bg-muted/30 rounded-xl border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                        {isCurrentBlockRoutineBreak
                          ? "Pausa programada"
                          : "Tarefa atual"}
                      </p>
                      <p className="text-foreground text-sm font-semibold wrap-break-word">
                        {currentBlock.title}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-sm font-medium">
                      {formatDuration(currentBlockElapsedSeconds)} /{" "}
                      {formatDuration(currentBlockDurationSeconds)}
                    </span>
                  </div>
                  <div className="bg-background mt-3 h-2 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCurrentBlockRoutineBreak
                          ? "bg-status-pausas"
                          : "bg-primary",
                      )}
                      style={{ width: `${currentBlockProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {showTimer ? (
                <StudyTimerPanel
                  controlState={controlState}
                  activeSeconds={activeSeconds}
                  goalSeconds={goalSeconds}
                  metaReached={metaReached}
                  progress={progress}
                />
              ) : null}

              {metaReached &&
              controlState !== "inicial" &&
              controlState !== "cancelado" ? (
                <StudyGoalBanner bonusSeconds={bonusSeconds} />
              ) : null}

              <StudyActionButtons
                controlState={controlState}
                metaReached={metaReached}
                completedTime={completedTime}
                hasNextBlock={hasNextBlock}
                nextBlockIsBreak={nextBlockIsBreak}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={onAutoAdvanceChange}
                markPresence={markPresence}
                startStudy={startStudy}
                pauseStudy={pauseStudy}
                resumeStudy={resumeStudy}
                completeStudy={completeStudy}
                requestCancelDay={() => setConfirmingCancel(true)}
                requestResumeCanceledDay={() => setConfirmingResume(true)}
                advanceRoutineBlock={advanceRoutineBlock}
              />
            </>
          )}
        </div>
      </Card>

      <Dialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <DialogContent>
          <DialogHeader className="pr-8">
            <DialogTitle>
              Tem certeza que deseja cancelar o dia de estudo?
            </DialogTitle>
            <DialogDescription>
              O tempo estudado até agora será mantido no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Voltar
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingResume} onOpenChange={setConfirmingResume}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retomar dia de estudo?</DialogTitle>
            <DialogDescription>
              O cronômetro continuará de onde parou. O tempo entre o
              cancelamento e a retomada não será contabilizado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Voltar
            </DialogClose>
            <Button onClick={handleConfirmResume}>Retomar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
