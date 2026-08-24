import { useCallback, useEffect, useState } from 'react'
import {
  DefaultDisplaySettings,
  loadDisplaySettings,
  normalizeDisplaySettings,
  saveDisplaySettings,
  type DisplaySettings,
} from '../displaySettings'

export function useDisplaySettings() {
  const [settings, setSettings] = useState(loadDisplaySettings)

  useEffect(() => {
    saveDisplaySettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<DisplaySettings>) => {
    setSettings((current) =>
      normalizeDisplaySettings({ ...current, ...patch }),
    )
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DefaultDisplaySettings })
  }, [])

  return { settings, updateSettings, resetSettings }
}
