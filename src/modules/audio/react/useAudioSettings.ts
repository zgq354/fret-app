import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from '../audioSettings'

export function useAudioSettings() {
  const [settings, setSettings] = useState(loadAudioSettings)

  useEffect(() => {
    saveAudioSettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((current) =>
      normalizeAudioSettings({ ...current, ...patch }),
    )
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_AUDIO_SETTINGS })
  }, [])

  return { settings, updateSettings, resetSettings }
}
