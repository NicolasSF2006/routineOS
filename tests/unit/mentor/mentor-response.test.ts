import { parseMentorProviderResponse } from "@/features/mentor/server/mentor-response"

describe("parser de respostas do Mentor", () => {
  it("lê JSON válido e mantém Markdown", () => {
    const result = parseMentorProviderResponse(
      JSON.stringify({ reply: "**Plano:**\n- revisar", action: null }),
    )

    expect(result).toEqual({
      reply: "**Plano:**\n- revisar",
      action: undefined,
    })
  })

  it("repara quebras de linha dentro de strings JSON", () => {
    const result = parseMentorProviderResponse(
      '{"reply":"Linha 1\nLinha 2","action":null}',
    )
    expect(result.reply).toBe("Linha 1\nLinha 2")
  })

  it("não expõe JSON bruto quando a resposta estruturada está truncada", () => {
    const result = parseMentorProviderResponse('{"reply":"texto","action":')

    expect(result.malformedStructuredResponse).toBe(true)
    expect(result.reply).not.toContain('{"reply"')
  })

  it("aceita texto comum e rejeita uma ação desconhecida", () => {
    expect(parseMentorProviderResponse("Resposta comum")).toEqual({
      reply: "Resposta comum",
    })

    const unknown = parseMentorProviderResponse(
      JSON.stringify({
        reply: "Tentativa",
        action: { type: "delete-routine" },
      }),
    )
    expect(unknown.malformedStructuredResponse).toBe(true)
    expect(unknown.action).toBeUndefined()
  })
})
