import {
  checkRateLimit,
  createInMemoryRateLimitStore,
  getRequestClientKey,
  normalizeIpAddress,
  resetRateLimits,
} from "@/server/security/rate-limit"

function requestWithHeaders(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/teste", { headers })
}

describe("identificação do cliente do rate limit", () => {
  it("usa o IP direto fornecido pelo runtime", () => {
    expect(
      getRequestClientKey(requestWithHeaders(), { directAddress: "1.2.3.4" }),
    ).toBe("ip:1.2.3.4")
  })

  it("usa o valor correto atrás da quantidade configurada de proxies", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "198.51.100.20, 203.0.113.8, 203.0.113.9",
      "x-real-ip": "203.0.113.9",
    })
    expect(getRequestClientKey(request, { trustedProxyHops: 2 })).toBe(
      "ip:203.0.113.8",
    )
  })

  it("ignora headers de proxy quando o proxy não é confiável", () => {
    const forged = requestWithHeaders({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
      "user-agent": "navegador-estável",
    })
    expect(getRequestClientKey(forged, { trustedProxyHops: 0 })).toMatch(
      /^fallback:/,
    )
    expect(getRequestClientKey(forged, { trustedProxyHops: 0 })).not.toContain(
      "1.2.3.4",
    )
  })

  it("distingue clientes sem IP quando há sinais seguros disponíveis", () => {
    const first = getRequestClientKey(
      requestWithHeaders({ "user-agent": "navegador-a" }),
      { trustedProxyHops: 0 },
    )
    const second = getRequestClientKey(
      requestWithHeaders({ "user-agent": "navegador-b" }),
      { trustedProxyHops: 0 },
    )
    expect(first).not.toBe(second)
  })

  it.each([
    ["192.0.2.10", "192.0.2.10"],
    ["[2001:db8::1]:443", "2001:db8::1"],
    ["2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
  ])("normaliza %s", (raw, normalized) => {
    expect(normalizeIpAddress(raw)).toBe(normalized)
  })

  it("descarta valores inválidos em listas encaminhadas", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "forjado, 203.0.113.10",
    })
    expect(getRequestClientKey(request, { trustedProxyHops: 1 })).toBe(
      "ip:203.0.113.10",
    )
  })
})

describe("limite de requisições", () => {
  beforeEach(resetRateLimits)

  it("bloqueia excesso e libera após a janela", () => {
    expect(
      checkRateLimit({ key: "cliente", limit: 2, windowMs: 1000, now: 0 })
        .allowed,
    ).toBe(true)
    expect(
      checkRateLimit({ key: "cliente", limit: 2, windowMs: 1000, now: 10 })
        .allowed,
    ).toBe(true)
    const blocked = checkRateLimit({
      key: "cliente",
      limit: 2,
      windowMs: 1000,
      now: 20,
    })
    expect(blocked).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    })
    expect(
      checkRateLimit({ key: "cliente", limit: 2, windowMs: 1000, now: 1000 })
        .allowed,
    ).toBe(true)
  })

  it("mantém configurações independentes por rota", () => {
    expect(
      checkRateLimit({
        key: "mentor:cliente",
        limit: 1,
        windowMs: 1000,
        now: 0,
      }).allowed,
    ).toBe(true)
    expect(
      checkRateLimit({
        key: "mentor:cliente",
        limit: 1,
        windowMs: 1000,
        now: 1,
      }).allowed,
    ).toBe(false)
    expect(
      checkRateLimit({
        key: "metadados:cliente",
        limit: 2,
        windowMs: 2000,
        now: 1,
      }).allowed,
    ).toBe(true)
  })

  it("remove buckets expirados antes de aplicar eviction", () => {
    const store = createInMemoryRateLimitStore({ maximumBuckets: 2 })
    store.consume({ key: "expirado", limit: 1, windowMs: 10, now: 0 })
    store.consume({ key: "ativo", limit: 1, windowMs: 100, now: 5 })
    store.consume({ key: "novo", limit: 1, windowMs: 100, now: 11 })
    expect(store.size).toBe(2)
    expect(
      store.consume({ key: "ativo", limit: 1, windowMs: 100, now: 12 }).allowed,
    ).toBe(false)
  })

  it("mantém limite rígido e remove o bucket menos recentemente usado", () => {
    const store = createInMemoryRateLimitStore({ maximumBuckets: 2 })
    store.consume({ key: "antigo", limit: 1, windowMs: 100, now: 0 })
    store.consume({ key: "recente", limit: 1, windowMs: 100, now: 5 })

    // O novo acesso move o bucket para o fim da ordem LRU.
    expect(
      store.consume({ key: "antigo", limit: 1, windowMs: 100, now: 6 }).allowed,
    ).toBe(false)

    store.consume({ key: "novo", limit: 1, windowMs: 100, now: 10 })
    expect(store.size).toBe(2)

    // "recente" era o menos usado e deve ter sido removido.
    expect(
      store.consume({ key: "recente", limit: 1, windowMs: 100, now: 11 })
        .allowed,
    ).toBe(true)
    expect(store.size).toBe(2)
  })
})
