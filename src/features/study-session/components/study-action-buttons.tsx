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
    <Label className="border-border/70 bg-muted/30 text-foreground mt-1 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={autoAdvance}
        onChange={(event) => onAutoAdvanceChange(event.target.checked)}
        className="accent-primary mt-0.5 size-4 shrink-0"
      />
      <span className="wrap-break-word">Avançar tarefas automaticamente</span>
    </Label>
  ) : null

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2">
      {controlState === "inicial" ? (
        <Button
          size="lg"
          className="min-h-11 w-full min-w-0 text-center whitespace-normal"
          onClick={markPresence}
        >
          <Flag className="size-4" /> Marcar Presença
        </Button>
      ) : null}

      {controlState === "presente" ? (
        <>
          <Button
            size="lg"
            className="min-h-11 w-full min-w-0 text-center whitespace-normal"
            onClick={startStudy}
          >
            <Play className="size-4" /> Começar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "estudando" && !metaReached ? (
        <>
          <Button
            size="lg"
            className="min-h-11 w-full min-w-0 text-center whitespace-normal"
            onClick={pauseStudy}
          >
            <Pause className="size-4" /> Pausar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "pausado" && !metaReached ? (
        <>
          <Button
            size="lg"
            className="min-h-11 w-full min-w-0 text-center whitespace-normal"
            onClick={resumeStudy}
          >
            <Play className="size-4" /> Retomar Estudos
          </Button>
          {autoAdvanceCheckbox}
        </>
      ) : null}

      {controlState === "aguardando" && !metaReached ? (
        <>
          {hasNextBlock ? (
            <Button
              size="lg"
              className="min-h-11 w-full min-w-0 text-center whitespace-normal"
              onClick={advanceRoutineBlock}
            >
              <SkipForward className="size-4" /> {nextLabel}
            </Button>
          ) : (
            <div className="bg-muted/60 text-muted-foreground flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium">
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
        <Button
          size="lg"
          className="min-h-11 w-full min-w-0 text-center whitespace-normal"
          onClick={completeStudy}
        >
          <CheckCircle2 className="size-4" /> Concluir Estudos
        </Button>
      ) : null}

      {(controlState === "estudando" ||
        controlState === "pausado" ||
        controlState === "aguardando") &&
      !metaReached ? (
        <Button
          size="lg"
          variant="destructive"
          className="min-h-11 w-full min-w-0 text-center whitespace-normal"
          onClick={requestCancelDay}
        >
          <X className="size-4" /> Cancelar dia de estudo
        </Button>
      ) : null}

      {controlState === "cancelado" ? (
        <Button
          size="lg"
          className="min-h-11 w-full min-w-0 text-center whitespace-normal"
          onClick={requestResumeCanceledDay}
        >
          <Play className="size-4" /> Retomar dia de estudo
        </Button>
      ) : null}

      {controlState === "concluido" ? (
        <div className="bg-status-correto/10 flex flex-col gap-1.5 rounded-xl px-4 py-3 text-center text-sm">
          <div className="text-foreground flex flex-wrap items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="text-status-correto size-4" />
            {completedTime
              ? `Dia concluído às ${completedTime}`
              : "Dia concluído"}
          </div>
          <span className="text-muted-foreground">Meta diária alcançada.</span>
        </div>
      ) : null}
    </div>
  )
}
