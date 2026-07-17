export type MentorProviderErrorOptions = {
  provider: string
  status?: number
  retryable?: boolean
  retryAfterMs?: number
  providerErrorCode?: string
  providerErrorType?: string
  cause?: unknown
}

export type MentorProviderErrorDetails = Pick<
  MentorProviderErrorOptions,
  "providerErrorCode" | "providerErrorType"
>

const RETRYABLE_STATUS_CODES = new Set([402, 408, 409, 425, 429])

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000)
  }

  const retryDate = Date.parse(value)
  if (Number.isNaN(retryDate)) return undefined

  return Math.max(0, retryDate - Date.now())
}

export function isRetryableProviderStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status) || status >= 500
}

export class MentorProviderError extends Error {
  readonly provider: string
  readonly status?: number
  readonly retryable: boolean
  readonly retryAfterMs?: number
  readonly providerErrorCode?: string
  readonly providerErrorType?: string

  constructor(message: string, options: MentorProviderErrorOptions) {
    super(message, { cause: options.cause })
    this.name = "MentorProviderError"
    this.provider = options.provider
    this.status = options.status
    this.retryable = options.retryable ?? true
    this.retryAfterMs = options.retryAfterMs
    this.providerErrorCode = options.providerErrorCode
    this.providerErrorType = options.providerErrorType
  }
}

export function createProviderHttpError(
  provider: string,
  response: Response,
  details: MentorProviderErrorDetails = {},
): MentorProviderError {
  return new MentorProviderError(
    `${provider} retornou HTTP ${response.status}.`,
    {
      provider,
      status: response.status,
      retryable: isRetryableProviderStatus(response.status),
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
      ...details,
    },
  )
}

export function normalizeProviderError(
  provider: string,
  error: unknown,
): MentorProviderError {
  if (error instanceof MentorProviderError) return error

  return new MentorProviderError(
    error instanceof Error
      ? error.message
      : `Falha inesperada no provedor ${provider}.`,
    {
      provider,
      retryable: true,
      cause: error,
    },
  )
}
