import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_AUDIO_SETTINGS,
  type AudioSettings,
} from './audioSettings'
import {
  createPitchReading,
  type PitchReading,
} from '../music/musicTheory'
import { detectPitch, sensitivityToSilenceThreshold } from './detectPitch'
import { configureAudioSession } from './audioSession'
import {
  createMicrophoneConstraints,
  stopMediaStream,
  type MicrophoneDetectionStatus,
} from './microphoneInput'

interface AudioResources {
  context: AudioContext
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
  stream: MediaStream
  animationFrame: number
}

export interface PitchDetectionState {
  status: MicrophoneDetectionStatus
  reading: PitchReading | null
  errorMessage: string | null
  trackSettings: MediaTrackSettings | null
  analysisSampleRate: number | null
  start: () => Promise<void>
  stop: () => void
  dismissError: () => void
}

export function usePitchDetection(
  options: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS },
): PitchDetectionState {
  const [status, setStatus] = useState<MicrophoneDetectionStatus>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [trackSettings, setTrackSettings] =
    useState<MediaTrackSettings | null>(null)
  const [analysisSampleRate, setAnalysisSampleRate] = useState<number | null>(
    null,
  )
  const resourcesRef = useRef<AudioResources | null>(null)
  const generationRef = useRef(0)
  const frequencyHistoryRef = useRef<number[]>([])
  const lastReadingAtRef = useRef(0)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const releaseAudio = useCallback(() => {
    configureAudioSession('auto')
    const resources = resourcesRef.current
    if (!resources) {
      return
    }

    cancelAnimationFrame(resources.animationFrame)
    resources.source.disconnect()
    resources.analyser.disconnect()
    stopMediaStream(resources.stream)
    void resources.context.close()
    resourcesRef.current = null
    frequencyHistoryRef.current = []
  }, [])

  const stop = useCallback(() => {
    generationRef.current += 1
    releaseAudio()
    setStatus('idle')
    setReading(null)
    setErrorMessage(null)
    setTrackSettings(null)
    setAnalysisSampleRate(null)
  }, [releaseAudio])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setStatus('unsupported')
      setErrorMessage(
        '麦克风需要 HTTPS 或 localhost；局域网 HTTP 地址只用于界面预览。',
      )
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setStatus('unsupported')
      setErrorMessage('当前浏览器不支持麦克风音高检测。')
      return
    }

    const generation = generationRef.current + 1
    generationRef.current = generation
    releaseAudio()
    setStatus('requesting')
    setReading(null)
    setErrorMessage(null)
    setTrackSettings(null)
    setAnalysisSampleRate(null)

    let pendingStream: MediaStream | null = null
    let pendingContext: AudioContext | null = null

    try {
      configureAudioSession('play-and-record')
      const requested = optionsRef.current
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: createMicrophoneConstraints(requested),
      })
      pendingStream = stream

      if (generationRef.current !== generation) {
        stopMediaStream(stream)
        return
      }

      const context = new AudioContext()
      pendingContext = context
      await context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = requested.fftSize
      analyser.smoothingTimeConstant = 0
      const source = context.createMediaStreamSource(stream)
      source.connect(analyser)

      const samples = new Float32Array(analyser.fftSize)
      let lastAnalysisAt = 0

      const resources: AudioResources = {
        context,
        analyser,
        source,
        stream,
        animationFrame: 0,
      }
      resourcesRef.current = resources
      pendingStream = null
      pendingContext = null
      setTrackSettings(stream.getAudioTracks()[0]?.getSettings() ?? null)
      setAnalysisSampleRate(context.sampleRate)
      setStatus('listening')

      const analyze = (timestamp: number) => {
        if (
          generationRef.current !== generation ||
          resourcesRef.current !== resources
        ) {
          return
        }

        const current = optionsRef.current

        if (timestamp - lastAnalysisAt >= current.analysisIntervalMs) {
          lastAnalysisAt = timestamp
          analyser.getFloatTimeDomainData(samples)
          const detected = detectPitch(samples, context.sampleRate, {
            minFrequency: current.minFrequency,
            maxFrequency: current.maxFrequency,
            threshold: current.pitchThreshold,
            fallbackThreshold: current.fallbackThreshold,
            silenceThreshold: sensitivityToSilenceThreshold(
              current.sensitivity,
            ),
          })

          if (detected && detected.confidence >= current.minConfidence) {
            const history = frequencyHistoryRef.current
            history.push(detected.frequency)
            while (history.length > current.historySize) {
              history.shift()
            }

            lastReadingAtRef.current = timestamp
            setReading(
              createPitchReading(median(history), detected.confidence),
            )
          } else if (
            timestamp - lastReadingAtRef.current >
            current.readingHoldMs
          ) {
            frequencyHistoryRef.current = []
            setReading(null)
          }
        }

        resources.animationFrame = requestAnimationFrame(analyze)
      }

      resources.animationFrame = requestAnimationFrame(analyze)
    } catch (error) {
      if (pendingStream) {
        stopMediaStream(pendingStream)
      }
      if (pendingContext) {
        void pendingContext.close()
      }
      releaseAudio()
      setTrackSettings(null)
      setAnalysisSampleRate(null)
      if (generationRef.current !== generation) {
        return
      }

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setStatus('denied')
        setErrorMessage('麦克风权限被拒绝，可以在浏览器站点设置中重新允许。')
      } else {
        setStatus('error')
        setErrorMessage('麦克风启动失败，请检查输入设备后重试。')
      }
    }
  }, [releaseAudio])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      releaseAudio()
    }
  }, [releaseAudio])

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) {
        stop()
      }
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () =>
      document.removeEventListener('visibilitychange', stopWhenHidden)
  }, [stop])

  return {
    status,
    reading,
    errorMessage,
    trackSettings,
    analysisSampleRate,
    start,
    stop,
    dismissError,
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}
