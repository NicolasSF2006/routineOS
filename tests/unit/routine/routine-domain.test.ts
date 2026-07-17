import {
  findFirstStudyBlock,
  formatBlockTypeName,
  formatWeekdayName,
  getCurrentRoutineBlockIndex,
  getOfficialStartTimeForDateKey,
  getRoutineDayBlocksForDateKey,
  getWeekStartDateKey,
  getWeekdayFromDateKey,
  hasRoutineForDateKey,
} from "@/features/routine/utils/routine-domain"
import {
  getCurrentWeekDays,
  getDefaultWeekdayKey,
} from "@/features/routine/utils/routine-schedule"
import {
  createRoutine,
  createRoutineBlock,
  createRoutineDay,
} from "../../fixtures/routine"

describe("domínio e calendário da rotina", () => {
  const study = createRoutineBlock({ id: "estudo", order: 2 })
  const breakBlock = createRoutineBlock({
    id: "pausa",
    type: "short-break",
    title: "Pausa",
    startTime: "18:50",
    endTime: "19:00",
    durationMinutes: 10,
    order: 1,
  })
  const routine = createRoutine({
    days: [createRoutineDay("monday", [study, breakBlock])],
  })

  it("mapeia dia, rótulos e início oficial", () => {
    expect(getWeekdayFromDateKey("2026-07-13")).toBe("monday")
    expect(getWeekStartDateKey("2026-07-15")).toBe("2026-07-12")
    expect(formatWeekdayName("monday")).toBe("Segunda")
    expect(formatBlockTypeName("study")).toBe("Estudo")
    expect(getOfficialStartTimeForDateKey(routine, "2026-07-13")).toBe("18:50")
  })

  it("ordena blocos e encontra o primeiro bloco de estudo", () => {
    expect(
      getRoutineDayBlocksForDateKey(routine, "2026-07-13").map(
        (block) => block.id,
      ),
    ).toEqual(["pausa", "estudo"])
    expect(findFirstStudyBlock(routine, "monday")?.id).toBe("estudo")
    expect(hasRoutineForDateKey(routine, "2026-07-14")).toBe(false)
  })

  it("prioriza exceção semanal sem alterar a rotina base", () => {
    const exception = createRoutineBlock({ id: "excecao", order: 0 })
    const withWeek = createRoutine({
      days: routine.days,
      weeks: [
        {
          id: "semana",
          weekStartDate: "2026-07-12",
          days: [createRoutineDay("monday", [exception])],
        },
      ],
    })
    expect(getRoutineDayBlocksForDateKey(withWeek, "2026-07-13")[0]?.id).toBe(
      "excecao",
    )
    expect(getRoutineDayBlocksForDateKey(routine, "2026-07-13")[0]?.id).toBe(
      "pausa",
    )
  })

  it("localiza o bloco corrente por limites exatos", () => {
    const blocks = [breakBlock, study]
    expect(getCurrentRoutineBlockIndex(blocks, null)).toBe(-1)
    expect(getCurrentRoutineBlockIndex(blocks, 18 * 60 + 50)).toBe(0)
    expect(getCurrentRoutineBlockIndex(blocks, 19 * 60)).toBe(1)
    expect(getCurrentRoutineBlockIndex(blocks, 19 * 60 + 50)).toBe(-1)
  })

  it("gera a semana completa com o dia atual marcado", () => {
    const date = new Date(2026, 6, 15, 12)
    const week = getCurrentWeekDays(date)
    expect(getDefaultWeekdayKey(date)).toBe("wednesday")
    expect(week).toHaveLength(7)
    expect(week[0]).toMatchObject({ dateKey: "2026-07-12", dayNumber: "12" })
    expect(week.find((day) => day.isToday)?.dateKey).toBe("2026-07-15")
  })
})
