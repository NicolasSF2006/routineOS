import {
  createProviderHttpError,
  MentorProviderError,
} from "@/features/mentor/server/provider-error"

export const DEFAULT_PROVIDER_TIMEOUT_MS = 20_000

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
      throw createProviderHttpError(provider, response)
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
