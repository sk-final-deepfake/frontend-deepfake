"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_USER_SETTINGS,
  getUserSettings,
  setUserSettings,
  SETTINGS_CHANGE_EVENT,
  type UserSettings,
} from "@/lib/user-settings"

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)

  useEffect(() => {
    function syncSettings() {
      setSettings(getUserSettings())
    }

    syncSettings()
    window.addEventListener(SETTINGS_CHANGE_EVENT, syncSettings)

    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, syncSettings)
    }
  }, [])

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setUserSettings(partial)
  }, [])

  return { settings, updateSettings }
}
