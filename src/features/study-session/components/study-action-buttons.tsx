import { CheckCircle2, Flag, Pause, Play, SkipForward, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ControlState } from "@/types/study"

interface StudyActionButtonsProps {
  controlState: ControlState
  metaReached: boolean
  completedTime: string | null
  hasNextBlock: boolean
  nextBlockIsBreak: boolean
  autoAdvance: boolean
  onAutoAdvanceChange: (checked: boolean) => void
  markPresence: () => void
  startStudy: () => void
  pauseStudy: () => void
  resumeStudy: () => void
  completeStudy: () => void
  requestCancelDay: () => void
  requestResumeCanceledDay: () => void
  advanceRoutineBlock: () => void
}

export function StudyActionButtons({
  controlState,
  metaReached,
  completedTime,
  hasNextBlock,
  nextBlockIsBreak,
  autoAdvance,
  onAutoAdvanceChange,
  markPresence,
  startStudy,
  pauseStudy,
  resumeStudy,
  completeStudy,
  requestCancelDay,
  requestResumeCanceledDay,
  advanceRoutineBlock,
}: StudyActionButtonsProps) {
  const showAutoAdvance =
    controlState === "presente" ||
    controlState === "estudando" ||
    controlState === "pausado" ||
    controlState === "aguardando"

  const nextLabel = nextBlockIsBreak ? "Próxima pausa" : "Próxima tarefa"

  const autoAdvanceCheckbox = showAutoAdvance ? (
    <Label className="mt-1 flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-foreground">
      <input
        type="checkbox"
        checked={autoAdvance}
        onChange={(event) => onAutoAdvanceChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="wrap-break-word">Avançar tarefas automaticamente</span>
    </Label>
  ) : null

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2">
      {controlState === "inicial" ? (
        <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={markPresence}>
          <Flag className="size-4" /> Marcar Presença
        </Button>
      ) : null}

      {controlState === "presente" ? (
        <>
          <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={startStudy}>
            <Play className="size-4" /> Começar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "estudando" && !metaReached ? (
        <>
          <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={pauseStudy}>
            <Pause className="size-4" /> Pausar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "pausado" && !metaReached ? (
        <>
          <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={resumeStudy}>
            <Play className="size-4" /> Retomar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "aguardando" && !metaReached ? (
        <>
          {hasNextBlock ? (
            <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={advanceRoutineBlock}>
              <SkipForward className="size-4" /> {nextLabel}
            </Button>
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-muted/60 px-4 py-3 text-sm font-medium text-muted-foreground">
              Rotina do dia finalizada.
            </div>
          )}
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {metaReached &&
      (controlState === "estudando" ||
        controlState === "pausado" ||
        controlState === "aguardando") ? (
        <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={completeStudy}>
          <CheckCircle2 className="size-4" /> Concluir Estudos
        </Button>
      ) : null}

      {(controlState === "estudando" || controlState === "pausado" || controlState === "aguardando") && !metaReached ? (
        <Button size="lg" variant="destructive" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={requestCancelDay}>
          <X className="size-4" /> Cancelar dia de estudo
        </Button>
      ) : null}

      {controlState === "cancelado" ? (
        <Button size="lg" className="min-h-11 w-full min-w-0 whitespace-normal text-center" onClick={requestResumeCanceledDay}>
          <Play className="size-4" /> Retomar dia de estudo
        </Button>
      ) : null}

      {controlState === "concluido" ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-status-correto/10 px-4 py-3 text-center text-sm">
          <div className="flex flex-wrap items-center justify-center gap-2 font-medium text-foreground">
            <CheckCircle2 className="size-4 text-status-correto" />
            {completedTime ? `Dia concluído às ${completedTime}` : "Dia concluído"}
          </div>
          <span className="text-muted-foreground">Meta diária alcançada.</span>
        </div>
      ) : null}
    </div>
  )
}
