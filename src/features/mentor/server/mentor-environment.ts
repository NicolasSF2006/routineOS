import type { MentorProviderName } from "@/features/mentor/server/mentor-provider-router"

export type MentorProviderMode = MentorProviderName | "auto"

export interface MentorEnvironment {
  provider: MentorProviderMode
  providers: Record<MentorProviderName, { apiKey?: string; model?: string }>
  issues: string[]
}

function readOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function readMentorEnvironment(
  environment: Record<string, string | undefined> = process.env,
): MentorEnvironment {
  const rawProvider = readOptional(
    environment.MENTOR_AI_PROVIDER,
  )?.toLowerCase()
  const supportedModes: MentorProviderMode[] = [
    "auto",
    "gemini",
    "groq",
    "openrouter",
    "openai",
  ]
  const provider = supportedModes.includes(rawProvider as MentorProviderMode)
    ? (rawProvider as MentorProviderMode)
    : "auto"
  const issues: string[] = []

  if (
    rawProvider &&
    !supportedModes.includes(rawProvider as MentorProviderMode)
  ) {
    issues.push(
      "MENTOR_AI_PROVIDER possui valor inválido; o modo automático será usado.",
    )
  }

  const providers = {
    gemini: {
      apiKey: readOptional(environment.GEMINI_API_KEY),
      model: readOptional(environment.GEMINI_MODEL),
    },
    groq: {
      apiKey: readOptional(environment.GROQ_API_KEY),
      model: readOptional(environment.GROQ_MODEL),
    },
    openrouter: {
      apiKey: readOptional(environment.OPENROUTER_API_KEY),
      model: readOptional(environment.OPENROUTER_MODEL),
    },
    openai: {
      apiKey: readOptional(environment.OPENAI_API_KEY),
      model: readOptional(environment.OPENAI_MODEL),
    },
  }

  if (provider !== "auto" && !providers[provider].apiKey) {
    issues.push(`O provedor manual ${provider} não possui chave configurada.`)
  }

  if (
    provider === "auto" &&
    !Object.values(providers).some(({ apiKey }) => apiKey)
  ) {
    issues.push(
      "Nenhum provedor de IA possui chave; o Mentor usará o modo local.",
    )
  }

  return { provider, providers, issues }
}
