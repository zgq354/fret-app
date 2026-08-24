import { describe, expect, it } from 'vitest'
import {
  configureAudioSession,
  type AudioSessionType,
} from '../../src/modules/audio/audioSession'

describe('configureAudioSession', () => {
  it('sets the requested type when the API is available', () => {
    const audioSession: { type: AudioSessionType } = { type: 'auto' }

    expect(
      configureAudioSession('playback', { audioSession }),
    ).toBe(true)
    expect(audioSession.type).toBe('playback')
  })

  it('keeps unsupported browsers on their existing behavior', () => {
    expect(configureAudioSession('playback', {})).toBe(false)
  })

  it('does not surface a browser assignment failure', () => {
    const audioSession = {
      get type() {
        return 'auto' as const
      },
      set type(_value: AudioSessionType) {
        throw new Error('unsupported')
      },
    }

    expect(
      configureAudioSession('playback', { audioSession }),
    ).toBe(false)
  })
})
