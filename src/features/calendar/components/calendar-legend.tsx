import { STATUS_META } from "@/constants/calendar"
import { cn } from "@/lib/utils"
import type { DayStatus } from "@/types/study"

export function CalendarLegend() {
  return (
    <ul className="flex flex-col gap-2.5">
      {(Object.keys(STATUS_META) as DayStatus[]).map((key) => {
        const meta = STATUS_META[key]

        return (
          <li key={key} className="flex items-start gap-2.5">
            <span className={cn("mt-0.5 size-3.5 shrink-0 rounded-md", meta.swatch)} />
            <div className="flex flex-col">
              <span className="text-base font-medium text-foreground">{meta.label}</span>
              <span className="text-sm text-muted-foreground">{meta.description}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

