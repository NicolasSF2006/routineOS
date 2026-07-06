"use client"

import { Clock, Coffee, LogIn, PauseCircle, Play, Sparkles, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { STATUS_META } from "@/constants/calendar"
import { buildDayDetail } from "@/features/study-session/utils/study-session"
import { cn } from "@/lib/utils"
import { dateKeyFromParts, getMonthLabel } from "@/utils/date"
import type { DailyStudyRecord, Routine, StudySettings } from "@/types/study"

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="wrap-break-word text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function DayDetailDialog({
  day,
  year,
  month,
  open,
  onOpenChange,
  records,
  settings,
  routine,
  nowMs,
}: {
  day: number | null
  year: number
  month: number
  open: boolean
  onOpenChange: (open: boolean) => void
  records: Record<string, DailyStudyRecord>
  settings: StudySettings
  routine: Routine
  nowMs: number
}) {
  if (day === null) return null

  const dateKey = dateKeyFromParts(year, month, day)
  const record = records[dateKey] ?? null
  const detail = buildDayDetail(dateKey, day, record, settings, nowMs, routine)
  const meta = STATUS_META[detail.status]
  const monthName = getMonthLabel(year, month).split(" ")[0]
  const showStudyStart = Boolean(detail.studyStart && record?.status !== "completed")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            {day} de {monthName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", meta.cell)}>
            <span className={cn("mt-1 size-3 shrink-0 rounded-full", meta.swatch)} />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">{meta.label}</span>
              <span className="wrap-break-word text-sm opacity-90">{detail.statusReason}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <DetailRow icon={LogIn} label="Horário da presença" value={detail.presence ?? "—"} />
            {showStudyStart ? (
              <DetailRow icon={Play} label="Início dos estudos" value={detail.studyStart ?? "—"} />
            ) : null}
            <DetailRow icon={Clock} label="Tempo estudado" value={detail.studied ?? "—"} />
            <DetailRow icon={PauseCircle} label="Tempo pausado" value={detail.paused ?? "—"} />
            <DetailRow
              icon={Coffee}
              label="Pausas realizadas"
              value={detail.breaks > 0 ? String(detail.breaks) : "—"}
            />
            {detail.bonus ? (
              <DetailRow icon={Sparkles} label="Horas bônus" value={detail.bonus} />
            ) : null}
            {detail.canceledAt ? (
              <DetailRow icon={XCircle} label="Cancelado às" value={detail.canceledAt} />
            ) : null}
          </div>

          {detail.pauseList.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Lista de pausas
              </span>
              <div className="flex flex-col gap-1.5">
                {detail.pauseList.map((pause, index) => (
                  <div
                    key={`${pause.start}-${index}`}
                    className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-muted-foreground">
                      {pause.start} → {pause.end}
                    </span>
                    <span className="font-medium text-foreground">{pause.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
