import { describe, expect, it, vi } from 'vitest'
import { createPlaybackRuntime } from './createPlaybackRuntime'
import type { InstrumentDriver, PlaybackBackend } from './instrument'

function createDriver(): InstrumentDriver {
  return {
    trigger: vi.fn(),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  }
}

describe('createPlaybackRuntime', () => {
  it('prepares audio without triggering a note', async () => {
    const guitar = createDriver()
    const piano = createDriver()
    const backend: PlaybackBackend = {
      instruments: { guitar, piano },
      unlock: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    }
    const runtime = createPlaybackRuntime(() => backend)

    await runtime.prepare()

    expect(backend.unlock).toHaveBeenCalledTimes(1)
    expect(guitar.trigger).not.toHaveBeenCalled()
    expect(piano.trigger).not.toHaveBeenCalled()
  })

  it('unlocks once per trigger and routes notes to the selected instrument', async () => {
    const guitar = createDriver()
    const piano = createDriver()
    const backend: PlaybackBackend = {
      instruments: { guitar, piano },
      unlock: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    }
    const createBackend = vi.fn(() => backend)
    const runtime = createPlaybackRuntime(createBackend)

    await runtime.trigger('guitar', 64)
    await runtime.trigger('piano', 69)

    expect(createBackend).toHaveBeenCalledTimes(1)
    expect(backend.unlock).toHaveBeenCalledTimes(2)
    expect(guitar.trigger).toHaveBeenCalledWith(64)
    expect(piano.trigger).toHaveBeenCalledWith(69)
  })

  it('stops every instrument and disposes the backend once', async () => {
    const guitar = createDriver()
    const piano = createDriver()
    const backend: PlaybackBackend = {
      instruments: { guitar, piano },
      unlock: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    }
    const runtime = createPlaybackRuntime(() => backend)

    await runtime.trigger('guitar', 40)
    runtime.stopAll()
    runtime.dispose()
    runtime.dispose()

    expect(guitar.stopAll).toHaveBeenCalledTimes(1)
    expect(piano.stopAll).toHaveBeenCalledTimes(1)
    expect(backend.dispose).toHaveBeenCalledTimes(1)
  })

  it('routes held voices and releases them from their original instrument', async () => {
    const guitar = createDriver()
    const piano = createDriver()
    const backend: PlaybackBackend = {
      instruments: { guitar, piano },
      unlock: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    }
    const runtime = createPlaybackRuntime(() => backend)

    await runtime.noteOn('fretboard:7', 'guitar', 64, 0.8)
    runtime.noteOff('fretboard:7')

    expect(guitar.noteOn).toHaveBeenCalledWith('fretboard:7', 64, 0.8)
    expect(guitar.noteOff).toHaveBeenCalledWith('fretboard:7')
    expect(piano.noteOn).not.toHaveBeenCalled()
  })

  it('does not start a voice released while audio is unlocking', async () => {
    let finishUnlock: (() => void) | undefined
    const guitar = createDriver()
    const piano = createDriver()
    const backend: PlaybackBackend = {
      instruments: { guitar, piano },
      unlock: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishUnlock = resolve
          }),
      ),
      dispose: vi.fn(),
    }
    const runtime = createPlaybackRuntime(() => backend)

    const pending = runtime.noteOn('piano:4', 'piano', 60)
    runtime.noteOff('piano:4')
    finishUnlock?.()
    await pending

    expect(piano.noteOn).not.toHaveBeenCalled()
  })
})
