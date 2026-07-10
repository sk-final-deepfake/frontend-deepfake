import { API_BASE_URL } from "@/lib/api/config"
import { features } from "@/lib/features"

export type AuthRole =
  | "user"
  | "admin"
  | "REVIEWER"
  | "INVESTIGATOR"
  | "ORG_ADMIN"
  | "ROLE_REVIEWER"
  | "ROLE_INVESTIGATOR"
  | "ROLE_ORG_ADMIN"
  | "ROLE_USER"
  | "ROLE_ADMIN"

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
const MOCK_SESSION_STORAGE_KEY = "forenshield-mock-auth"

let memorySession: AuthSession | null = null
let redirectingToLogin = false
let authBootstrapped = false
let bootstrapPromise: Promise<void> | null = null

export function mapBackendRole(role: string): AuthRole {
  if (role === "ROLE_ADMIN") return "admin"
  if (
    role === "ROLE_REVIEWER" ||
    role === "ROLE_INVESTIGATOR" ||
    role === "ROLE_ORG_ADMIN" ||
    role === "REVIEWER" ||
    role === "INVESTIGATOR" ||
    role === "ORG_ADMIN"
  ) {
    return role
  }
  return "user"
}

function purgeLegacySessionStorage() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(LEGACY_STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_API_ORIGIN_KEY)
}

function readStoredMockSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (
      !parsed.token?.startsWith("mock-") ||
      !parsed.loginId ||
      !parsed.name ||
      !parsed.role ||
      !parsed.userId
    ) {
      sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
      return null
    }

    return {
      role: parsed.role,
      userId: parsed.userId,
      loginId: parsed.loginId,
      name: parsed.name,
      token: parsed.token,
    }
  } catch {
    sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
    return null
  }
}

function persistMockSession(session: AuthSession) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(session))
}

function clearStoredMockSession() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
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
  if (!memorySession) {
    memorySession = readStoredMockSession()
  }
  return memorySession
}

export function getToken(): string | null {
  if (typeof window !== "undefined" && !memorySession) {
    memorySession = readStoredMockSession()
  }
  return memorySession?.token ?? null
}

export function isReviewerRole(role?: AuthRole | string | null): boolean {
  return role === "REVIEWER" || role === "ROLE_REVIEWER"
}

export function isReviewerSession(session: AuthSession | null): boolean {
  return isReviewerRole(session?.role)
}

export function isMockAuthSession(session: AuthSession | null = memorySession): boolean {
  return Boolean(session?.token.startsWith("mock-"))
}

// 로그인 및 refresh 응답을 한 곳에서 세션으로 변환하는 함수
// login-form, tryRefreshSession 이 이걸 씀
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

// 이전에는 refresh 응답에서 accessToken만 반환했으나 이제는 accessToken과 refreshToken 모두 반환
// 전체 세션 복구 코드
export async function tryRefreshSession(): Promise<boolean> {
  if (typeof window === "undefined" || !features.authRefresh) return false

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

// 정책이 허용된 경우에만 새로고침 후 HttpOnly refresh 쿠키로 세션 복구 시도
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
      memorySession = readStoredMockSession()
    }
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
  if (isMockAuthSession(session)) {
    persistMockSession(session)
  } else {
    clearStoredMockSession()
  }
  notifyAuthChange()
}

export function clearSession() {
  memorySession = null
  redirectingToLogin = false
  purgeLegacySessionStorage()
  clearStoredMockSession()
  notifyAuthChange()
}

/** 401 응답 시 세션 정리 후 로그인 화면으로 이동 (중복 리다이렉트 방지) */
export function handleUnauthorizedResponse() {
  if (typeof window === "undefined" || redirectingToLogin) return

  redirectingToLogin = true
  clearSession()
  window.location.replace("/login")
}
