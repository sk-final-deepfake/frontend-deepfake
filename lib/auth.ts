export type AuthRole = "user" | "admin"

export type AuthSession = {
  role: AuthRole
  userId: string
  loginId: string
  name: string
  token: string
}

const STORAGE_KEY = "veriforensics-auth"

export function mapBackendRole(role: string): AuthRole {
  return role === "ROLE_ADMIN" ? "admin" : "user"
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function setSession(session: AuthSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event("auth-change"))
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event("auth-change"))
}
