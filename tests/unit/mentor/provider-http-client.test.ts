import { fetchMentorProvider } from "@/features/mentor/server/provider-http-client"

describe("cliente HTTP dos provedores", () => {
  it("normaliza timeout sem expor o corpo da solicitação", async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Abortado", "AbortError")),
          )
        }),
    )

    const pending = fetchMentorProvider(
      "teste",
      "https://example.com",
      { method: "POST", body: "conteúdo sensível" },
      100,
    )
    const assertion = expect(pending).rejects.toMatchObject({
      name: "MentorProviderError",
      provider: "teste",
      retryable: true,
    })
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    vi.useRealTimers()
  })

  it.each([401, 403, 429, 500])("normaliza HTTP %s", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("erro", { status }),
    )

    await expect(
      fetchMentorProvider("teste", "https://example.com", {}),
    ).rejects.toMatchObject({
      status,
      retryable: status === 429 || status >= 500,
    })
  })
})
