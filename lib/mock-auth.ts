export type AuthRole = "user" | "admin"

export type AuthSession = {
  role: AuthRole
  userId: string
}

const STORAGE_KEY = "veriforensics-mock-auth"

export const MOCK_USER = { id: "1111", password: "2222" }
export const MOCK_ADMIN = { id: "3333", password: "4444" }

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

export function setSession(session: AuthSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event("auth-change"))
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event("auth-change"))
}
