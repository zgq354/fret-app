import {
  createNativePlaybackBackend,
} from './nativeInstruments'
import type {
  CreatePlaybackBackend,
  InstrumentId,
  PlaybackBackend,
  PlaybackRuntime,
} from './instrument'

export function createPlaybackRuntime(
  createBackend: CreatePlaybackBackend = createNativePlaybackBackend,
): PlaybackRuntime {
  let backend: PlaybackBackend | null = null
  let disposed = false
  let operationEpoch = 0
  const voiceVersions = new Map<string, number>()
  const voiceRoutes = new Map<string, InstrumentId>()

  const getBackend = () => {
    if (disposed) {
      throw new Error('Playback runtime has been disposed')
    }

    backend ??= createBackend()
    return backend
  }

  return {
    async prepare() {
      await getBackend().unlock()
    },
    async trigger(instrumentId: InstrumentId, midi: number) {
      const activeBackend = getBackend()
      await activeBackend.unlock()
      activeBackend.instruments[instrumentId].trigger(midi)
    },
    async noteOn(
      voiceId: string,
      instrumentId: InstrumentId,
      midi: number,
      velocity = 1,
    ) {
      const activeBackend = getBackend()
      const requestEpoch = operationEpoch
      const voiceVersion = (voiceVersions.get(voiceId) ?? 0) + 1
      voiceVersions.set(voiceId, voiceVersion)
      await activeBackend.unlock()

      if (
        disposed ||
        requestEpoch !== operationEpoch ||
        voiceVersions.get(voiceId) !== voiceVersion
      ) {
        return
      }

      const previousInstrumentId = voiceRoutes.get(voiceId)
      if (previousInstrumentId) {
        activeBackend.instruments[previousInstrumentId].noteOff(voiceId)
      }
      voiceRoutes.set(voiceId, instrumentId)
      activeBackend.instruments[instrumentId].noteOn(
        voiceId,
        midi,
        velocity,
      )
    },
    noteOff(voiceId: string) {
      voiceVersions.set(voiceId, (voiceVersions.get(voiceId) ?? 0) + 1)
      const instrumentId = voiceRoutes.get(voiceId)
      if (!backend || !instrumentId) {
        return
      }

      voiceRoutes.delete(voiceId)
      backend.instruments[instrumentId].noteOff(voiceId)
    },
    stopAll() {
      operationEpoch += 1
      voiceRoutes.clear()
      voiceVersions.clear()
      if (!backend) {
        return
      }

      for (const instrument of Object.values(backend.instruments)) {
        instrument.stopAll()
      }
    },
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      operationEpoch += 1
      voiceRoutes.clear()
      voiceVersions.clear()
      backend?.dispose()
      backend = null
    },
  }
}
