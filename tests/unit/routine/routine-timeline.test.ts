import {
  clampTimelineMinutes,
  formatTimelineTime,
  getConflictingBlockIds,
  getConflictWeekdays,
  parseTimeToMinutes,
  setBlockStartTime,
  snapMinutesToStep,
  sortRoutineDayBlocksByTime,
} from "@/features/routine/domain/routine-timeline"
import { createRoutineBlock, createRoutineDay } from "../../fixtures/routine"

describe("linha do tempo da rotina", () => {
  it.each([
    ["00:00", 0],
    ["09:05", 545],
    ["23:59", 1439],
  ])("converte %s em minutos", (time, expected) => {
    expect(parseTimeToMinutes(time)).toBe(expected)
  })

  it.each(["", "9", "9:5", "24:00", "23:60", "-1:00", "texto"])(
    "rejeita o horário inválido %s",
    (time) => expect(parseTimeToMinutes(time)).toBeNull(),
  )

  it("limita minutos ao intervalo do dia e aplica encaixe", () => {
    expect(clampTimelineMinutes(-1)).toBe(0)
    expect(clampTimelineMinutes(1500)).toBe(1439)
    expect(snapMinutesToStep(608, 5)).toBe(610)
    expect(formatTimelineTime(1439)).toBe("23:59")
  })

  it("move um bloco preservando descrição e identificador de recorrência", () => {
    const block = createRoutineBlock({ repeatSourceId: "serie-1" })
    const moved = setBlockStartTime(block, 20 * 60)

    expect(moved).toMatchObject({
      id: block.id,
      description: block.description,
      repeatSourceId: "serie-1",
      startTime: "20:00",
      endTime: "20:50",
    })
  })

  it("ordena blocos pelo horário sem alterar o array recebido", () => {
    const later = createRoutineBlock({ id: "depois", startTime: "20:00" })
    const earlier = createRoutineBlock({ id: "antes", startTime: "19:00" })
    const blocks = [later, earlier]

    expect(
      sortRoutineDayBlocksByTime(blocks, 600).map((block) => block.id),
    ).toEqual(["antes", "depois"])
    expect(blocks.map((block) => block.id)).toEqual(["depois", "antes"])
  })

  it("detecta sobreposição e não considera blocos adjacentes como conflito", () => {
    const overlapping = createRoutineBlock({
      id: "sobreposto",
      startTime: "19:40",
      endTime: "20:10",
      durationMinutes: 30,
    })
    const adjacent = createRoutineBlock({
      id: "adjacente",
      startTime: "19:50",
      endTime: "20:20",
      durationMinutes: 30,
    })

    const conflictWeek = {
      id: "semana",
      weekStartDate: "2026-07-12",
      days: [createRoutineDay("monday", [createRoutineBlock(), overlapping])],
    }
    const adjacentWeek = {
      ...conflictWeek,
      days: [createRoutineDay("monday", [createRoutineBlock(), adjacent])],
    }

    expect([...getConflictingBlockIds(conflictWeek, 600)]).toEqual([
      "bloco-1",
      "sobreposto",
    ])
    expect(getConflictWeekdays(conflictWeek, 600)).toEqual(["monday"])
    expect(getConflictingBlockIds(adjacentWeek, 600).size).toBe(0)
  })
})
