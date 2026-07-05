import { formatClock, formatDuration } from "@/utils/date"
import { cn } from "@/lib/utils"
import type { ControlState } from "@/types/study"

interface StudyTimerPanelProps {
  controlState: ControlState
  activeSeconds: number
  goalSeconds: number
  metaReached: boolean
  progress: number
}

export function StudyTimerPanel({
  controlState,
  activeSeconds,
  goalSeconds,
  metaReached,
  progress,
}: StudyTimerPanelProps) {
  const isRunning = controlState === "estudando"

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 text-center transition-colors",
        metaReached
          ? "border-status-acima/30 bg-status-acima/10"
          : controlState === "pausado"
            ? "border-border bg-muted/50"
            : "border-primary/25 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        <span
          className={cn(
            "size-2 rounded-full",
            isRunning ? "animate-pulse bg-status-correto" : "bg-muted-foreground/50",
          )}
        />
        {controlState === "pausado"
          ? "Pausado"
          : controlState === "aguardando"
            ? "Aguardando próxima etapa"
            : controlState === "cancelado"
              ? "Cancelado"
          : controlState === "concluido"
            ? "Finalizado"
            : "Tempo ativo estudado"}
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums sm:text-2xl",
          controlState === "pausado" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {formatClock(activeSeconds)}
      </p>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              metaReached ? "bg-status-acima" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Meta diária: {formatDuration(goalSeconds)}
        </p>
      </div>
    </div>
  )
}
