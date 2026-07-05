import type { DayStatus, StatusMeta } from "@/types/study"

export const WEEK_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export const STATUS_META: Record<DayStatus, StatusMeta> = {
  falta: {
    label: "Falta",
    description: "Nenhuma presença registrada no dia.",
    cell: "bg-status-falta/15 text-status-falta border-status-falta/30",
    swatch: "bg-status-falta",
  },
  atrasado: {
    label: "Presença atrasada",
    description: "Presença marcada após a tolerância de atraso.",
    cell: "bg-status-atrasado/15 text-status-atrasado border-status-atrasado/30",
    swatch: "bg-status-atrasado",
  },
  adiantado: {
    label: "Presença adiantada",
    description: "Presença marcada antes do horário de início.",
    cell: "bg-status-adiantado/15 text-status-adiantado border-status-adiantado/30",
    swatch: "bg-status-adiantado",
  },
  correto: {
    label: "No horário correto",
    description: "Presença marcada dentro do horário previsto.",
    cell: "bg-status-correto/15 text-status-correto border-status-correto/30",
    swatch: "bg-status-correto",
  },
  "com-pausas": {
    label: "Correto, com pausas",
    description: "Presença correta, porém com pausas acima do previsto.",
    cell: "bg-status-pausas/15 text-status-pausas border-status-pausas/30",
    swatch: "bg-status-pausas",
  },
  "acima-meta": {
    label: "Acima da meta",
    description: "Estudou além da meta diária de horas.",
    cell: "bg-status-acima/15 text-status-acima border-status-acima/30",
    swatch: "bg-status-acima",
  },
  "sem-rotina": {
    label: "Sem rotina",
    description: "Dia sem rotina programada.",
    cell: "bg-muted text-muted-foreground border-border",
    swatch: "bg-muted-foreground/40",
  },
}

