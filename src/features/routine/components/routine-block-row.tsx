import { ArrowRight } from "lucide-react"
import { BLOCK_TYPE_META } from "@/constants/routine"
import { cn } from "@/lib/utils"
import type { RoutineBlock } from "@/types/study"

interface RoutineBlockRowProps {
  block: RoutineBlock
  isCurrent: boolean
}

export function RoutineBlockRow({ block, isCurrent }: RoutineBlockRowProps) {
  const meta = BLOCK_TYPE_META[block.type]

  return (
    <div
      className={cn(
        "flex w-full max-w-full min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4",
        isCurrent
          ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/70 bg-card hover:border-border",
      )}
    >
      <div className={cn("h-10 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden="true" />

      <div className="flex w-16 shrink-0 flex-col font-mono text-sm sm:w-20">
        <span className="font-semibold text-foreground">{block.startTime}</span>
        <span className="text-sm text-muted-foreground">{block.endTime}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="wrap-break-word text-sm font-medium text-foreground">{block.title}</span>
        <span
          className={cn(
            "mt-1 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-medium whitespace-normal",
            meta.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>

      {isCurrent ? (
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground sm:inline-flex">
          Agora <ArrowRight className="size-3" />
        </span>
      ) : null}
    </div>
  )
}
