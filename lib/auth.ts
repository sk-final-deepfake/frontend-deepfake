import { API_BASE_URL } from "@/lib/api/config"

export type AuthRole = "user" | "admin"

export type AuthSession = {
  role: AuthRole
  userId: string
  loginId: string
  name: string
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
