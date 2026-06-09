import { getSession } from "@/lib/mock-auth"
import { API_BASE_URL } from "@/lib/api/config"

export class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(message: string, status: number, errorCode?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errorCode = errorCode
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
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
    const session = getSession()
    if (!session?.userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED")
    }
    headers["X-User-Id"] = session.userId
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다."
    let errorCode: string | undefined

    try {
      const errorBody = (await response.json()) as {
        message?: string
        errorCode?: string
      }
      message = errorBody.message ?? message
      errorCode = errorBody.errorCode
    } catch {
      // ignore parse errors
    }

    throw new ApiError(message, response.status, errorCode)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
