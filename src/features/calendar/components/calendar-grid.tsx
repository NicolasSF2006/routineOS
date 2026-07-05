import { Card } from "@/components/ui/card"
import { STATUS_META, WEEK_HEADERS } from "@/constants/calendar"
import { deriveDayStatus } from "@/features/study-session/utils/study-session"
import { cn } from "@/lib/utils"
import { dateKeyFromParts, getTodayDateKey } from "@/utils/date"
import type { DailyStudyRecord, Routine, StudySettings } from "@/types/study"

interface CalendarGridProps {
  year: number
  month: number
  records: Record<string, DailyStudyRecord>
  settings: StudySettings
  routine: Routine
  onSelectDay: (day: number) => void
}

export function CalendarGrid({
  year,
  month,
  records,
  settings,
  routine,
  onSelectDay,
}: CalendarGridProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const todayKey = getTodayDateKey()

  return (
    <Card className="order-1 h-full p-4 lg:order-2">
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {WEEK_HEADERS.map((weekDay) => (
          <div
            key={weekDay}
            className="py-1 text-center text-sm font-medium text-muted-foreground"
          >
            {weekDay}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />

          const dateKey = dateKeyFromParts(year, month, day)
          const record = records[dateKey] ?? null
          const status = deriveDayStatus(record, dateKey, settings, routine)
          const meta = STATUS_META[status]
          const isToday = dateKey === todayKey

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all hover:scale-[1.04] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                meta.cell,
                isToday && "border-cyan-400 ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-background",
              )}
              aria-label={`Dia ${day}: ${meta.label}`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
