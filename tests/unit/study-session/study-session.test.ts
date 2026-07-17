import { DEFAULT_SETTINGS } from "@/constants/settings"
import {
  advanceToNextRoutineBlock,
  buildDayDetail,
  completeCurrentRoutineBlock,
  computeLiveActiveSeconds,
  computeLivePauseSeconds,
  computeMonthStats,
  createEmptyRecord,
  deriveControlState,
  deriveDayStatus,
  finalizeCurrentRoutineSegment,
  finalizeOpenPause,
  getCountableBonusSeconds,
  getPresenceTiming,
  startCurrentRoutineSegment,
} from "@/features/study-session/utils/study-session"
import {
  createRoutine,
  createRoutineBlock,
  createRoutineDay,
} from "../../fixtures/routine"
import type { DailyStudyRecord } from "@/types/study"

describe("sessão de estudo", () => {
  const dateKey = "2026-07-13"
  const start = new Date(2026, 6, 13, 19, 0, 0).toISOString()
  const later = new Date(2026, 6, 13, 19, 10, 0).getTime()
  const study = createRoutineBlock({
    id: "estudo",
    startTime: "19:00",
    endTime: "19:50",
    durationMinutes: 50,
    order: 0,
  })
  const pause = createRoutineBlock({
    id: "pausa",
    type: "short-break",
    title: "Pausa",
    startTime: "19:50",
    endTime: "20:00",
    durationMinutes: 10,
    order: 1,
  })
  const routine = createRoutine({
    days: [createRoutineDay("monday", [study, pause])],
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))
  })

  afterEach(() => vi.useRealTimers())

  it("cria registro vazio e deriva estados de controle", () => {
    const empty = createEmptyRecord(dateKey)
    expect(empty).toMatchObject({
      dateKey,
      status: "in-progress",
      activeSeconds: 0,
      routineBlockIndex: 0,
    })
    expect(deriveControlState(null)).toBe("inicial")
    expect(deriveControlState({ ...empty, presenceAt: start })).toBe("presente")
    expect(
      deriveControlState({ ...empty, presenceAt: start, status: "completed" }),
    ).toBe("concluido")
    expect(
      deriveControlState({ ...empty, presenceAt: start, status: "canceled" }),
    ).toBe("cancelado")
  })

  it("calcula segmentos ativos e pausas abertas sem valores negativos", () => {
    const record = {
      ...createEmptyRecord(dateKey),
      presenceAt: start,
      studyStartedAt: start,
      activeSegmentStartedAt: start,
      activeSeconds: 30,
      pauses: [{ startedAt: start, endedAt: null, durationSeconds: 0 }],
      pauseSeconds: 10,
    }
    expect(computeLiveActiveSeconds(record, later)).toBe(630)
    expect(computeLivePauseSeconds(record, later)).toBe(610)
    expect(deriveControlState(record)).toBe("pausado")
    expect(
      computeLiveActiveSeconds(record, new Date(start).getTime() - 1),
    ).toBe(30)
  })

  it("inicia, finaliza e avança segmentos de estudo e pausa", () => {
    const base = {
      ...createEmptyRecord(dateKey),
      presenceAt: start,
      studyStartedAt: start,
    }
    const started = startCurrentRoutineSegment(base, [study, pause], start)
    expect(started.activeSegmentStartedAt).toBe(start)

    const finalized = finalizeCurrentRoutineSegment(
      started,
      [study, pause],
      later,
    )
    expect(finalized.activeSeconds).toBe(600)
    expect(finalized.routineBlockElapsedSeconds).toBe(600)

    const completed = completeCurrentRoutineBlock(
      finalized,
      [study, pause],
      later,
    )
    expect(completed.routineBlockElapsedSeconds).toBe(3_000)

    const next = advanceToNextRoutineBlock(completed, [study, pause], later)
    expect(next.routineBlockIndex).toBe(1)
    expect(next.routineBreakSegmentStartedAt).toBe(
      new Date(later).toISOString(),
    )

    const last = advanceToNextRoutineBlock(next, [study, pause], later)
    expect(last.awaitingNextBlock).toBe(true)
  })

  it("finaliza uma pausa aberta", () => {
    const record = {
      ...createEmptyRecord(dateKey),
      pauses: [{ startedAt: start, endedAt: null, durationSeconds: 0 }],
    }
    const finalized = finalizeOpenPause(record, later)
    expect(finalized.pauseSeconds).toBe(600)
    expect(finalized.pauses[0]).toMatchObject({
      endedAt: new Date(later).toISOString(),
      durationSeconds: 600,
    })
    expect(finalizeOpenPause(finalized, later)).toBe(finalized)
  })

  it("classifica presença e status do dia", () => {
    expect(getPresenceTiming(start, 10, "19:00")).toBe("correto")
    expect(
      getPresenceTiming(
        new Date(2026, 6, 13, 18, 59).toISOString(),
        10,
        "19:00",
      ),
    ).toBe("adiantado")
    expect(
      getPresenceTiming(
        new Date(2026, 6, 13, 19, 11).toISOString(),
        10,
        "19:00",
      ),
    ).toBe("atrasado")
    expect(deriveDayStatus(null, dateKey, DEFAULT_SETTINGS, routine)).toBe(
      "falta",
    )
    expect(
      deriveDayStatus(
        { ...createEmptyRecord(dateKey), status: "canceled" },
        dateKey,
        DEFAULT_SETTINGS,
        routine,
      ),
    ).toBe("cancelado")
    expect(deriveDayStatus(null, "2026-07-14", DEFAULT_SETTINGS, routine)).toBe(
      "sem-rotina",
    )
  })

  it("calcula bônus, detalhe e estatísticas mensais", () => {
    const completed: DailyStudyRecord = {
      ...createEmptyRecord(dateKey),
      presenceAt: start,
      studyStartedAt: start,
      activeSeconds: DEFAULT_SETTINGS.dailyGoalHours * 3_600 + 120,
      status: "completed",
      completedAt: later ? new Date(later).toISOString() : null,
    }
    expect(getCountableBonusSeconds(3_601, 3_600)).toBe(0)
    expect(getCountableBonusSeconds(3_720, 3_600)).toBe(120)
    expect(
      buildDayDetail(dateKey, 13, completed, DEFAULT_SETTINGS, later, routine),
    ).toMatchObject({ status: "acima-meta", bonus: "2min" })
    expect(
      computeMonthStats(
        2026,
        6,
        DEFAULT_SETTINGS,
        { [dateKey]: completed },
        routine,
      ),
    ).toMatchObject({ completedDays: 1, bonusSeconds: 120 })
  })
})
