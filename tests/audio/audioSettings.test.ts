import { describe, expect, it } from 'vitest'
import {
  AUDIO_SETTINGS_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
} from '../../src/audio/audioSettings'

describe('audio settings', () => {
  it('uses a more sensitive mobile-friendly default', () => {
    expect(DEFAULT_AUDIO_SETTINGS.sensitivity).toBe(65)
  })

  it('normalizes persisted values and keeps frequency bounds ordered', () => {
    const settings = normalizeAudioSettings({
      sensitivity: 108,
      minConfidence: 0.1,
      historySize: 3.7,
      minFrequency: 190,
      maxFrequency: 180,
      fftSize: 3_000,
      noiseSuppression: true,
      polyphonicAnalysisIntervalMs: 2_490,
      polyphonicOnsetThreshold: 0.11,
      polyphonicFrameThreshold: 0.91,
      polyphonicMinActivation: 0.63,
      polyphonicMaxNotes: 14,
    })

    expect(settings).toMatchObject({
      sensitivity: 100,
      minConfidence: 0.4,
      historySize: 4,
      minFrequency: 190,
      maxFrequency: 210,
      fftSize: 4_096,
      noiseSuppression: true,
      polyphonicAnalysisIntervalMs: 2_000,
      polyphonicOnsetThreshold: 0.2,
      polyphonicFrameThreshold: 0.6,
      polyphonicMinActivation: 0.65,
      polyphonicMaxNotes: 10,
    })
  })

  it('round-trips settings through storage and survives corrupt JSON', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const changed = normalizeAudioSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      sensitivity: 85,
      readingHoldMs: 900,
    })

    saveAudioSettings(changed, storage)
    expect(loadAudioSettings(storage)).toEqual(changed)

    values.set(AUDIO_SETTINGS_STORAGE_KEY, '{bad json')
    expect(loadAudioSettings(storage)).toEqual(DEFAULT_AUDIO_SETTINGS)
  })
})
