import { DEFAULT_ROUTINE } from "@/constants/routine"
import {
  getOfficialStartTimeForDateKey as getRoutineOfficialStartTimeForDateKey,
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
  RoutineBlock,
  RoutineBlockType,
  StudyPause,
  StudySettings,
} from "@/types/study"

export const BONUS_THRESHOLD_SECONDS = 120

export function getCountableBonusSeconds(activeSeconds: number, goalSeconds: number): number {
  const extraSeconds = Math.max(0, activeSeconds - goalSeconds)
  return extraSeconds >= BONUS_THRESHOLD_SECONDS ? extraSeconds : 0
}

export function getOfficialStartTime(
  dateKey: string = getTodayDateKey(),
  routine: Routine = DEFAULT_ROUTINE,
): string | null {
  return getRoutineOfficialStartTimeForDateKey(routine, dateKey)
}

export function createEmptyRecord(dateKey: string): DailyStudyRecord {
  return {
    dateKey,
    presenceAt: null,
    studyStartedAt: null,
    activeSeconds: 0,
    pauseSeconds: 0,
    routineBreakSeconds: 0,
    bonusSeconds: 0,
    status: "in-progress",
    pauses: [],
    completedAt: null,
    canceledAt: null,
    resumedAt: null,
    updatedAt: nowIso(),
    activeSegmentStartedAt: null,
    routineBreakSegmentStartedAt: null,
    routineBlockIndex: 0,
    routineBlockElapsedSeconds: 0,
    awaitingNextBlock: false,
  }
}

export function getOpenPause(record: DailyStudyRecord): StudyPause | null {
  return record.pauses.find((p) => p.endedAt === null) ?? null
}

export function isActiveStudyBlock(type: RoutineBlockType): boolean {
  return type === "study" || type === "project" || type === "other"
}

export function isRoutineBreakBlock(type: RoutineBlockType): boolean {
  return type === "short-break" || type === "long-break" || type === "lunch"
}

export function getRoutineBlockDurationSeconds(block: RoutineBlock | null): number {
  return Math.max(0, (block?.durationMinutes ?? 0) * 60)
}

export function getCurrentRoutineBlock(
  record: DailyStudyRecord | null,
  routineBlocks: RoutineBlock[],
): RoutineBlock | null {
  if (!record?.studyStartedAt) return null
  return routineBlocks[record.routineBlockIndex] ?? null
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

export function computeLiveRoutineBreakSeconds(record: DailyStudyRecord, nowMs: number): number {
  let total = record.routineBreakSeconds
  if (record.routineBreakSegmentStartedAt && record.status === "in-progress") {
    total += Math.max(
      0,
      Math.floor((nowMs - new Date(record.routineBreakSegmentStartedAt).getTime()) / 1000),
    )
  }
  return total
}

export function computeLiveRoutineBlockElapsedSeconds(
  record: DailyStudyRecord,
  block: RoutineBlock | null,
  nowMs: number,
): number {
  if (!block) return 0

  let elapsed = record.routineBlockElapsedSeconds
  const segmentStartedAt = isActiveStudyBlock(block.type)
    ? record.activeSegmentStartedAt
    : record.routineBreakSegmentStartedAt

  if (segmentStartedAt && record.status === "in-progress") {
    elapsed += Math.max(0, Math.floor((nowMs - new Date(segmentStartedAt).getTime()) / 1000))
  }

  return Math.min(elapsed, getRoutineBlockDurationSeconds(block))
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
  if (record.status === "canceled") return "cancelado"
  if (!record.studyStartedAt) return "presente"
  if (getOpenPause(record)) return "pausado"
  if (record.awaitingNextBlock) return "aguardando"
  if (record.activeSegmentStartedAt || record.routineBreakSegmentStartedAt) return "estudando"
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
    if (dateKey >= today) return "rotina-prevista"
    if (dateKey < today) return "falta"
    return "rotina-prevista"
  }

  if (record.status === "completed" && getCountableBonusSeconds(record.activeSeconds, getDailyGoalSeconds(settings)) > 0) {
    return "acima-meta"
  }

  if (record.status === "canceled") return "cancelado"

  if (!record.presenceAt) {
    if (dateKey < today) return "falta"
    return "rotina-prevista"
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

  return "rotina-prevista"
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
    case "rotina-prevista":
      return "Dia com rotina programada, ainda sem presença registrada."
    case "acima-meta":
      return "Meta diária concluída com horas bônus registradas."
    case "cancelado":
      return "Dia de aula cancelado."
    case "falta":
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
      return "Dia sem rotina programada."
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
      resumedAt: record?.resumedAt ? formatTime(record.resumedAt) : null,
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
    bonus: getCountableBonusSeconds(record.activeSeconds, getDailyGoalSeconds(settings)) > 0
      ? formatDuration(getCountableBonusSeconds(record.activeSeconds, getDailyGoalSeconds(settings)))
      : null,
    canceledAt: record.canceledAt ? formatTime(record.canceledAt) : null,
    resumedAt: record.resumedAt ? formatTime(record.resumedAt) : null,
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
      bonusSeconds += getCountableBonusSeconds(record.activeSeconds, getDailyGoalSeconds(settings))
      completedDays += 1
    }

    if ((status === "falta" || status === "cancelado") && dateKey <= today) {
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

export function startCurrentRoutineSegment(
  record: DailyStudyRecord,
  routineBlocks: RoutineBlock[],
  startedAt: string = nowIso(),
): DailyStudyRecord {
  const block = routineBlocks[record.routineBlockIndex] ?? null
  const durationSeconds = getRoutineBlockDurationSeconds(block)

  if (!block || record.routineBlockElapsedSeconds >= durationSeconds) {
    return {
      ...record,
      activeSegmentStartedAt: null,
      routineBreakSegmentStartedAt: null,
      awaitingNextBlock: Boolean(block),
      updatedAt: nowIso(),
    }
  }

  return {
    ...record,
    activeSegmentStartedAt: isActiveStudyBlock(block.type) ? startedAt : null,
    routineBreakSegmentStartedAt: isRoutineBreakBlock(block.type) ? startedAt : null,
    awaitingNextBlock: false,
    updatedAt: nowIso(),
  }
}

export function finalizeCurrentRoutineSegment(
  record: DailyStudyRecord,
  routineBlocks: RoutineBlock[],
  nowMs: number = Date.now(),
): DailyStudyRecord {
  const block = routineBlocks[record.routineBlockIndex] ?? null
  if (!block) {
    return finalizeActiveSegment(
      { ...record, routineBreakSegmentStartedAt: null, routineBlockElapsedSeconds: 0 },
      nowMs,
    )
  }

  const isStudy = isActiveStudyBlock(block.type)
  const segmentStartedAt = isStudy
    ? record.activeSegmentStartedAt
    : record.routineBreakSegmentStartedAt

  if (!segmentStartedAt) return record

  const segmentSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(segmentStartedAt).getTime()) / 1000),
  )
  const remainingBlockSeconds = Math.max(
    0,
    getRoutineBlockDurationSeconds(block) - record.routineBlockElapsedSeconds,
  )
  const countedSeconds = Math.min(segmentSeconds, remainingBlockSeconds)

  return {
    ...record,
    activeSeconds: isStudy ? record.activeSeconds + countedSeconds : record.activeSeconds,
    routineBreakSeconds: isStudy
      ? record.routineBreakSeconds
      : record.routineBreakSeconds + countedSeconds,
    routineBlockElapsedSeconds: record.routineBlockElapsedSeconds + countedSeconds,
    activeSegmentStartedAt: null,
    routineBreakSegmentStartedAt: null,
    updatedAt: nowIso(),
  }
}

export function completeCurrentRoutineBlock(
  record: DailyStudyRecord,
  routineBlocks: RoutineBlock[],
  nowMs: number = Date.now(),
): DailyStudyRecord {
  const block = routineBlocks[record.routineBlockIndex] ?? null
  if (!block) return finalizeCurrentRoutineSegment(record, routineBlocks, nowMs)

  const next = finalizeCurrentRoutineSegment(record, routineBlocks, nowMs)

  return {
    ...next,
    routineBlockElapsedSeconds: getRoutineBlockDurationSeconds(block),
    activeSegmentStartedAt: null,
    routineBreakSegmentStartedAt: null,
    awaitingNextBlock: false,
    updatedAt: nowIso(),
  }
}

export function hasNextRoutineBlock(
  record: DailyStudyRecord,
  routineBlocks: RoutineBlock[],
): boolean {
  return record.routineBlockIndex + 1 < routineBlocks.length
}

export function advanceToNextRoutineBlock(
  record: DailyStudyRecord,
  routineBlocks: RoutineBlock[],
  nowMs: number = Date.now(),
): DailyStudyRecord {
  if (!hasNextRoutineBlock(record, routineBlocks)) {
    return {
      ...record,
      activeSegmentStartedAt: null,
      routineBreakSegmentStartedAt: null,
      awaitingNextBlock: true,
      updatedAt: nowIso(),
    }
  }

  const nextRecord: DailyStudyRecord = {
    ...record,
    routineBlockIndex: record.routineBlockIndex + 1,
    routineBlockElapsedSeconds: 0,
    activeSegmentStartedAt: null,
    routineBreakSegmentStartedAt: null,
    awaitingNextBlock: false,
    updatedAt: nowIso(),
  }

  return startCurrentRoutineSegment(nextRecord, routineBlocks, new Date(nowMs).toISOString())
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
