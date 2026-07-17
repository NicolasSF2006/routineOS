import { readJsonBody } from "@/server/http/read-json-body"

const encoder = new TextEncoder()

function createRequest(
  chunks: string[],
  { contentLength }: { contentLength?: number } = {},
): Request {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

  return new Request("http://localhost/api/teste", {
    method: "POST",
    body,
    duplex: "half",
    headers:
      contentLength === undefined
        ? undefined
        : { "Content-Length": String(contentLength) },
  } as RequestInit)
}

describe("leitura limitada de JSON", () => {
  it("aceita corpo abaixo do limite", async () => {
    await expect(
      readJsonBody(createRequest(['{"ok":true}']), 20),
    ).resolves.toEqual({ ok: true, value: { ok: true } })
  })

  it("aceita corpo exatamente no limite", async () => {
    const body = '{"ok":true}'
    await expect(
      readJsonBody(createRequest([body]), encoder.encode(body).byteLength),
    ).resolves.toEqual({ ok: true, value: { ok: true } })
  })

  it("rejeita antecipadamente Content-Length acima do limite", async () => {
    await expect(
      readJsonBody(createRequest(['{"ok":true}'], { contentLength: 100 }), 20),
    ).resolves.toEqual({ ok: false, reason: "payload-too-large" })
  })

  it("rejeita corpo acima do limite sem Content-Length", async () => {
    await expect(
      readJsonBody(createRequest(['{"texto":"grande"}']), 10),
    ).resolves.toEqual({ ok: false, reason: "payload-too-large" })
  })

  it("não confia em Content-Length menor que o corpo real", async () => {
    await expect(
      readJsonBody(
        createRequest(['{"texto":"grande"}'], { contentLength: 2 }),
        10,
      ),
    ).resolves.toEqual({ ok: false, reason: "payload-too-large" })
  })

  it("lê JSON dividido em vários chunks", async () => {
    await expect(
      readJsonBody(createRequest(['{"valor":', "42", "}"]), 20),
    ).resolves.toEqual({ ok: true, value: { valor: 42 } })
  })

  it("rejeita JSON inválido e corpo vazio", async () => {
    await expect(readJsonBody(createRequest(["{"]), 20)).resolves.toEqual({
      ok: false,
      reason: "invalid-json",
    })
    await expect(readJsonBody(createRequest([]), 20)).resolves.toEqual({
      ok: false,
      reason: "invalid-json",
    })
  })

  it("conta bytes reais de caracteres multibyte", async () => {
    const body = '{"valor":"á"}'
    expect(body.length).toBeLessThan(encoder.encode(body).byteLength)
    await expect(
      readJsonBody(createRequest([body]), body.length),
    ).resolves.toEqual({ ok: false, reason: "payload-too-large" })
  })

  it("cancela o stream assim que o limite é ultrapassado", async () => {
    let cancelReason: unknown
    let pulls = 0
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1
          controller.enqueue(encoder.encode(pulls === 1 ? "12345" : "67890"))
        },
        cancel(reason) {
          cancelReason = reason
        },
      },
      { highWaterMark: 0 },
    )
    const request = new Request("http://localhost/api/teste", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit)

    await expect(readJsonBody(request, 4)).resolves.toEqual({
      ok: false,
      reason: "payload-too-large",
    })
    expect(cancelReason).toBe("payload-too-large")
    expect(pulls).toBe(1)
  })
})
