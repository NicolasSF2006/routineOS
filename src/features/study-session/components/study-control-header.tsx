import { Clock } from "lucide-react"

export function StudyControlHeader() {
  return (
    <div className="border-border/70 flex items-center justify-between border-b px-5 py-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Clock className="size-4" />
        </span>
        <h3 className="text-foreground text-xl font-semibold wrap-break-word">
          Controle de estudos
        </h3>
      </div>
    </div>
  )
}
