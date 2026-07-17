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
    <Card className="order-1 h-full w-full max-w-full min-w-0 overflow-hidden p-3 sm:p-4 xl:order-2">
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain p-1">
        <div className="min-w-[320px]">
          <div className="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-1.5">
            {WEEK_HEADERS.map((weekDay) => (
              <div
                key={weekDay}
                className="text-muted-foreground py-1 text-center text-sm font-medium"
              >
                {weekDay}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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
                    "focus-visible:ring-ring flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all hover:scale-[1.03] hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none",
                    meta.cell,
                    isToday &&
                      "ring-offset-background border-cyan-400 ring-2 ring-cyan-400/70 ring-offset-2",
                  )}
                  aria-label={`Dia ${day}: ${meta.label}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
