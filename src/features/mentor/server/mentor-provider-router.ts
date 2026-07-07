import { createMockMentorReply } from "@/features/mentor/server/openai-mentor"
import {
  createGeminiMentorReply,
  DEFAULT_GEMINI_MODEL,
} from "@/features/mentor/server/providers/gemini-provider"
import {
  createGroqMentorReply,
  DEFAULT_GROQ_MODEL,
} from "@/features/mentor/server/providers/groq-provider"
import {
  createOpenAIMentorReply,
  DEFAULT_OPENAI_MODEL,
} from "@/features/mentor/server/providers/openai-provider"
import {
  createOpenRouterMentorReply,
  DEFAULT_OPENROUTER_MODEL,
} from "@/features/mentor/server/providers/openrouter-provider"
import type { MentorApiResponse } from "@/features/mentor/types"
import type { MentorProviderRequest } from "@/features/mentor/server/mentor-prompts"

export type MentorProviderName = "gemini" | "groq" | "openrouter" | "openai"

type MentorProviderConfig = {
  name: MentorProviderName
  apiKey?: string
  model: string
  createReply: (args: {
    apiKey: string
    model: string
    request: MentorProviderRequest
  }) => Promise<string>
}

const DEFAULT_PROVIDER_ORDER: MentorProviderName[] = ["gemini", "groq", "openrouter", "openai"]

function getEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : undefined
}

function getPreferredProvider(): MentorProviderName | "auto" {
  const provider = getEnvValue(process.env.MENTOR_AI_PROVIDER)?.toLowerCase()

  if (
    provider === "gemini" ||
    provider === "groq" ||
    provider === "openrouter" ||
    provider === "openai"
  ) {
    return provider
  }

  return "auto"
}

function createProviderOrder(): MentorProviderName[] {
  const preferredProvider = getPreferredProvider()

  if (preferredProvider === "auto") return DEFAULT_PROVIDER_ORDER

  return [
    preferredProvider,
    ...DEFAULT_PROVIDER_ORDER.filter((provider) => provider !== preferredProvider),
  ]
}

function createProviderConfigs(): Record<MentorProviderName, MentorProviderConfig> {
  return {
    gemini: {
      name: "gemini",
      apiKey: getEnvValue(process.env.GEMINI_API_KEY),
      model: getEnvValue(process.env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL,
      createReply: createGeminiMentorReply,
    },
    groq: {
      name: "groq",
      apiKey: getEnvValue(process.env.GROQ_API_KEY),
      model: getEnvValue(process.env.GROQ_MODEL) || DEFAULT_GROQ_MODEL,
      createReply: createGroqMentorReply,
    },
    openrouter: {
      name: "openrouter",
      apiKey: getEnvValue(process.env.OPENROUTER_API_KEY),
      model: getEnvValue(process.env.OPENROUTER_MODEL) || DEFAULT_OPENROUTER_MODEL,
      createReply: createOpenRouterMentorReply,
    },
    openai: {
      name: "openai",
      apiKey: getEnvValue(process.env.OPENAI_API_KEY),
      model: getEnvValue(process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      createReply: createOpenAIMentorReply,
    },
  }
}

export async function createMentorReply(request: MentorProviderRequest): Promise<MentorApiResponse> {
  const configs = createProviderConfigs()

  for (const providerName of createProviderOrder()) {
    const provider = configs[providerName]

    if (!provider.apiKey) continue

    try {
      const reply = await provider.createReply({
        apiKey: provider.apiKey,
        model: provider.model,
        request,
      })

      return {
        reply,
        mode: provider.name,
      }
    } catch {
      continue
    }
  }

  return {
    reply: createMockMentorReply(request.message, request.context),
    mode: "mock",
  }
}
