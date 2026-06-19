import { API_BASE_URL } from "@/lib/api/config"

export type AuthRole = "user" | "admin"

export type AuthSession = {
  role: AuthRole
  userId: string
  loginId: string
  name: string
  /** Access JWT만 저장한다. Refresh JWT는 HttpOnly 쿠키로만 주고받는다. */
  token: string
}

const STORAGE_KEY = "veriforensics-auth"
const API_ORIGIN_KEY = "veriforensics-api-origin"

let redirectingToLogin = false

export function mapBackendRole(role: string): AuthRole {
  return role === "ROLE_ADMIN" ? "admin" : "user"
}

function clearStoredSession() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(API_ORIGIN_KEY)
  window.dispatchEvent(new Event("auth-change"))
}

function isApiOriginMismatched() {
  const storedOrigin = sessionStorage.getItem(API_ORIGIN_KEY)
  return Boolean(storedOrigin && storedOrigin !== API_BASE_URL)
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  if (isApiOriginMismatched()) {
    clearStoredSession()
    return null
  }

  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    clearStoredSession()
    return null
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function updateAccessToken(token: string) {
  const session = getSession()
  if (!session || !token) return
  setSession({ ...session, token })
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

        const data = (await response.json()) as { accessToken?: string; token?: string }
        const accessToken = data.accessToken ?? data.token
        if (!accessToken) return false

        updateAccessToken(accessToken)
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

export function setSession(session: AuthSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  sessionStorage.setItem(API_ORIGIN_KEY, API_BASE_URL)
  redirectingToLogin = false
  window.dispatchEvent(new Event("auth-change"))
}

export function clearSession() {
  clearStoredSession()
  redirectingToLogin = false
}

/** 401 응답 시 세션 정리 후 로그인 화면으로 이동 (중복 리다이렉트 방지) */
export function handleUnauthorizedResponse() {
  if (typeof window === "undefined" || redirectingToLogin) return

  redirectingToLogin = true
  clearStoredSession()
  window.location.replace("/login")
}
