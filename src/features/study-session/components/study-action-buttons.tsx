import { CheckCircle2, Flag, Pause, Play, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ControlState } from "@/types/study"

interface StudyActionButtonsProps {
  controlState: ControlState
  metaReached: boolean
  markPresence: () => void
  startStudy: () => void
  pauseStudy: () => void
  resumeStudy: () => void
  completeStudy: () => void
  cancelDay: () => void
  resetDay: () => void
}

export function StudyActionButtons({
  controlState,
  metaReached,
  markPresence,
  startStudy,
  pauseStudy,
  resumeStudy,
  completeStudy,
  cancelDay,
  resetDay,
}: StudyActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      {controlState === "inicial" ? (
        <Button size="lg" className="w-full" onClick={markPresence}>
          <Flag className="size-4" /> Marcar Presença
        </Button>
      ) : null}

      {controlState === "presente" ? (
        <Button size="lg" className="w-full" onClick={startStudy}>
          <Play className="size-4" /> Começar Estudos
        </Button>
      ) : null}

      {controlState === "estudando" && !metaReached ? (
        <Button size="lg" className="w-full" onClick={pauseStudy}>
          <Pause className="size-4" /> Pausar Estudos
        </Button>
      ) : null}

      {controlState === "pausado" && !metaReached ? (
        <Button size="lg" className="w-full" onClick={resumeStudy}>
          <Play className="size-4" /> Retomar Estudos
        </Button>
      ) : null}

      {metaReached && (controlState === "estudando" || controlState === "pausado") ? (
        <Button size="lg" className="w-full" onClick={completeStudy}>
          <CheckCircle2 className="size-4" /> Concluir Estudos
        </Button>
      ) : null}

      {controlState === "estudando" || controlState === "pausado" ? (
        <Button size="lg" variant="destructive" className="w-full" onClick={cancelDay}>
          <X className="size-4" /> Cancelar estudo de hoje
        </Button>
      ) : null}

      {controlState === "concluido" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-status-correto/10 px-4 py-3 text-sm font-medium text-foreground">
            <CheckCircle2 className="size-4 text-status-correto" />
            Estudos concluídos — bom trabalho!
          </div>
          <Button variant="outline" className="w-full" onClick={resetDay}>
            <RotateCcw className="size-4" /> Reiniciar dia
          </Button>
        </div>
      ) : null}
    </div>
  )
}

