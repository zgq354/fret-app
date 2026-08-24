export type AnalysisFftSize = 2_048 | 4_096 | 8_192
export type PreferredSampleRate = 0 | 44_100 | 48_000
export type PreferredChannelCount = 0 | 1 | 2

export interface AudioSettings {
  sensitivity: number
  minConfidence: number
  pitchThreshold: number
  fallbackThreshold: number
  historySize: number
  readingHoldMs: number
  analysisIntervalMs: number
  polyphonicAnalysisIntervalMs: number
  polyphonicOnsetThreshold: number
  polyphonicFrameThreshold: number
  polyphonicMinActivation: number
  polyphonicMaxNotes: number
  minFrequency: number
  maxFrequency: number
  fftSize: AnalysisFftSize
  preferredSampleRate: PreferredSampleRate
  preferredChannelCount: PreferredChannelCount
  autoGainControl: boolean
  noiseSuppression: boolean
  echoCancellation: boolean
}

export const AUDIO_SETTINGS_STORAGE_KEY =
  'guitar-note-map.audio-settings.v1'

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = {
  sensitivity: 65,
  minConfidence: 0.62,
  pitchThreshold: 0.14,
  fallbackThreshold: 0.25,
  historySize: 5,
  readingHoldMs: 420,
  analysisIntervalMs: 72,
  polyphonicAnalysisIntervalMs: 850,
  polyphonicOnsetThreshold: 0.35,
  polyphonicFrameThreshold: 0.3,
  polyphonicMinActivation: 0.3,
  polyphonicMaxNotes: 6,
  minFrequency: 65,
  maxFrequency: 1_200,
  fftSize: 4_096,
  preferredSampleRate: 0,
  preferredChannelCount: 1,
  autoGainControl: false,
  noiseSuppression: false,
  echoCancellation: false,
}

interface SettingsStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function normalizeAudioSettings(value: unknown): AudioSettings {
  const source = isRecord(value) ? value : {}
  const minFrequency = clampNumber(
    source.minFrequency,
    40,
    200,
    DEFAULT_AUDIO_SETTINGS.minFrequency,
  )
  const maxFrequency = Math.max(
    minFrequency + 20,
    clampNumber(
      source.maxFrequency,
      200,
      2_000,
      DEFAULT_AUDIO_SETTINGS.maxFrequency,
    ),
  )

  return {
    sensitivity: roundToStep(
      clampNumber(
        source.sensitivity,
        0,
        100,
        DEFAULT_AUDIO_SETTINGS.sensitivity,
      ),
      5,
    ),
    minConfidence: roundToStep(
      clampNumber(
        source.minConfidence,
        0.4,
        0.95,
        DEFAULT_AUDIO_SETTINGS.minConfidence,
      ),
      0.01,
    ),
    pitchThreshold: roundToStep(
      clampNumber(
        source.pitchThreshold,
        0.05,
        0.3,
        DEFAULT_AUDIO_SETTINGS.pitchThreshold,
      ),
      0.01,
    ),
    fallbackThreshold: roundToStep(
      clampNumber(
        source.fallbackThreshold,
        0.1,
        0.5,
        DEFAULT_AUDIO_SETTINGS.fallbackThreshold,
      ),
      0.01,
    ),
    historySize: Math.round(
      clampNumber(
        source.historySize,
        1,
        9,
        DEFAULT_AUDIO_SETTINGS.historySize,
      ),
    ),
    readingHoldMs: roundToStep(
      clampNumber(
        source.readingHoldMs,
        0,
        1_500,
        DEFAULT_AUDIO_SETTINGS.readingHoldMs,
      ),
      60,
    ),
    analysisIntervalMs: roundToStep(
      clampNumber(
        source.analysisIntervalMs,
        24,
        192,
        DEFAULT_AUDIO_SETTINGS.analysisIntervalMs,
      ),
      12,
    ),
    polyphonicAnalysisIntervalMs: roundToStep(
      clampNumber(
        source.polyphonicAnalysisIntervalMs,
        500,
        2_000,
        DEFAULT_AUDIO_SETTINGS.polyphonicAnalysisIntervalMs,
      ),
      50,
    ),
    polyphonicOnsetThreshold: roundToStep(
      clampNumber(
        source.polyphonicOnsetThreshold,
        0.2,
        0.7,
        DEFAULT_AUDIO_SETTINGS.polyphonicOnsetThreshold,
      ),
      0.05,
    ),
    polyphonicFrameThreshold: roundToStep(
      clampNumber(
        source.polyphonicFrameThreshold,
        0.15,
        0.6,
        DEFAULT_AUDIO_SETTINGS.polyphonicFrameThreshold,
      ),
      0.05,
    ),
    polyphonicMinActivation: roundToStep(
      clampNumber(
        source.polyphonicMinActivation,
        0.2,
        0.7,
        DEFAULT_AUDIO_SETTINGS.polyphonicMinActivation,
      ),
      0.05,
    ),
    polyphonicMaxNotes: Math.round(
      clampNumber(
        source.polyphonicMaxNotes,
        2,
        10,
        DEFAULT_AUDIO_SETTINGS.polyphonicMaxNotes,
      ),
    ),
    minFrequency: Math.round(minFrequency),
    maxFrequency: Math.round(maxFrequency),
    fftSize: allowedNumber<AnalysisFftSize>(
      source.fftSize,
      [2_048, 4_096, 8_192],
      DEFAULT_AUDIO_SETTINGS.fftSize,
    ),
    preferredSampleRate: allowedNumber<PreferredSampleRate>(
      source.preferredSampleRate,
      [0, 44_100, 48_000],
      DEFAULT_AUDIO_SETTINGS.preferredSampleRate,
    ),
    preferredChannelCount: allowedNumber<PreferredChannelCount>(
      source.preferredChannelCount,
      [0, 1, 2],
      DEFAULT_AUDIO_SETTINGS.preferredChannelCount,
    ),
    autoGainControl: booleanValue(
      source.autoGainControl,
      DEFAULT_AUDIO_SETTINGS.autoGainControl,
    ),
    noiseSuppression: booleanValue(
      source.noiseSuppression,
      DEFAULT_AUDIO_SETTINGS.noiseSuppression,
    ),
    echoCancellation: booleanValue(
      source.echoCancellation,
      DEFAULT_AUDIO_SETTINGS.echoCancellation,
    ),
  }
}

export function loadAudioSettings(
  storage: SettingsStorage | null = browserStorage(),
): AudioSettings {
  if (!storage) {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }

  try {
    const stored = storage.getItem(AUDIO_SETTINGS_STORAGE_KEY)
    return normalizeAudioSettings(stored ? JSON.parse(stored) : null)
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

export function saveAudioSettings(
  settings: AudioSettings,
  storage: SettingsStorage | null = browserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeAudioSettings(settings)),
    )
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function areDefaultAudioSettings(settings: AudioSettings): boolean {
  return (
    JSON.stringify(normalizeAudioSettings(settings)) ===
    JSON.stringify(DEFAULT_AUDIO_SETTINGS)
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

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numberValue = typeof value === 'number' ? value : Number.NaN
  return Number.isFinite(numberValue)
    ? Math.min(max, Math.max(min, numberValue))
    : fallback
}

function roundToStep(value: number, step: number): number {
  const precision = step < 1 ? 100 : 1
  return Math.round(Math.round(value / step) * step * precision) / precision
}

function allowedNumber<T extends number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
