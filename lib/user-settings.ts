export const SETTINGS_STORAGE_KEY = "veriforensics-user-settings"
export const SETTINGS_CHANGE_EVENT = "settings-change"

export type ThemeMode = "light" | "dark" | "system"
export type DateFormat = "ko-full" | "ko-date" | "iso"
export type ListSort = "newest" | "status"
export type ListPageSize = 10 | 20 | 50

export type UserSettings = {
  theme: ThemeMode
  dateFormat: DateFormat
  analysisCompleteNotification: boolean
  listSort: ListSort
  listPageSize: ListPageSize
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "system",
  dateFormat: "ko-full",
  analysisCompleteNotification: true,
  listSort: "newest",
  listPageSize: 10,
}

export function getUserSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS

  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return DEFAULT_USER_SETTINGS

  try {
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_USER_SETTINGS
  }
}

export function setUserSettings(partial: Partial<UserSettings>) {
  const next = { ...getUserSettings(), ...partial }
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT))

  if (partial.theme !== undefined) {
    applyTheme(partial.theme)
  }
}

export function resolveIsDark(theme: ThemeMode): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyTheme(theme: ThemeMode) {
  const isDark = resolveIsDark(theme)
  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = isDark ? "dark" : "light"
}
