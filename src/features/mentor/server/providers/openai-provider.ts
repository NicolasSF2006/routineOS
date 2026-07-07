import {
  createContextMessage,
  MAX_MENTOR_OUTPUT_TOKENS,
  MENTOR_SYSTEM_PROMPT,
  type MentorProviderRequest,
} from "@/features/mentor/server/mentor-prompts"

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

type OpenAIInputMessage = {
  role: "user" | "assistant"
  content: string
}

function extractOpenAIText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const response = payload as {
    output_text?: unknown
    output?: unknown
  }

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim()
  }

  if (!Array.isArray(response.output)) return null

  const textParts: string[] = []

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue

    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue

    for (const part of content) {
      if (!part || typeof part !== "object") continue

      const maybeText = (part as { text?: unknown }).text
      if (typeof maybeText === "string" && maybeText.trim().length > 0) {
        textParts.push(maybeText.trim())
      }
    }
  }

  return textParts.length > 0 ? textParts.join("\n\n") : null
}

export async function createOpenAIMentorReply({
  apiKey,
  model,
  request,
}: {
  apiKey: string
  model: string
  request: MentorProviderRequest
}): Promise<string> {
  const input: OpenAIInputMessage[] = [
    {
      role: "user",
      content: createContextMessage(request.context),
    },
    ...request.history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: request.message,
    },
  ]

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: MENTOR_SYSTEM_PROMPT,
      input,
      max_output_tokens: MAX_MENTOR_OUTPUT_TOKENS,
    }),
  })

  if (!response.ok) {
    throw new Error("A OpenAI não retornou uma resposta válida.")
  }

  const payload = (await response.json()) as unknown
  const reply = extractOpenAIText(payload)

  if (!reply) {
    throw new Error("A resposta da OpenAI veio vazia.")
  }

  return reply
}
