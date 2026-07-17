import { DEFAULT_ROUTINE } from "@/constants/routine"
import {
  createRoutineFromMentorProposal,
  normalizeMentorAction,
  normalizeMentorRoutineProposal,
} from "@/features/mentor/utils/mentor-routine-proposal"
import { mentorRoutineProposal } from "../../fixtures/mentor"

describe("proposta de rotina do Mentor", () => {
  it("rejeita dias duplicados, tipos inventados e horários inválidos", () => {
    expect(
      normalizeMentorRoutineProposal({
        ...mentorRoutineProposal,
        schedules: [
          {
            ...mentorRoutineProposal.schedules[0],
            weekdays: ["monday", "monday"],
            availabilityStartTime: "25:00",
            blocks: [{ type: "delete", title: "Inválido" }],
          },
        ],
      }),
    ).toBeNull()
  })

  it("gera pausas do Pomodoro e encurta o último foco até o limite disponível", () => {
    const normalized = normalizeMentorRoutineProposal({
      name: "Pomodoro",
      method: "pomodoro",
      summary: "Teste",
      pomodoro: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakAfterFocusBlocks: 2,
      },
      schedules: [
        {
          weekdays: ["friday"],
          availabilityStartTime: "19:00",
          availabilityEndTime: "21:00",
          blocks: [
            { type: "study", title: "Tema 1" },
            { type: "study", title: "Tema 2" },
            { type: "study", title: "Tema 3" },
            { type: "project", title: "Projeto prático" },
          ],
        },
      ],
    })

    expect(normalized).not.toBeNull()
    expect(normalized?.schedules[0].blocks.map((block) => block.type)).toEqual([
      "study",
      "short-break",
      "study",
      "long-break",
      "study",
      "short-break",
      "project",
    ])
    expect(normalized?.schedules[0].blocks.at(-1)).toMatchObject({
      type: "project",
      startTime: "20:40",
      durationMinutes: 20,
    })
  })

  it("importa a proposta como nova rotina sem modificar a rotina existente", () => {
    const original = structuredClone(DEFAULT_ROUTINE)
    const draft = createRoutineFromMentorProposal(
      mentorRoutineProposal,
      original,
    )

    expect(original).toEqual(DEFAULT_ROUTINE)
    expect(draft).not.toBe(original)
    expect(
      draft.days.find((day) => day.weekday === "monday")?.blocks,
    ).not.toHaveLength(0)
    expect(
      draft.days.find((day) => day.weekday === "tuesday")?.blocks,
    ).toHaveLength(0)
  })

  it("permite somente ações discriminadas conhecidas", () => {
    expect(
      normalizeMentorAction({
        type: "propose-routine",
        routine: mentorRoutineProposal,
      }),
    ).toMatchObject({ type: "propose-routine" })
    expect(normalizeMentorAction({ type: "reset-settings" })).toBeNull()
  })
})
