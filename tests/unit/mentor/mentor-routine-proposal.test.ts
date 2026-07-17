import { DEFAULT_ROUTINE } from "@/constants/routine"
import {
  createRoutineFromMentorProposal,
  hasUnstructuredRoutineSuggestion,
  isExplicitRoutineConfirmation,
  isRoutineCreationRequest,
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

  it("reconhece confirmações curtas quando já existe uma prévia", () => {
    expect(isExplicitRoutineConfirmation("sim")).toBe(true)
    expect(isExplicitRoutineConfirmation("por favor")).toBe(true)
    expect(isExplicitRoutineConfirmation("então crie")).toBe(true)
    expect(isExplicitRoutineConfirmation("sim, mas ajuste a sexta")).toBe(false)
  })

  it("identifica pedidos explícitos de criação de rotina", () => {
    expect(isRoutineCreationRequest("Crie uma rotina semanal de estudos")).toBe(
      true,
    )
    expect(isRoutineCreationRequest("Analise minha rotina atual")).toBe(false)
  })

  it("identifica uma sugestão de rotina enviada sem action", () => {
    expect(
      hasUnstructuredRoutineSuggestion([
        {
          id: "resposta",
          role: "assistant",
          createdAt: new Date(0).toISOString(),
          content:
            "Rotina semanal\nSegunda-feira\n10:30–11:20 Node.js\nDeseja que eu gere a prévia?",
        },
        {
          id: "fallback",
          role: "assistant",
          createdAt: new Date(1).toISOString(),
          content: "Estou em modo local no momento.",
        },
      ]),
    ).toBe(true)
  })
})
