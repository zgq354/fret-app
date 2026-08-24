import { useCallback, useEffect, useRef, useState } from 'react'
import { createPlaybackRuntime } from '../createPlaybackRuntime'
import type { InstrumentId, PlaybackRuntime } from '../instrument'

interface PlaybackState {
  errorMessage: string | null
  prepare: () => Promise<void>
  play: (instrumentId: InstrumentId, midi: number) => Promise<void>
  startVoice: (
    voiceId: string,
    instrumentId: InstrumentId,
    midi: number,
    velocity?: number,
  ) => Promise<void>
  stopVoice: (voiceId: string) => void
  stopAll: () => void
  dismissError: () => void
}

export function usePlayback(): PlaybackState {
  const runtimeRef = useRef<PlaybackRuntime | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getRuntime = useCallback(() => {
    runtimeRef.current ??= createPlaybackRuntime()
    return runtimeRef.current
  }, [])

  const prepare = useCallback(async () => {
    setErrorMessage(null)
    try {
      await getRuntime().prepare()
    } catch {
      setErrorMessage('乐器音频启动失败，请检查浏览器音量后重试。')
    }
  }, [getRuntime])

  const play = useCallback(
    async (instrumentId: InstrumentId, midi: number) => {
      setErrorMessage(null)
      try {
        await getRuntime().trigger(instrumentId, midi)
      } catch {
        setErrorMessage('乐器音频启动失败，请检查浏览器音量后重试。')
      }
    },
    [getRuntime],
  )

  const stopAll = useCallback(() => {
    runtimeRef.current?.stopAll()
  }, [])

  const startVoice = useCallback(
    async (
      voiceId: string,
      instrumentId: InstrumentId,
      midi: number,
      velocity = 1,
    ) => {
      setErrorMessage(null)
      try {
        await getRuntime().noteOn(
          voiceId,
          instrumentId,
          midi,
          velocity,
        )
      } catch {
        setErrorMessage('乐器音频启动失败，请检查浏览器音量后重试。')
      }
    },
    [getRuntime],
  )

  const stopVoice = useCallback((voiceId: string) => {
    runtimeRef.current?.noteOff(voiceId)
  }, [])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  useEffect(() => {
    return () => {
      runtimeRef.current?.dispose()
      runtimeRef.current = null
    }
  }, [])

  return {
    errorMessage,
    prepare,
    play,
    startVoice,
    stopVoice,
    stopAll,
    dismissError,
  }
}
