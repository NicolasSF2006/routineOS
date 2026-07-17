import { readMentorEnvironment } from "@/features/mentor/server/mentor-environment"

describe("configuração do Mentor", () => {
  it("aceita os quatro modos manuais", () => {
    for (const provider of [
      "gemini",
      "groq",
      "openrouter",
      "openai",
    ] as const) {
      const result = readMentorEnvironment({
        MENTOR_AI_PROVIDER: provider,
        [`${provider.toUpperCase()}_API_KEY`]: "chave",
      })
      expect(result.provider).toBe(provider)
    }
  })

  it("usa automático e relata configuração inválida sem revelar valores", () => {
    const result = readMentorEnvironment({ MENTOR_AI_PROVIDER: "desconhecido" })
    expect(result.provider).toBe("auto")
    expect(result.issues.join(" ")).toContain("valor inválido")
    expect(result.issues.join(" ")).not.toContain("desconhecido")
  })
})
