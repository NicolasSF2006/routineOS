import { POST } from "@/app/api/resource-metadata/route"
import { resetRateLimits } from "@/server/security/rate-limit"

function metadataRequest(userAgent?: string): Request {
  return new Request("http://localhost/api/resource-metadata", {
    method: "POST",
    body: JSON.stringify({ url: "inválida" }),
    headers: {
      "Content-Type": "application/json",
      ...(userAgent ? { "User-Agent": userAgent } : {}),
    },
  })
}

describe("rate limit da rota de metadados", () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"))
  })

  afterEach(() => vi.useRealTimers())

  it("permite requisições dentro do limite e bloqueia o excesso", async () => {
    for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
      expect((await POST(metadataRequest("cliente-a"))).status).toBe(400)
    }

    const blocked = await POST(metadataRequest("cliente-a"))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).toBe("60")
    await expect(blocked.json()).resolves.toEqual({
      error:
        "Muitas consultas de metadados foram solicitadas. Aguarde e tente novamente.",
    })
  })

  it("reinicia o limite após a expiração da janela", async () => {
    for (let requestIndex = 0; requestIndex < 11; requestIndex += 1) {
      await POST(metadataRequest("cliente-a"))
    }
    vi.advanceTimersByTime(60_000)
    expect((await POST(metadataRequest("cliente-a"))).status).toBe(400)
  })

  it("mantém buckets separados para clientes distintos", async () => {
    for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
      await POST(metadataRequest("cliente-a"))
    }
    expect((await POST(metadataRequest("cliente-a"))).status).toBe(429)
    expect((await POST(metadataRequest("cliente-b"))).status).toBe(400)
  })

  it("aplica fallback estável quando não há identificador confiável", async () => {
    for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
      await POST(metadataRequest())
    }
    expect((await POST(metadataRequest())).status).toBe(429)
  })
})
