import { useCallback, useEffect, useState } from 'react'
import {
  loadAppPreferences,
  saveAppPreferences,
  type AppPreferences,
} from '../appPreferences'

export function useAppPreferences() {
  const [preferences, setPreferences] = useState(loadAppPreferences)

  useEffect(() => {
    saveAppPreferences(preferences)
  }, [preferences])

  const setPreference = useCallback(
    <Key extends keyof AppPreferences>(
      key: Key,
      value: AppPreferences[Key],
    ) => {
      setPreferences((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  return { preferences, setPreference }
}
