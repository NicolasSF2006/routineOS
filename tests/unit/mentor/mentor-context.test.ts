import { STORAGE_KEYS } from "@/constants/storage"
import { buildMentorContext } from "@/features/mentor/utils/mentor-context"
import { saveStoredRoutine } from "@/lib/storage"
import {
  createRoutine,
  createRoutineBlock,
  createRoutineDay,
} from "../../fixtures/routine"

describe("contexto enviado ao Mentor", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0))
  })

  afterEach(() => vi.useRealTimers())

  it("resume com segurança o primeiro acesso sem rotina", () => {
    expect(buildMentorContext({ currentView: "rotina" })).toMatchObject({
      currentView: "rotina",
      today: "2026-07-13",
      activeRoutine: { hasCustomRoutine: false },
      todayRoutine: { hasRoutine: false, blocks: [] },
      studyTrail: { hasTrail: false, topics: [] },
      theme: null,
      onboardingCompleted: false,
    })
  })

  it("limita blocos, agrupa temas e lê preferências locais", () => {
    const blocks = Array.from({ length: 30 }, (_, index) =>
      createRoutineBlock({
        id: `bloco-${index}`,
        title: index % 2 === 0 ? "TypeScript" : "React",
        startTime: `${String(index % 24).padStart(2, "0")}:00`,
        endTime: `${String(index % 24).padStart(2, "0")}:30`,
        durationMinutes: 30,
        order: index,
      }),
    )
    saveStoredRoutine(
      createRoutine({ days: [createRoutineDay("monday", blocks)] }),
    )
    localStorage.setItem(STORAGE_KEYS.theme, "dark")
    localStorage.setItem(STORAGE_KEYS.onboardingCompleted, "true")

    const context = buildMentorContext({ currentView: "configurar-rotina" })
    expect(context.activeRoutine.hasCustomRoutine).toBe(true)
    expect(context.todayRoutine.blocks).toHaveLength(24)
    expect(context.monthRoutine.topics.map((topic) => topic.title)).toEqual([
      "TypeScript",
      "React",
    ])
    expect(context.theme).toBe("dark")
    expect(context.onboardingCompleted).toBe(true)
  })
})
