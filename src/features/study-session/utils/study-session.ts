import { DEFAULT_ROUTINE } from "@/constants/routine"
import {
  getOfficialStartTime as getRoutineOfficialStartTime,
  getWeekdayFromDateKey,
  hasRoutineForDateKey,
} from "@/features/routine/utils/routine-domain"
import {
  dateKeyFromParts,
  formatDuration,
  formatTime,
  getTodayDateKey,
  nowIso,
} from "@/utils/date"
import { timeToMinutes } from "@/utils/time"
import type {
  ControlState,
  DailyStudyRecord,
  DayDetail,
  DayStatus,
  MonthStats,
  Routine,
  StudyPause,
  StudySettings,
} from "@/types/study"

export function getOfficialStartTime(
  dateKey: string = getTodayDateKey(),
  routine: Routine = DEFAULT_ROUTINE,
): string | null {
  return getRoutineOfficialStartTime(routine, getWeekdayFromDateKey(dateKey))
}

export function createEmptyRecord(dateKey: string): DailyStudyRecord {
  return {
    dateKey,
    presenceAt: null,
    studyStartedAt: null,
    activeSeconds: 0,
    pauseSeconds: 0,
    bonusSeconds: 0,
    status: "in-progress",
    pauses: [],
    completedAt: null,
    canceledAt: null,
    updatedAt: nowIso(),
    activeSegmentStartedAt: null,
  }
}

export function getOpenPause(record: DailyStudyRecord): StudyPause | null {
  return record.pauses.find((p) => p.endedAt === null) ?? null
}

export function computeLiveActiveSeconds(record: DailyStudyRecord, nowMs: number): number {
  let total = record.activeSeconds
  if (record.activeSegmentStartedAt && record.status === "in-progress") {
    total += Math.max(
      0,
      Math.floor((nowMs - new Date(record.activeSegmentStartedAt).getTime()) / 1000),
    )
  }
  return total
}

export function computeLivePauseSeconds(record: DailyStudyRecord, nowMs: number): number {
  let total = record.pauseSeconds
  const openPause = getOpenPause(record)
  if (openPause) {
    total += Math.max(0, Math.floor((nowMs - new Date(openPause.startedAt).getTime()) / 1000))
  }
  return total
}

export function getDailyGoalSeconds(settings: StudySettings): number {
  return settings.dailyGoalHours * 3600
}

export function deriveControlState(record: DailyStudyRecord | null): ControlState {
  if (!record || !record.presenceAt) return "inicial"
  if (record.status === "completed") return "concluido"
  if (record.status === "canceled") return "inicial"
  if (!record.studyStartedAt) return "presente"
  if (getOpenPause(record)) return "pausado"
  if (record.activeSegmentStartedAt) return "estudando"
  return "presente"
}

type PresenceTiming = "adiantado" | "correto" | "atrasado"

export function getPresenceTiming(
  presenceAt: string,
  toleranceMinutes: number,
  officialStartTime: string,
): PresenceTiming {
  const presence = new Date(presenceAt)
  const presenceMinutes = presence.getHours() * 60 + presence.getMinutes()
  const officialMinutes = timeToMinutes(officialStartTime)

  if (presenceMinutes < officialMinutes) return "adiantado"
  if (presenceMinutes <= officialMinutes + toleranceMinutes) return "correto"
  return "atrasado"
}

export function deriveDayStatus(
  record: DailyStudyRecord | null,
  dateKey: string,
  settings: StudySettings,
  routine: Routine = DEFAULT_ROUTINE,
): DayStatus {
  const officialStartTime = getOfficialStartTime(dateKey, routine)
  if (!hasRoutineForDateKey(routine, dateKey) || !officialStartTime) return "sem-rotina"

  const today = getTodayDateKey()

  if (!record) {
    if (dateKey > today) return "sem-rotina"
    if (dateKey < today) return "falta"
    return "sem-rotina"
  }

  if (record.status === "canceled") return "falta"

  if (record.status === "completed" && record.bonusSeconds > 0) return "acima-meta"

  if (!record.presenceAt) {
    if (dateKey < today) return "falta"
    return "sem-rotina"
  }

  const timing = getPresenceTiming(
    record.presenceAt,
    settings.latenessToleranceMinutes,
    officialStartTime,
  )
  const hasManualPauses = record.pauses.length > 0

  if (hasManualPauses && timing === "correto") return "com-pausas"
  if (timing === "atrasado") return "atrasado"
  if (timing === "adiantado") return "adiantado"
  if (timing === "correto") return "correto"

  return "sem-rotina"
}

export function getStatusReason(
  record: DailyStudyRecord | null,
  dateKey: string,
  settings: StudySettings,
  routine: Routine = DEFAULT_ROUTINE,
): string {
  const status = deriveDayStatus(record, dateKey, settings, routine)
  const officialStartTime = getOfficialStartTime(dateKey, routine)

  switch (status) {
    case "acima-meta":
      return "Meta diária concluída com horas bônus registradas."
    case "falta":
      if (record?.status === "canceled") return "Estudo do dia foi cancelado."
      return "Nenhuma presença registrada no dia."
    case "com-pausas":
      return "Presença no horário correto, com pausas manuais durante os estudos."
    case "atrasado":
      return `Presença marcada após ${officialStartTime} + ${settings.latenessToleranceMinutes} min de tolerância.`
    case "adiantado":
      return `Presença marcada antes do horário oficial (${officialStartTime}).`
    case "correto":
      return `Presença marcada entre ${officialStartTime} e a tolerância configurada.`
    case "sem-rotina":
      return "Fim de semana sem rotina programada."
  }
}

export function buildDayDetail(
  dateKey: string,
  day: number,
  record: DailyStudyRecord | null,
  settings: StudySettings,
  nowMs: number = Date.now(),
  routine: Routine = DEFAULT_ROUTINE,
): DayDetail {
  const status = deriveDayStatus(record, dateKey, settings, routine)
  const statusReason = getStatusReason(record, dateKey, settings, routine)

  if (!record || (status === "falta" && !record.presenceAt)) {
    return {
      dateKey,
      day,
      status,
      statusReason,
      presence: record?.presenceAt ? formatTime(record.presenceAt) : null,
      studyStart: null,
      studied: null,
      paused: null,
      breaks: 0,
      pauseList: [],
      bonus: null,
      canceledAt: record?.canceledAt ? formatTime(record.canceledAt) : null,
    }
  }

  const activeSeconds =
    record.status === "completed"
      ? record.activeSeconds
      : computeLiveActiveSeconds(record, nowMs)
  const pauseSeconds =
    record.status === "completed"
      ? record.pauseSeconds
      : computeLivePauseSeconds(record, nowMs)

  const pauseList = record.pauses.map((pause) => {
    const endMs = pause.endedAt ? new Date(pause.endedAt).getTime() : nowMs
    const duration = pause.endedAt
      ? pause.durationSeconds
      : Math.max(0, Math.floor((endMs - new Date(pause.startedAt).getTime()) / 1000))

    return {
      start: formatTime(pause.startedAt),
      end: pause.endedAt ? formatTime(pause.endedAt) : "Em andamento",
      duration: formatDuration(duration),
    }
  })

  return {
    dateKey,
    day,
    status,
    statusReason,
    presence: formatTime(record.presenceAt),
    studyStart: formatTime(record.studyStartedAt),
    studied: formatDuration(activeSeconds),
    paused: pauseSeconds > 0 ? formatDuration(pauseSeconds) : null,
    breaks: record.pauses.length,
    pauseList,
    bonus: record.bonusSeconds > 0 ? formatDuration(record.bonusSeconds) : null,
    canceledAt: record.canceledAt ? formatTime(record.canceledAt) : null,
  }
}

export function computeMonthStats(
  year: number,
  month: number,
  settings: StudySettings,
  records: Record<string, DailyStudyRecord>,
  routine: Routine = DEFAULT_ROUTINE,
): MonthStats {
  const today = getTodayDateKey()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let studiedSeconds = 0
  let bonusSeconds = 0
  let completedDays = 0
  let missedDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = dateKeyFromParts(year, month, day)
    const record = records[dateKey] ?? null
    const status = deriveDayStatus(record, dateKey, settings, routine)

    if (record?.status === "completed") {
      studiedSeconds += record.activeSeconds
      bonusSeconds += record.bonusSeconds
      completedDays += 1
    }

    if (status === "falta" && dateKey <= today) {
      missedDays += 1
    }
  }

  const monthlyGoalSeconds = Math.round(settings.monthlyGoalHours * 3600)
  const remainingSeconds = Math.max(0, monthlyGoalSeconds - studiedSeconds)

  return {
    monthlyGoalSeconds,
    studiedSeconds,
    remainingSeconds,
    bonusSeconds,
    completedDays,
    missedDays,
  }
}

export function finalizeActiveSegment(
  record: DailyStudyRecord,
  nowMs: number = Date.now(),
): DailyStudyRecord {
  if (!record.activeSegmentStartedAt) return record

  const segmentSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(record.activeSegmentStartedAt).getTime()) / 1000),
  )

  return {
    ...record,
    activeSeconds: record.activeSeconds + segmentSeconds,
    activeSegmentStartedAt: null,
    updatedAt: nowIso(),
  }
}

export function finalizeOpenPause(
  record: DailyStudyRecord,
  nowMs: number = Date.now(),
): DailyStudyRecord {
  const openPause = getOpenPause(record)
  if (!openPause) return record

  const durationSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(openPause.startedAt).getTime()) / 1000),
  )

  const pauses = record.pauses.map((pause) =>
    pause === openPause
      ? { ...pause, endedAt: new Date(nowMs).toISOString(), durationSeconds }
      : pause,
  )

  return {
    ...record,
    pauses,
    pauseSeconds: record.pauseSeconds + durationSeconds,
    updatedAt: nowIso(),
  }
}
