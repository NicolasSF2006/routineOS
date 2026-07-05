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
    <div className="grid grid-cols-2 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon

        return (
          <div
            key={item.key}
            className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-3"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn("size-3.5", item.tone)} />
              {item.label}
            </span>
            <span className="text-xl font-semibold text-foreground">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

