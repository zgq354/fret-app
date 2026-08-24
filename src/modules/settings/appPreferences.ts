import type { InstrumentId } from '../playback/instrument'

export type ListenAnalysisMode = 'single' | 'polyphonic'

export interface AppPreferences {
  practiceStringMode: boolean
  midiInstrumentId: InstrumentId
  listenAnalysisMode: ListenAnalysisMode
}

export const DefaultAppPreferences: Readonly<AppPreferences> = {
  practiceStringMode: false,
  midiInstrumentId: 'piano',
  listenAnalysisMode: 'single',
}

export const PracticeModeStorageKey = 'guitar-note-map.practice-mode.v1'
export const MidiInstrumentStorageKey =
  'guitar-note-map.midi-instrument.v1'
export const ListenAnalysisModeStorageKey =
  'guitar-note-map.listen-analysis-mode.v1'

interface PreferencesStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function loadAppPreferences(
  storage: PreferencesStorage | null = browserStorage(),
): AppPreferences {
  if (!storage) {
    return { ...DefaultAppPreferences }
  }

  try {
    return {
      practiceStringMode:
        storage.getItem(PracticeModeStorageKey) === 'true',
      midiInstrumentId:
        storage.getItem(MidiInstrumentStorageKey) === 'guitar'
          ? 'guitar'
          : 'piano',
      listenAnalysisMode:
        storage.getItem(ListenAnalysisModeStorageKey) === 'polyphonic'
          ? 'polyphonic'
          : 'single',
    }
  } catch {
    return { ...DefaultAppPreferences }
  }
}

export function saveAppPreferences(
  preferences: AppPreferences,
  storage: PreferencesStorage | null = browserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(
      PracticeModeStorageKey,
      String(preferences.practiceStringMode),
    )
    storage.setItem(MidiInstrumentStorageKey, preferences.midiInstrumentId)
    storage.setItem(
      ListenAnalysisModeStorageKey,
      preferences.listenAnalysisMode,
    )
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
