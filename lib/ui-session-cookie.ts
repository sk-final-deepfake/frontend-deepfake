import { normalizeUserRole } from "@/lib/permissions"

/** FE 미들웨어가 읽는 UI 세션 마커 (API 도메인 HttpOnly refresh와 별개) */
export const UI_SESSION_COOKIE = "fs_ui_session"
export const UI_ROLE_COOKIE = "fs_ui_role"

function cookieSecureFlag() {
  if (typeof window === "undefined") return ""
  return window.location.protocol === "https:" ? "; Secure" : ""
}

export function writeUiSessionCookies(role: string) {
  if (typeof document === "undefined") return
  const normalized = normalizeUserRole(role)
  const secure = cookieSecureFlag()
  // 미들웨어에서 읽을 수 있도록 HttpOnly 아님. 권한 검증은 BE가 최종.
  document.cookie = `${UI_SESSION_COOKIE}=1; Path=/; SameSite=Lax${secure}`
  document.cookie = `${UI_ROLE_COOKIE}=${encodeURIComponent(normalized)}; Path=/; SameSite=Lax${secure}`
}

export function clearUiSessionCookies() {
  if (typeof document === "undefined") return
  const secure = cookieSecureFlag()
  document.cookie = `${UI_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  document.cookie = `${UI_ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}
