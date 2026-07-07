import {
  createProviderMessages,
  MAX_MENTOR_OUTPUT_TOKENS,
  type MentorProviderRequest,
} from "@/features/mentor/server/mentor-prompts"

export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

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
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
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
  })

  if (!response.ok) {
    throw new Error("A Groq não retornou uma resposta válida.")
  }

  const payload = (await response.json()) as unknown
  const reply = extractChatCompletionText(payload)

  if (!reply) {
    throw new Error("A resposta da Groq veio vazia.")
  }

  return reply
}
