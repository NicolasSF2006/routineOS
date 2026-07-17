import { Sparkles, Trophy } from "lucide-react"
import { formatDuration } from "@/utils/date"

interface StudyGoalBannerProps {
  bonusSeconds: number
}

export function StudyGoalBanner({ bonusSeconds }: StudyGoalBannerProps) {
  return (
    <div className="border-status-acima/30 bg-status-acima/10 flex max-w-full flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Trophy className="text-status-acima size-5 shrink-0" />
        <span className="text-foreground text-sm font-semibold">
          Meta diária concluída!
        </span>
      </div>
      <div className="bg-background/60 flex max-w-full flex-wrap items-center gap-2 rounded-lg px-3 py-1.5">
        <Sparkles className="text-status-acima size-4 shrink-0" />
        <span className="text-muted-foreground text-sm">Horas bônus</span>
        <span className="text-foreground text-sm font-semibold">
          {formatDuration(bonusSeconds)}
        </span>
      </div>
    </div>
  )
}
