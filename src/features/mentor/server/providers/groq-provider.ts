import { fetchMentorProvider } from "@/features/mentor/server/provider-http-client"
import {
  createProviderMessages,
  MAX_MENTOR_OUTPUT_TOKENS,
  PROVIDER_HEALTH_CHECK_OUTPUT_TOKENS,
  PROVIDER_HEALTH_CHECK_PROMPT,
  type MentorProviderRequest,
} from "@/features/mentor/server/mentor-prompts"

export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions"

export async function checkGroqProviderAvailability({
  apiKey,
  model,
}: {
  apiKey: string
  model: string
}): Promise<void> {
  await fetchMentorProvider("groq", GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: PROVIDER_HEALTH_CHECK_PROMPT }],
      max_tokens: PROVIDER_HEALTH_CHECK_OUTPUT_TOKENS,
      temperature: 0,
    }),
  })
}

function extractChatCompletionText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices)) return null

  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue

    const message = (choice as { message?: unknown }).message
    if (!message || typeof message !== "object") continue

    const content = (message as { content?: unknown }).content
    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim()
    }
  }

  return null
}

export async function createGroqMentorReply({
  apiKey,
  model,
  request,
}: {
  apiKey: string
  model: string
  request: MentorProviderRequest
}): Promise<string> {
  const response = await fetchMentorProvider(
    "groq",
    GROQ_CHAT_COMPLETIONS_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: createProviderMessages(request),
        max_tokens: MAX_MENTOR_OUTPUT_TOKENS,
        temperature: 0.35,
      }),
    },
  )

  const payload = (await response.json()) as unknown
  const reply = extractChatCompletionText(payload)

  if (!reply) {
    throw new Error("A resposta da Groq veio vazia.")
  }

  return reply
}
