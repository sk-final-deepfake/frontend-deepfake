import { API_BASE_URL } from "@/lib/api/config"

export type AuthRole = "user" | "admin"

export type AuthSession = {
  role: AuthRole
  userId: string
  loginId: string
  name: string
  /** Access JWT — 메모리만. Refresh JWT는 HttpOnly 쿠키. */
  token: string
}

/** 예전 sessionStorage 키 — 마이그레이션 시 제거용 */
const LEGACY_STORAGE_KEY = "veriforensics-auth"
const LEGACY_API_ORIGIN_KEY = "veriforensics-api-origin"

let memorySession: AuthSession | null = null
let redirectingToLogin = false
let authBootstrapped = false
let bootstrapPromise: Promise<void> | null = null

export function mapBackendRole(role: string): AuthRole {
  return role === "ROLE_ADMIN" ? "admin" : "user"
}

function purgeLegacySessionStorage() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(LEGACY_STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_API_ORIGIN_KEY)
}

function notifyAuthChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("auth-change"))
}

if (typeof window !== "undefined") {
  purgeLegacySessionStorage()
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  return memorySession
}

export function getToken(): string | null {
  return memorySession?.token ?? null
}

export function applyLoginResponse(response: {
  userId: number
  loginId: string
  name: string
  role: string
  token: string
  accessToken?: string
}) {
  setSession({
    role: mapBackendRole(response.role),
    userId: String(response.userId),
    loginId: response.loginId,
    name: response.name,
    token: response.accessToken ?? response.token,
  })
}

export function updateAccessToken(token: string) {
  if (!memorySession || !token) return
  memorySession = { ...memorySession, token }
  notifyAuthChange()
}

export function isAuthApiPath(path: string): boolean {
  return (
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/refresh") ||
    path.startsWith("/api/auth/logout")
  )
}

let refreshPromise: Promise<boolean> | null = null

export async function tryRefreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        })
        if (!response.ok) return false

        const data = (await response.json()) as {
          accessToken?: string
          token?: string
          userId?: number
          loginId?: string
          name?: string
          role?: string
        }

        const accessToken = data.accessToken ?? data.token
        if (!accessToken || data.userId == null || !data.loginId || !data.name || !data.role) {
          return false
        }

        applyLoginResponse({
          userId: data.userId,
          loginId: data.loginId,
          name: data.name,
          role: data.role,
          token: accessToken,
          accessToken,
        })
        return true
      } catch {
        return false
      }
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

/** 새로고침 후 HttpOnly refresh 쿠키로 세션 복구 시도 */
export async function bootstrapAuthSession(): Promise<void> {
  if (typeof window === "undefined") return
  if (authBootstrapped) return
  if (bootstrapPromise) {
    await bootstrapPromise
    return
  }

  bootstrapPromise = (async () => {
    purgeLegacySessionStorage()
    if (!memorySession) {
      await tryRefreshSession()
    }
  })().finally(() => {
    authBootstrapped = true
    bootstrapPromise = null
  })

  await bootstrapPromise
}

export function isAuthBootstrapped(): boolean {
  return authBootstrapped
}

export function setSession(session: AuthSession) {
  memorySession = session
  redirectingToLogin = false
  notifyAuthChange()
}

export function clearSession() {
  memorySession = null
  redirectingToLogin = false
  purgeLegacySessionStorage()
  notifyAuthChange()
}

/** 401 응답 시 세션 정리 후 로그인 화면으로 이동 (중복 리다이렉트 방지) */
export function handleUnauthorizedResponse() {
  if (typeof window === "undefined" || redirectingToLogin) return

  redirectingToLogin = true
  clearSession()
  window.location.replace("/login")
}
