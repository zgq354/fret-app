import { describe, expect, it } from 'vitest'
import {
  DefaultAppPreferences,
  ListenAnalysisModeStorageKey,
  MidiInstrumentStorageKey,
  PracticeModeStorageKey,
  loadAppPreferences,
  saveAppPreferences,
} from '../../src/settings/appPreferences'

describe('app preferences', () => {
  it('uses stable defaults without browser storage', () => {
    expect(loadAppPreferences(null)).toEqual(DefaultAppPreferences)
  })

  it('round-trips the existing preference keys', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const preferences = {
      practiceStringMode: true,
      midiInstrumentId: 'guitar' as const,
      listenAnalysisMode: 'polyphonic' as const,
    }

    saveAppPreferences(preferences, storage)

    expect(loadAppPreferences(storage)).toEqual(preferences)
    expect(values.get(PracticeModeStorageKey)).toBe('true')
    expect(values.get(MidiInstrumentStorageKey)).toBe('guitar')
    expect(values.get(ListenAnalysisModeStorageKey)).toBe('polyphonic')
  })
})
