import {
  createMentorProviderStatusReply,
  createMentorReply,
  resetMentorProviderCooldowns,
} from "@/features/mentor/server/mentor-provider-router"
import { resetMentorObservability } from "@/features/mentor/server/mentor-observability"
import { createMentorContext } from "../../fixtures/mentor"

const ORIGINAL_ENV = { ...process.env }

function request() {
  return {
    message: "Como estudar?",
    history: [],
    context: createMentorContext(),
  }
}

function groqResponse(reply = "Resposta da Groq") {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ reply }) } }],
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

    const response = await createMentorProviderStatusReply(request())
    const logs =
      vi.mocked(console.info).mock.calls.flat().join(" ") +
      vi.mocked(console.warn).mock.calls.flat().join(" ")

    expect(response.reply).toContain("groq: ✅ funcionando")
    expect(response.reply).not.toContain("segredo-que-nao-pode-vazar")
    expect(logs).not.toContain("segredo-que-nao-pode-vazar")
  })
})
