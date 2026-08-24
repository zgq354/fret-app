import {
  DefaultMiddleCStyle,
  MiddleCStyle,
  type MiddleCStyle as MiddleCStyleValue,
} from '../music/musicTheory'

export interface DisplaySettings {
  middleCStyle: MiddleCStyleValue
}

export const DisplaySettingsStorageKey =
  'guitar-note-map.display-settings.v1'

export const DefaultDisplaySettings: Readonly<DisplaySettings> = {
  middleCStyle: DefaultMiddleCStyle,
}

interface SettingsStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function normalizeDisplaySettings(value: unknown): DisplaySettings {
  const source = isRecord(value) ? value : {}

  return {
    middleCStyle:
      source.middleCStyle === MiddleCStyle.Yamaha ||
      source.middleCStyle === MiddleCStyle.FLStudio
        ? source.middleCStyle
        : DefaultDisplaySettings.middleCStyle,
  }
}

export function loadDisplaySettings(
  storage: SettingsStorage | null = browserStorage(),
): DisplaySettings {
  if (!storage) {
    return { ...DefaultDisplaySettings }
  }

  try {
    const stored = storage.getItem(DisplaySettingsStorageKey)
    return normalizeDisplaySettings(stored ? JSON.parse(stored) : null)
  } catch {
    return { ...DefaultDisplaySettings }
  }
}

export function saveDisplaySettings(
  settings: DisplaySettings,
  storage: SettingsStorage | null = browserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(
      DisplaySettingsStorageKey,
      JSON.stringify(normalizeDisplaySettings(settings)),
    )
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function areDefaultDisplaySettings(
  settings: DisplaySettings,
): boolean {
  return (
    JSON.stringify(normalizeDisplaySettings(settings)) ===
    JSON.stringify(DefaultDisplaySettings)
  )
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
