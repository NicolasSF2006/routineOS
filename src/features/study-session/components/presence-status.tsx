import { CheckCircle2, XCircle } from "lucide-react"

interface PresenceStatusProps {
  presenceTime: string | null
  canceledTime?: string | null
}

export function PresenceStatus({
  presenceTime,
  canceledTime,
}: PresenceStatusProps) {
  if (canceledTime) {
    return (
      <div className="bg-status-falta/10 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm">
        <XCircle className="text-status-falta size-4 shrink-0" />
        <span className="text-muted-foreground">
          Dia de estudo cancelado às
        </span>
        <span className="text-foreground font-semibold">{canceledTime}</span>
      </div>
    )
  }

  if (!presenceTime) {
    return (
      <p className="text-muted-foreground text-sm">
        Marque presença para iniciar o acompanhamento do seu dia de estudos.
      </p>
    )
  }

  return (
    <div className="bg-muted/60 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm">
      <CheckCircle2 className="text-status-correto size-4 shrink-0" />
      <span className="text-muted-foreground">Presença marcada às</span>
      <span className="text-foreground font-semibold">{presenceTime}</span>
    </div>
  )
}
