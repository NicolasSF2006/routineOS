import {
  DEFAULT_SETTINGS,
  MAX_CUSTOM_SOUND_SIZE_BYTES,
} from "@/constants/settings"
import {
  isObject,
  isTheme,
  normalizeMentorChat,
  normalizeNumber,
  normalizeRecords,
  normalizeRoutine,
  normalizeSettings,
  normalizeString,
  normalizeStudyTrails,
} from "@/lib/storage/storage-validators"
import { mentorRoutineProposal } from "../../fixtures/mentor"
import {
  createRoutine,
  createRoutineBlock,
  createRoutineDay,
} from "../../fixtures/routine"
import { studyTrailFixture } from "../../fixtures/trail"

describe("validadores do armazenamento", () => {
  describe("primitivos", () => {
    it("distingue objetos e normaliza strings, números e tema", () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(false)
      expect(isObject(null)).toBe(false)
      expect(normalizeString(" valor ", "fallback")).toBe(" valor ")
      expect(normalizeString("   ", "fallback")).toBe("fallback")
      expect(normalizeNumber(12.5, 0)).toBe(12.5)
      expect(normalizeNumber(Number.NaN, 7)).toBe(7)
      expect(isTheme("light")).toBe(true)
      expect(isTheme("dark")).toBe(true)
      expect(isTheme("system")).toBe(false)
    })
  })

  describe("rotina", () => {
    it("rejeita estruturas sem dias válidos", () => {
      expect(normalizeRoutine(null)).toBeNull()
      expect(normalizeRoutine({ days: "inválido" })).toBeNull()
      expect(normalizeRoutine({ days: [{ weekday: "feriado" }] })).toBeNull()
    })

    it("preserva rotina válida, modo legado, semanas e recorrência", () => {
      const routine = createRoutine({
        mode: "working",
        days: [
          createRoutineDay("monday", [
            createRoutineBlock({
              subjectId: "typescript",
              repeatSourceId: "serie-1",
              order: 2.9,
              durationMinutes: 50.8,
            }),
            // Bloco inválido deve ser descartado sem perder o dia.
            { type: "desconhecido", startTime: "99:00" },
          ] as never),
        ],
        weeks: [
          {
            id: "semana-1",
            weekStartDate: "2026-07-13",
            days: [createRoutineDay("tuesday", [createRoutineBlock()])],
          },
          { weekStartDate: 123, days: [] } as never,
        ],
      })

      const normalized = normalizeRoutine({ ...routine, mode: "trabalhando" })

      expect(normalized).toMatchObject({
        id: "rotina-teste",
        mode: "working",
        weeks: [{ id: "semana-1", weekStartDate: "2026-07-13" }],
      })
      expect(normalized?.days[0].blocks).toEqual([
        expect.objectContaining({
          subjectId: "typescript",
          repeatSourceId: "serie-1",
          durationMinutes: 50,
          order: 2,
        }),
      ])
    })

    it("aplica fallbacks e descarta blocos com horário ou duração inválidos", () => {
      const normalized = normalizeRoutine({
        id: "",
        name: "",
        mode: "modo-inexistente",
        createdAt: null,
        updatedAt: null,
        days: [
          {
            weekday: "monday",
            blocks: [
              {
                type: "study",
                title: "",
                startTime: "09:00",
                endTime: "10:00",
                durationMinutes: 60,
              },
              {
                type: "study",
                startTime: "inválido",
                endTime: "10:00",
                durationMinutes: 60,
              },
              {
                type: "study",
                startTime: "10:00",
                endTime: "11:00",
                durationMinutes: 0,
              },
            ],
          },
        ],
      })

      expect(normalized).toMatchObject({
        id: "custom-routine",
        name: "Rotina personalizada",
        mode: DEFAULT_SETTINGS.routineMode,
        createdAt: new Date(0).toISOString(),
      })
      expect(normalized?.days[0]).toMatchObject({
        id: "custom-monday",
        isActive: true,
      })
      expect(normalized?.days[0].blocks).toHaveLength(1)
      expect(normalized?.days[0].blocks[0]).toMatchObject({
        id: "monday-1",
        title: "study",
        order: 1,
      })
    })
  })

  describe("configurações", () => {
    it("retorna padrões para entrada inválida", () => {
      expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    })

    it("normaliza sons personalizados e preferências", () => {
      const normalized = normalizeSettings({
        routineMode: "ferias",
        dailyGoalHours: 4,
        customSounds: [
          {
            id: "som-1",
            name: "Alarme",
            dataUrl: "data:audio/mpeg;base64,AAA",
            mimeType: "audio/mpeg",
            sizeBytes: 128,
            durationSeconds: -4,
            createdAt: "2026-07-15T00:00:00.000Z",
          },
          {
            id: "grande",
            name: "Grande",
            dataUrl: "data:audio/mpeg;base64,AAA",
            sizeBytes: MAX_CUSTOM_SOUND_SIZE_BYTES + 1,
          },
          null,
        ],
        soundPreferences: {
          shortBreak: {
            audioId: "som-1",
            startSeconds: -10,
            endSeconds: -5,
          },
          longBreak: {
            audioId: "inexistente",
            startSeconds: 3,
            endSeconds: Number.NaN,
          },
        },
      })

      expect(normalized.routineMode).toBe("vacation")
      expect(normalized.customSounds).toEqual([
        expect.objectContaining({
          id: "som-1",
          durationSeconds: 0,
          sizeBytes: 128,
        }),
      ])
      expect(normalized.soundPreferences.shortBreak).toEqual({
        audioId: "som-1",
        startSeconds: 0,
        endSeconds: 0,
      })
      expect(normalized.soundPreferences.longBreak).toEqual({
        audioId: "default",
        startSeconds: 3,
        endSeconds: null,
      })
      expect(normalized.soundPreferences.lunch).toEqual(
        DEFAULT_SETTINGS.soundPreferences.lunch,
      )
    })
  })

  describe("registros", () => {
    it("retorna vazio para entrada inválida", () => {
      expect(normalizeRecords([])).toEqual({})
    })

    it("normaliza sessão, pausas e valores incompatíveis", () => {
      const records = normalizeRecords({
        "2026-07-15": {
          dateKey: 123,
          presenceAt: "2026-07-15T12:00:00.000Z",
          activeSeconds: Number.NaN,
          pauseSeconds: 30,
          routineBreakSeconds: "10",
          bonusSeconds: 15,
          status: "desconhecido",
          pauses: [
            {
              startedAt: "2026-07-15T12:30:00.000Z",
              endedAt: "2026-07-15T12:35:00.000Z",
              durationSeconds: 300,
            },
            null,
          ],
          routineBlockIndex: -2.8,
          routineBlockElapsedSeconds: 10.9,
          awaitingNextBlock: true,
        },
      })

      expect(records["2026-07-15"]).toMatchObject({
        dateKey: "2026-07-15",
        presenceAt: "2026-07-15T12:00:00.000Z",
        activeSeconds: 0,
        pauseSeconds: 30,
        routineBreakSeconds: 0,
        bonusSeconds: 15,
        status: "in-progress",
        routineBlockIndex: 0,
        routineBlockElapsedSeconds: 10,
        awaitingNextBlock: true,
      })
      expect(records["2026-07-15"].pauses).toEqual([
        {
          startedAt: "2026-07-15T12:30:00.000Z",
          endedAt: "2026-07-15T12:35:00.000Z",
          durationSeconds: 300,
        },
        {
          startedAt: new Date(0).toISOString(),
          endedAt: null,
          durationSeconds: 0,
        },
      ])
    })
  })

  describe("histórico do Mentor", () => {
    it("descarta mensagens inválidas, limita o histórico e normaliza ação", () => {
      const raw = Array.from({ length: 105 }, (_, index) => ({
        id: `mensagem-${index}`,
        role: index === 104 ? "assistant" : "user",
        content: ` mensagem ${index} `,
        createdAt: "2026-07-15T00:00:00.000Z",
      }))
      raw.push({
        id: "proposta",
        role: "assistant",
        content: "Rotina pronta",
        createdAt: "2026-07-15T00:00:00.000Z",
        action: { type: "preview-routine", routine: mentorRoutineProposal },
      } as never)
      raw.push({ role: "sistema", content: "não permitido" } as never)
      raw.push({ role: "user", content: "   " } as never)

      const normalized = normalizeMentorChat(raw)

      expect(normalized).toHaveLength(98)
      expect(normalized[0].id).toBe("mensagem-8")
      expect(normalized.at(-1)).toMatchObject({
        id: "proposta",
        content: "Rotina pronta",
        action: { type: "preview-routine" },
      })
    })

    it("limita mensagens extensas a seis mil caracteres", () => {
      expect(
        normalizeMentorChat([
          { role: "user", content: "a".repeat(7_000), id: "longa" },
        ])[0].content,
      ).toHaveLength(6_000)
    })
  })

  describe("trilhas", () => {
    it("retorna vazio para entrada incompatível e descarta itens nulos", () => {
      expect(normalizeStudyTrails({})).toEqual([])
      expect(normalizeStudyTrails([null])).toEqual([])
    })

    it("preserva uma trilha válida e normaliza recursos, foco e cursos", () => {
      const rawTrail = structuredClone(studyTrailFixture) as unknown as Record<
        string,
        unknown
      >
      rawTrail.providerMode = "provedor-desconhecido"
      rawTrail.topics = [
        {
          id: "tema-1",
          title: "Tema",
          description: "Descrição",
          sourceBlocks: ["Bloco", "", 4],
          sourceDays: ["Segunda", null],
          occurrenceCount: 2.9,
          totalMinutes: -20,
          steps: ["Passo 1", "", 2],
          projectSuggestion: "Projeto",
          isBroad: true,
          resources: [
            {
              id: "recurso",
              title: "Documentação",
              url: "https://example.com",
              type: "desconhecido",
              provider: "Exemplo",
              language: "fr",
              level: "avançado",
              topics: ["typescript", 2],
              description: "Material",
            },
          ],
          videoResources: [null],
          userCourses: [
            {
              title: "Curso",
              url: "https://www.youtube.com/watch?v=1",
              platform: "youtube.com",
              isFavorite: true,
              isCompleted: true,
            },
            { title: "", url: "" },
          ],
          focusOptions: [
            {
              id: "foco-1",
              label: "Fundamentos",
              steps: ["Revisar", null],
              resources: [],
              videoResources: [],
            },
            null,
          ],
          selectedFocusId: "foco-1",
          selectedFocusLabel: "Fundamentos",
          hiddenResourceIds: ["a", "a", "", 3],
          favoriteResourceIds: ["b"],
          studiedResourceIds: ["c"],
          masteryStatus: "studying",
          masteryUpdatedAt: "2026-07-15T00:00:00.000Z",
        },
      ]

      const normalized = normalizeStudyTrails([rawTrail])[0]
      const topic = normalized.topics[0]

      expect(normalized.providerMode).toBe("mock")
      expect(topic).toMatchObject({
        occurrenceCount: 2,
        totalMinutes: 0,
        sourceBlocks: ["Bloco"],
        sourceDays: ["Segunda"],
        steps: ["Passo 1"],
        isBroad: true,
        selectedFocusId: "foco-1",
        masteryStatus: "studying",
        hiddenResourceIds: ["a"],
      })
      expect(topic.resources[0]).toMatchObject({
        type: "curso",
        language: "pt-BR",
        level: "iniciante-intermediario",
        topics: ["typescript"],
      })
      expect(topic.userCourses).toEqual([
        expect.objectContaining({
          platform: "YouTube",
          isFavorite: true,
          isCompleted: true,
          completedAt: null,
        }),
      ])
      expect(topic.focusOptions).toEqual([
        expect.objectContaining({
          id: "foco-1",
          steps: ["Revisar"],
        }),
      ])
    })

    it("aplica fallbacks seguros em trilha parcialmente inválida", () => {
      const [trail] = normalizeStudyTrails([
        {
          topics: [
            {
              resources: [{ topics: "inválido" }],
              videoResources: [],
              userCourses: [],
            },
          ],
        },
      ])

      expect(trail).toMatchObject({
        id: "study-trail-1",
        title: "Trilha de estudos",
        routineName: "Rotina",
        providerMode: "mock",
      })
      expect(trail.topics[0]).toMatchObject({
        id: "trail-topic-1",
        title: "Tema de estudo",
        occurrenceCount: 1,
        totalMinutes: 0,
        projectSuggestion: "Crie uma entrega pequena para praticar este tema.",
        masteryStatus: null,
      })
    })
  })
})
