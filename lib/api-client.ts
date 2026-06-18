import { API_BASE_URL } from "@/lib/api-config"
import { getToken, handleUnauthorizedResponse } from "@/lib/auth"

export class ApiError extends Error {
  status: number
  errorCode?: string
  details?: { field: string; reason: string }[]

  constructor(
    status: number,
    message: string,
    errorCode?: string,
    details?: { field: string; reason: string }[]
  ) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}

type ApiErrorBody = {
  success?: boolean
  message?: string
  error?: string
  errorCode?: string
  details?: { field: string; reason: string }[]
}

export function buildAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra)
  const token = getToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return headers
}

async function parseApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = null
  }

  const message =
    body?.message ??
    body?.details?.[0]?.reason ??
    "요청 처리 중 오류가 발생했습니다."

  return new ApiError(
    response.status,
    message,
    body?.errorCode ?? body?.error,
    body?.details
  )
}

function handleResponseAuthFailure(response: Response) {
  if (response.status === 401) {
    handleUnauthorizedResponse()
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = buildAuthHeaders(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  }

  handleResponseAuthFailure(response)
  throw await parseApiError(response)
}

export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, "body">
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    ...init,
    headers: buildAuthHeaders(init?.headers),
    body: formData,
  })

  if (response.ok) {
    return (await response.json()) as T
  }

  handleResponseAuthFailure(response)
  throw await parseApiError(response)
}
