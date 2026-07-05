const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export function getTodayDateKey(): string {
  return toDateKey(new Date())
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function isWeekend(dateKey: string): boolean {
  const day = parseDateKey(dateKey).getDay()
  return day === 0 || day === 6
}

export function isWeekday(dateKey: string): boolean {
  return !isWeekend(dateKey)
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

export function getCurrentMonthMeta(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  if (safeSeconds > 0 && safeSeconds < 60) return `${safeSeconds}s`

  const h = Math.floor(safeSeconds / 3600)
  const m = Math.floor((safeSeconds % 3600) / 60)
  if (h === 0) return `${m}min`
  return `${h}h ${String(m).padStart(2, "0")}min`
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function formatHours(totalSeconds: number): string {
  const hours = totalSeconds / 3600
  if (Number.isInteger(hours)) return `${hours}h`
  return `${hours.toFixed(1)}h`
}

export function nowIso(): string {
  return new Date().toISOString()
}
