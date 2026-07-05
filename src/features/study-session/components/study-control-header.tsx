import { Clock } from "lucide-react"

export function StudyControlHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock className="size-4" />
        </span>
        <h3 className="text-xl font-semibold text-foreground">Controle de estudos</h3>
      </div>
    </div>
  )
}

