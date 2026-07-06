import { Sparkles, Trophy } from "lucide-react"
import { formatDuration } from "@/utils/date"

interface StudyGoalBannerProps {
  bonusSeconds: number
}

export function StudyGoalBanner({ bonusSeconds }: StudyGoalBannerProps) {
  return (
    <div className="flex max-w-full flex-col gap-3 rounded-xl border border-status-acima/30 bg-status-acima/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Trophy className="size-5 shrink-0 text-status-acima" />
        <span className="text-sm font-semibold text-foreground">Meta diária concluída!</span>
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-lg bg-background/60 px-3 py-1.5">
        <Sparkles className="size-4 shrink-0 text-status-acima" />
        <span className="text-sm text-muted-foreground">Horas bônus</span>
        <span className="text-sm font-semibold text-foreground">
          {formatDuration(bonusSeconds)}
        </span>
      </div>
    </div>
  )
}
