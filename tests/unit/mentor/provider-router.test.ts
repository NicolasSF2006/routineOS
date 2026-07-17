import {
  createMentorProviderStatusReply,
  createMentorReply,
  resetMentorProviderCooldowns,
} from "@/features/mentor/server/mentor-provider-router"
import { resetMentorObservability } from "@/features/mentor/server/mentor-observability"
import {
  createMentorContext,
  mentorRoutineProposal,
} from "../../fixtures/mentor"

const ORIGINAL_ENV = { ...process.env }

function request() {
  return {
    message: "Como estudar?",
    history: [],
    context: createMentorContext(),
  }
}

function groqResponse(reply = "Resposta da Groq") {
  return groqContentResponse(JSON.stringify({ reply }))
}

function groqContentResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

describe("roteamento dos provedores do Mentor", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.MENTOR_AI_PROVIDER
    resetMentorProviderCooldowns()
    resetMentorObservability()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    vi.spyOn(console, "info").mockImplementation(() => undefined)
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("usa o fallback na ordem atual após um 429", async () => {
    process.env.GEMINI_API_KEY = "chave-gemini-secreta"
    process.env.GROQ_API_KEY = "chave-groq-secreta"
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("limite", {
          status: 429,
          headers: { "Retry-After": "30" },
        }),
      )
      .mockResolvedValueOnce(groqResponse())

    const response = await createMentorReply(request())

    expect(response).toMatchObject({ mode: "groq", reply: "Resposta da Groq" })
    expect(fetchMock.mock.calls[0][0]).toContain(
      "generativelanguage.googleapis.com",
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.groq.com/openai/v1/chat/completions",
    )
  })

  it("não tenta outro provedor no modo manual", async () => {
    process.env.MENTOR_AI_PROVIDER = "gemini"
    process.env.GEMINI_API_KEY = "chave-gemini-secreta"
    process.env.GROQ_API_KEY = "chave-groq-secreta"
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("sem autorização", { status: 401 }))

    const response = await createMentorReply(request())

    expect(response.mode).toBe("mock")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("usa modo local quando todos os provedores estão sem chave", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const response = await createMentorReply(request())

    expect(response.mode).toBe("mock")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("executa /provedores sem retornar chaves ou cabeçalhos", async () => {
    process.env.GROQ_API_KEY = "segredo-que-nao-pode-vazar"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(groqResponse("OK"))

    const response = await createMentorProviderStatusReply()
    const logs =
      vi.mocked(console.info).mock.calls.flat().join(" ") +
      vi.mocked(console.warn).mock.calls.flat().join(" ")

    const requestBody = JSON.parse(
      vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
    )

    expect(response.reply).toContain("groq: ✅ funcionando")
    expect(response.reply).not.toContain("segredo-que-nao-pode-vazar")
    expect(logs).not.toContain("segredo-que-nao-pode-vazar")
    expect(requestBody.messages).toEqual([
      { role: "user", content: "Responda somente com OK." },
    ])
    expect(requestBody.max_tokens).toBe(16)
    expect(JSON.stringify(requestBody)).not.toContain(
      "Contexto resumido do RoutineOS",
    )
  })

  it("explica quando a OpenAI está sem cota ou créditos", async () => {
    process.env.OPENAI_API_KEY = "chave-openai-secreta"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "You exceeded your current quota.",
            type: "insufficient_quota",
            code: "insufficient_quota",
          },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      ),
    )

    const response = await createMentorProviderStatusReply()

    expect(response.reply).toContain("openai: ❌ indisponível")
    expect(response.reply).toContain("HTTP 429")
    expect(response.reply).toContain("cota ou créditos indisponíveis")
    expect(response.reply).not.toContain("You exceeded")
  })

  it("repete a solicitação quando um pedido de rotina volta sem action", async () => {
    process.env.GROQ_API_KEY = "chave-groq-secreta"
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        groqContentResponse(
          "Rotina semanal: segunda-feira, 10:30-11:20, TypeScript.",
        ),
      )
      .mockResolvedValueOnce(
        groqContentResponse(
          JSON.stringify({
            reply: "Prévia pronta.",
            action: {
              type: "preview-routine",
              routine: mentorRoutineProposal,
            },
          }),
        ),
      )

    const response = await createMentorReply({
      ...request(),
      message: "Crie uma rotina semanal de estudos",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(response).toMatchObject({
      mode: "groq",
      action: { type: "preview-routine" },
    })
    expect(
      JSON.parse(fetchMock.mock.calls[1][1]?.body as string).messages.at(-1)
        .content,
    ).toContain("action.type preview-routine")
  })

  it("confirma uma prévia com a resposta curta por favor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const response = await createMentorReply({
      ...request(),
      message: "por favor",
      history: [
        {
          id: "previa",
          role: "assistant",
          content: "Prévia pronta.",
          createdAt: new Date(0).toISOString(),
          action: {
            type: "preview-routine",
            routine: mentorRoutineProposal,
          },
        },
      ],
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      mode: "mock",
      action: { type: "propose-routine" },
    })
  })

  it("ajusta uma prévia com payload compacto e exige nova preview-routine", async () => {
    process.env.GROQ_API_KEY = "chave-groq-secreta"
    const adjustedProposal = {
      name: "Rotina ajustada",
      method: "custom" as const,
      summary: "Blocos de estudo com 50 minutos.",
      schedules: [
        {
          weekdays: ["monday" as const],
          availabilityStartTime: "10:30",
          availabilityEndTime: "12:15",
          blocks: [
            {
              type: "study" as const,
              title: "Node.js",
              startTime: "10:30",
              durationMinutes: 50,
            },
            {
              type: "short-break" as const,
              title: "Pausa curta",
              startTime: "11:20",
              durationMinutes: 5,
            },
            {
              type: "study" as const,
              title: "JavaScript",
              startTime: "11:25",
              durationMinutes: 50,
            },
          ],
        },
      ],
    }
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      groqContentResponse(
        JSON.stringify({
          reply: "Prévia ajustada.",
          action: {
            type: "preview-routine",
            routine: adjustedProposal,
          },
        }),
      ),
    )

    const response = await createMentorReply({
      ...request(),
      message: "Aumente a duração dos blocos de estudos para 50 minutos",
      history: [
        {
          id: "pedido-original",
          role: "user",
          content: "Crie uma rotina de Node.js e JavaScript.",
          createdAt: new Date(0).toISOString(),
        },
        {
          id: "previa",
          role: "assistant",
          content: "Prévia pronta.",
          createdAt: new Date(1).toISOString(),
          action: {
            type: "preview-routine",
            routine: mentorRoutineProposal,
          },
        },
      ],
    })

    expect(response).toMatchObject({
      mode: "groq",
      action: { type: "preview-routine" },
    })

    const requestBody = JSON.parse(
      fetchMock.mock.calls[0][1]?.body as string,
    ) as { messages: Array<{ role: string; content: string }> }
    const serializedMessages = JSON.stringify(requestBody.messages)

    expect(serializedMessages).toContain("AJUSTAR PRÉVIA DE ROTINA")
    expect(serializedMessages).toContain("PROPOSTA ATUAL")
    expect(serializedMessages).toContain(
      "Aumente a duração dos blocos de estudos para 50 minutos",
    )
    expect(serializedMessages).not.toContain("Contexto resumido do RoutineOS")
  })

  it("aplica uma grade horária exata localmente sem chamar provedores", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const customProposal = {
      name: "Rotina Full Stack",
      method: "custom" as const,
      summary: "Rotina semanal.",
      schedules: [
        {
          weekdays: ["monday" as const],
          availabilityStartTime: "10:30",
          availabilityEndTime: "13:25",
          blocks: [
            {
              type: "study" as const,
              title: "Node.js",
              startTime: "10:30",
              durationMinutes: 25,
            },
            {
              type: "short-break" as const,
              title: "Pausa curta",
              startTime: "10:55",
              durationMinutes: 5,
            },
            {
              type: "study" as const,
              title: "JavaScript",
              startTime: "11:00",
              durationMinutes: 25,
            },
            {
              type: "lunch" as const,
              title: "Almoço",
              startTime: "11:25",
              durationMinutes: 5,
            },
            {
              type: "study" as const,
              title: "SQL",
              startTime: "11:30",
              durationMinutes: 25,
            },
            {
              type: "long-break" as const,
              title: "Pausa longa",
              startTime: "11:55",
              durationMinutes: 5,
            },
            {
              type: "study" as const,
              title: "Git",
              startTime: "12:00",
              durationMinutes: 25,
            },
            {
              type: "short-break" as const,
              title: "Pausa curta",
              startTime: "12:25",
              durationMinutes: 5,
            },
            {
              type: "study" as const,
              title: "Inglês",
              startTime: "12:30",
              durationMinutes: 25,
            },
            {
              type: "long-break" as const,
              title: "Pausa longa",
              startTime: "12:55",
              durationMinutes: 5,
            },
            {
              type: "project" as const,
              title: "Projeto ERP Lite",
              startTime: "13:00",
              durationMinutes: 25,
            },
          ],
        },
      ],
    }

    const response = await createMentorReply({
      ...request(),
      message: [
        "Altere a proposta atual para terminar às 17:40.",
        "10:30–11:20 — estudo",
        "11:20–11:25 — pausa",
        "11:25–12:15 — estudo",
        "12:15–13:15 — almoço",
        "13:15–14:05 — estudo",
        "14:05–14:20 — pausa",
        "14:20–15:10 — estudo",
        "15:10–15:15 — pausa",
        "15:15–16:05 — estudo",
        "16:05–16:20 — pausa",
        "16:20–17:40 — projeto",
      ].join("\n"),
      history: [
        {
          id: "previa",
          role: "assistant",
          content: "Prévia pronta.",
          createdAt: new Date(0).toISOString(),
          action: {
            type: "preview-routine",
            routine: customProposal,
          },
        },
      ],
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      mode: "mock",
      action: {
        type: "preview-routine",
        routine: {
          schedules: [
            {
              availabilityStartTime: "10:30",
              availabilityEndTime: "17:40",
            },
          ],
        },
      },
    })
  })

  it("converte a confirmação de uma tabela antiga em nova prévia estruturada", async () => {
    process.env.GROQ_API_KEY = "chave-groq-secreta"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      groqContentResponse(
        JSON.stringify({
          reply: "Prévia pronta.",
          action: {
            type: "preview-routine",
            routine: mentorRoutineProposal,
          },
        }),
      ),
    )

    const response = await createMentorReply({
      ...request(),
      message: "então crie",
      history: [
        {
          id: "tabela",
          role: "assistant",
          content:
            "Rotina semanal\nSegunda-feira\n10:30-11:20 TypeScript\nDeseja que eu gere a prévia?",
          createdAt: new Date(0).toISOString(),
        },
      ],
    })

    expect(response).toMatchObject({
      mode: "groq",
      action: { type: "preview-routine" },
    })
  })
})
