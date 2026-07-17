import {
  createProviderHttpError,
  MentorProviderError,
  type MentorProviderErrorDetails,
} from "@/features/mentor/server/provider-error"

export const DEFAULT_PROVIDER_TIMEOUT_MS = 20_000
const MAX_ERROR_BODY_LENGTH = 4_000

function readStringProperty(
  value: Record<string, unknown>,
  property: string,
): string | undefined {
  const candidate = value[property]
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined
}

async function readProviderErrorDetails(
  response: Response,
): Promise<MentorProviderErrorDetails> {
  try {
    const rawBody = (await response.text()).slice(0, MAX_ERROR_BODY_LENGTH)
    if (!rawBody) return {}

    const parsed = JSON.parse(rawBody) as unknown
    if (!parsed || typeof parsed !== "object") return {}

    const root = parsed as Record<string, unknown>
    const nestedError = root.error
    const source =
      nestedError && typeof nestedError === "object"
        ? (nestedError as Record<string, unknown>)
        : root

    return {
      providerErrorCode: readStringProperty(source, "code"),
      providerErrorType: readStringProperty(source, "type"),
    }
  } catch {
    return {}
  }
}

export async function fetchMentorProvider(
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })

    if (!response.ok) {
      const details = await readProviderErrorDetails(response)
      throw createProviderHttpError(provider, response, details)
    }

    return response
  } catch (error) {
    if (error instanceof MentorProviderError) throw error

    if (controller.signal.aborted) {
      throw new MentorProviderError(
        `${provider} excedeu o tempo limite de resposta.`,
        { provider, retryable: true, cause: error },
      )
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
