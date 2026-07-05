import { CheckCircle2 } from "lucide-react"

interface PresenceStatusProps {
  presenceTime: string | null
}

export function PresenceStatus({ presenceTime }: PresenceStatusProps) {
  if (!presenceTime) {
    return (
      <p className="text-sm text-muted-foreground">
        Marque presença para iniciar o acompanhamento do seu dia de estudos.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm">
      <CheckCircle2 className="size-4 text-status-correto" />
      <span className="text-muted-foreground">Presença marcada às</span>
      <span className="font-semibold text-foreground">{presenceTime}</span>
    </div>
  )
}

