import { describe, expect, it } from 'vitest'
import { DEFAULT_AUDIO_SETTINGS } from './audioSettings'
import { createMicrophoneConstraints } from './microphoneInput'

describe('microphone input', () => {
  it('keeps processing flags explicit and prefers a mono input', () => {
    expect(createMicrophoneConstraints({ ...DEFAULT_AUDIO_SETTINGS })).toEqual({
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
      channelCount: { ideal: 1 },
    })
  })

  it('adds requested sample rate and channel count at the browser boundary', () => {
    expect(
      createMicrophoneConstraints({
        ...DEFAULT_AUDIO_SETTINGS,
        preferredSampleRate: 48_000,
        preferredChannelCount: 2,
      }),
    ).toEqual({
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
      sampleRate: { ideal: 48_000 },
      channelCount: { ideal: 2 },
    })
  })
})
