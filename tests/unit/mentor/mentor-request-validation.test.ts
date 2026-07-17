import {
  MAX_MENTOR_CONTEXT_LENGTH,
  sanitizeMentorContext,
} from "@/features/mentor/server/mentor-request-validation"
import { createMentorContext } from "../../fixtures/mentor"
import type { MentorContext } from "@/features/mentor/types"

type MutableContext = MentorContext & Record<string, unknown>

function cloneContext(): MutableContext {
  return structuredClone(createMentorContext()) as MutableContext
}

function setField(target: object, key: string, value: unknown): void {
  const record = target as Record<string, unknown>
  record[key] = value
}

describe("validação profunda do contexto do Mentor", () => {
  it("aceita contexto completo e contexto mínimo válido", () => {
    const complete = cloneContext()
    complete.studyTrail = {
      hasTrail: true,
      title: "Trilha TypeScript",
      routineName: "Rotina de teste",
      topics: [
        {
          id: "typescript",
          title: "TypeScript",
          focus: null,
          masteryStatus: "studying",
          favoriteResources: [
            {
              id: "docs",
              title: "Documentação",
              provider: "TypeScript",
              type: "documentacao",
              section: "resource",
            },
          ],
          studiedResources: [],
          hiddenResources: [],
          userCourses: [
            {
              id: "curso",
              title: "Curso",
              url: "https://example.com/curso",
              platform: "Exemplo",
              isFavorite: true,
              isCompleted: false,
              completedAt: null,
            },
          ],
        },
      ],
    }
    expect(sanitizeMentorContext(complete)).toEqual(complete)

    const minimum = cloneContext()
    minimum.todayRoutine.blocks = []
    minimum.todayRoutine.hasRoutine = false
    minimum.todayRoutine.plannedMinutes = 0
    minimum.weekRoutine = []
    minimum.monthHistory = []
    minimum.monthRoutine.topics = []
    expect(sanitizeMentorContext(minimum)).not.toBeNull()
  })

  it.each([
    [
      "tipo de bloco",
      (context: MutableContext) =>
        setField(context.todayRoutine.blocks[0], "type", "desconhecido"),
    ],
    [
      "horário",
      (context: MutableContext) =>
        setField(context.todayRoutine.blocks[0], "startTime", "25:00"),
    ],
    [
      "duração negativa",
      (context: MutableContext) =>
        setField(context.todayRoutine.blocks[0], "durationMinutes", -1),
    ],
    [
      "rotina",
      (context: MutableContext) =>
        setField(context.activeRoutine, "mode", "inválido"),
    ],
    [
      "trilha",
      (context: MutableContext) => setField(context.studyTrail, "topics", [{}]),
    ],
    [
      "configurações",
      (context: MutableContext) =>
        setField(context.settings, "dailyGoalHours", "duas"),
    ],
  ])("rejeita %s inválido", (_name, mutate) => {
    const context = cloneContext()
    mutate(context)
    expect(sanitizeMentorContext(context)).toBeNull()
  })

  it("rejeita string e arrays excessivos", () => {
    const longString = cloneContext()
    setField(
      longString.activeRoutine,
      "name",
      "a".repeat(MAX_MENTOR_CONTEXT_LENGTH + 1),
    )
    expect(sanitizeMentorContext(longString)).toBeNull()

    const longArray = cloneContext()
    setField(
      longArray,
      "weekRoutine",
      Array.from({ length: 8 }, () => structuredClone(longArray.todayRoutine)),
    )
    expect(sanitizeMentorContext(longArray)).toBeNull()
  })

  it("rejeita objeto profundo", () => {
    const context = cloneContext()
    let nested: Record<string, unknown> = {}
    context.extra = nested
    for (let depth = 0; depth < 12; depth += 1) {
      nested.next = {}
      nested = nested.next as Record<string, unknown>
    }
    expect(sanitizeMentorContext(context)).toBeNull()
  })

  it("descarta campos inesperados e mantém dados legados válidos", () => {
    const context = cloneContext()
    context.campoLegado = "ignorado"
    setField(context.activeRoutine, "campoAntigo", true)
    const sanitized = sanitizeMentorContext(context)
    expect(sanitized).not.toBeNull()
    expect(sanitized).not.toHaveProperty("campoLegado")
    expect(sanitized?.activeRoutine).not.toHaveProperty("campoAntigo")
  })
})
