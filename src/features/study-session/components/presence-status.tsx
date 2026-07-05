import { CheckCircle2, XCircle } from "lucide-react"

interface PresenceStatusProps {
  presenceTime: string | null
  canceledTime?: string | null
}

export function PresenceStatus({ presenceTime, canceledTime }: PresenceStatusProps) {
  if (canceledTime) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-status-falta/10 px-4 py-3 text-sm">
        <XCircle className="size-4 text-status-falta" />
        <span className="text-muted-foreground">Dia de estudo cancelado às</span>
        <span className="font-semibold text-foreground">{canceledTime}</span>
      </div>
    )
  }

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
