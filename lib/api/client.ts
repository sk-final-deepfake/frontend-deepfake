import { getToken, handleUnauthorizedResponse } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/api/config"

export type ApiErrorDetail = { field: string; reason: string }

export class ApiError extends Error {
  status: number
  errorCode?: string
  details?: ApiErrorDetail[]

  constructor(message: string, status: number, errorCode?: string, details?: ApiErrorDetail[]) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  auth?: boolean
}

type FormRequestOptions = {
  method?: "POST" | "PATCH" | "PUT"
  body: FormData
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  if (auth) {
    const token = getToken()
    if (!token) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED")
    }
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다."
    let errorCode: string | undefined
    let details: ApiErrorDetail[] | undefined

    try {
      const errorBody = (await response.json()) as {
        message?: string
        errorCode?: string
        error?: string
        details?: ApiErrorDetail[]
      }
      message = errorBody.message ?? message
      errorCode = errorBody.errorCode ?? errorBody.error
      details = errorBody.details
    } catch {
      // ignore parse errors
    }

    if (response.status === 401 && auth) {
      handleUnauthorizedResponse()
    }

    throw new ApiError(message, response.status, errorCode, details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiRequestForm<T>(
  path: string,
  options: FormRequestOptions
): Promise<T> {
  const { method = "POST", body, auth = true } = options
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (auth) {
    const token = getToken()
    if (!token) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED")
    }
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
  })

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다."
    let errorCode: string | undefined
    let details: ApiErrorDetail[] | undefined

    try {
      const errorBody = (await response.json()) as {
        message?: string
        errorCode?: string
        error?: string
        details?: ApiErrorDetail[]
      }
      message = errorBody.message ?? message
      errorCode = errorBody.errorCode ?? errorBody.error
      details = errorBody.details
    } catch {
      // ignore parse errors
    }

    if (response.status === 401 && auth) {
      handleUnauthorizedResponse()
    }

    throw new ApiError(message, response.status, errorCode, details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = getToken()
  if (!token) {
    throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다."
    let errorCode: string | undefined
    let details: ApiErrorDetail[] | undefined

    try {
      const errorBody = (await response.json()) as {
        message?: string
        errorCode?: string
        error?: string
        details?: ApiErrorDetail[]
      }
      message = errorBody.message ?? message
      errorCode = errorBody.errorCode ?? errorBody.error
      details = errorBody.details
    } catch {
      // ignore parse errors
    }

    if (response.status === 401) {
      handleUnauthorizedResponse()
    }

    throw new ApiError(message, response.status, errorCode, details)
  }

  return response.blob()
}
