import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BLOCK_TYPE_META } from "@/constants/routine"
import { cn } from "@/lib/utils"
import type { RoutineBlock } from "@/types/study"

interface RoutineBlockRowProps {
  block: RoutineBlock
  isCurrent: boolean
  onOpenStudy?: (block: RoutineBlock) => void
}

function isStudyActionBlock(block: RoutineBlock): boolean {
  return block.type === "study" || block.type === "project" || block.type === "other"
}

export function RoutineBlockRow({ block, isCurrent, onOpenStudy }: RoutineBlockRowProps) {
  const meta = BLOCK_TYPE_META[block.type]
  const canOpenStudy = isCurrent && isStudyActionBlock(block) && typeof onOpenStudy === "function"

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
      </div>

      {canOpenStudy ? (
        <Button
          type="button"
          size="sm"
          className="min-h-9 shrink-0"
          onClick={() => onOpenStudy?.(block)}
          aria-label={`Ver estudos de ${block.title}`}
        >
          <BookOpen className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ver estudos</span>
          <span className="sm:hidden">Ver</span>
        </Button>
      ) : null}
    </div>
  )
}
