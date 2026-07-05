import { Clock, Hourglass, Sparkles, Target, TrendingUp, XCircle } from "lucide-react"
import { formatDuration } from "@/utils/date"
import { cn } from "@/lib/utils"
import type { MonthStats } from "@/types/study"

interface CalendarStatsProps {
  monthStats: MonthStats
}

export function CalendarStats({ monthStats }: CalendarStatsProps) {
  const statItems = [
    {
      key: "goal",
      label: "Meta mensal",
      value: formatDuration(monthStats.monthlyGoalSeconds),
      icon: Target,
      tone: "text-primary",
    },
    {
      key: "studied",
      label: "Horas estudadas",
      value: formatDuration(monthStats.studiedSeconds),
      icon: Clock,
      tone: "text-status-correto",
    },
    {
      key: "remaining",
      label: "Horas restantes",
      value: formatDuration(monthStats.remainingSeconds),
      icon: Hourglass,
      tone: "text-status-atrasado",
    },
    {
      key: "bonus",
      label: "Horas bônus",
      value: formatDuration(monthStats.bonusSeconds),
      icon: Sparkles,
      tone: "text-status-acima",
    },
    {
      key: "completed",
      label: "Dias concluídos",
      value: String(monthStats.completedDays),
      icon: TrendingUp,
      tone: "text-status-correto",
    },
    {
      key: "missed",
      label: "Dias faltados",
      value: String(monthStats.missedDays),
      icon: XCircle,
      tone: "text-status-falta",
    },
  ] as const

  return (
    <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {statItems.map((item) => {
        const Icon = item.icon

        return (
          <div
            key={item.key}
            className="flex min-h-28 flex-col justify-between gap-4 rounded-xl border border-border/70 bg-card/80 p-5 shadow-sm"
          >
            <span className="flex items-center gap-2 text-base leading-tight text-muted-foreground">
              <Icon className={cn("size-4 shrink-0", item.tone)} />
              {item.label}
            </span>
            <span className="whitespace-nowrap text-xl font-semibold tracking-tight text-foreground">
              {item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
