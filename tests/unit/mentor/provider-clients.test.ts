import { createOpenAIMentorReply } from "@/features/mentor/server/providers/openai-provider"
import { createOpenRouterMentorReply } from "@/features/mentor/server/providers/openrouter-provider"
import { createMentorContext } from "../../fixtures/mentor"

const { fetchMentorProviderMock } = vi.hoisted(() => ({
  fetchMentorProviderMock: vi.fn(),
}))

vi.mock("@/features/mentor/server/provider-http-client", () => ({
  fetchMentorProvider: fetchMentorProviderMock,
}))

const request = {
  message: "Como estudar?",
  history: [
    {
      id: "mensagem-1",
      role: "assistant" as const,
      content: "Vamos organizar.",
      createdAt: "2026-07-15T12:00:00.000Z",
    },
  ],
  context: createMentorContext(),
}

describe("clientes OpenAI e OpenRouter", () => {
  beforeEach(() => fetchMentorProviderMock.mockReset())

  it("monta a requisição da OpenAI e lê output_text", async () => {
    fetchMentorProviderMock.mockResolvedValue(
      new Response(JSON.stringify({ output_text: "  Resposta OpenAI  " })),
    )
    await expect(
      createOpenAIMentorReply({ apiKey: "segredo", model: "modelo", request }),
    ).resolves.toBe("Resposta OpenAI")

    const [provider, url, init] = fetchMentorProviderMock.mock.calls[0]
    expect(provider).toBe("openai")
    expect(url).toBe("https://api.openai.com/v1/responses")
    expect(init.headers.Authorization).toBe("Bearer segredo")
    const body = JSON.parse(init.body)
    expect(body.model).toBe("modelo")
    expect(body.input.at(-1)).toEqual({
      role: "user",
      content: "Como estudar?",
    })
  })

  it("lê partes aninhadas da OpenAI e rejeita resposta vazia", async () => {
    fetchMentorProviderMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output: [{ content: [{ text: "Parte 1" }, { text: "Parte 2" }] }],
        }),
      ),
    )
    await expect(
      createOpenAIMentorReply({ apiKey: "chave", model: "modelo", request }),
    ).resolves.toBe("Parte 1\n\nParte 2")

    fetchMentorProviderMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ output: [] })),
    )
    await expect(
      createOpenAIMentorReply({ apiKey: "chave", model: "modelo", request }),
    ).rejects.toThrow("A resposta da OpenAI veio vazia.")
  })

  it("monta a requisição do OpenRouter e lê a primeira escolha válida", async () => {
    fetchMentorProviderMock.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "  Resposta  " } }] }),
      ),
    )
    await expect(
      createOpenRouterMentorReply({
        apiKey: "segredo",
        model: "modelo-router",
        request,
      }),
    ).resolves.toBe("Resposta")

    const [provider, url, init] = fetchMentorProviderMock.mock.calls[0]
    expect(provider).toBe("openrouter")
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions")
    expect(init.headers).toMatchObject({
      Authorization: "Bearer segredo",
      "X-Title": "RoutineOS Mentor IA",
    })
    expect(JSON.parse(init.body).model).toBe("modelo-router")
  })

  it("rejeita resposta vazia do OpenRouter", async () => {
    fetchMentorProviderMock.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: " " } }] }),
      ),
    )
    await expect(
      createOpenRouterMentorReply({
        apiKey: "chave",
        model: "modelo",
        request,
      }),
    ).rejects.toThrow("A resposta do OpenRouter veio vazia.")
  })
})
