import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_AUDIO_SETTINGS,
  type AudioSettings,
} from './audioSettings'
import { configureAudioSession } from './audioSession'
import { AudioSampleRing } from './audioSampleRing'
import { sensitivityToSilenceThreshold } from './detectPitch'
import {
  createMicrophoneConstraints,
  stopMediaStream,
  type MicrophoneDetectionStatus,
} from './microphoneInput'
import {
  createPolyphonicInferenceClient,
  PolyphonicInferenceBusy,
  PolyphonicWorkerFailure,
  type PolyphonicInferenceClient,
} from './polyphonicInferenceClient'
import {
  BASIC_PITCH_INPUT_SAMPLES,
  BASIC_PITCH_SAMPLE_RATE,
  type PolyphonicAnalysisState,
  type PolyphonicModelState,
} from './polyphonicInferenceMessages'
import { resampleAudio } from './resampleAudio'
import type { ChordReading } from '../music/chordAnalysis'

const WORKLET_PATH = '/audio/pcm-capture-worklet.js'
const INPUT_LEVEL_UPDATE_INTERVAL_MS = 120

interface PolyphonicAudioResources {
  context: AudioContext
  source: MediaStreamAudioSourceNode
  capture: AudioWorkletNode
  mutedOutput: GainNode
  stream: MediaStream
}

export interface PolyphonicPitchDetectionState {
  status: MicrophoneDetectionStatus
  reading: ChordReading | null
  errorMessage: string | null
  trackSettings: MediaTrackSettings | null
  analysisSampleRate: number | null
  modelState: PolyphonicModelState
  analysisState: PolyphonicAnalysisState
  inputLevel: number
  workerBackend: string | null
  modelLoadMs: number | null
  inferenceMs: number | null
  start: () => Promise<void>
  stop: () => void
  dispose: () => void
  dismissError: () => void
}

export function usePolyphonicPitchDetection(
  options: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS },
): PolyphonicPitchDetectionState {
  const [status, setStatus] = useState<MicrophoneDetectionStatus>('idle')
  const [reading, setReading] = useState<ChordReading | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [trackSettings, setTrackSettings] =
    useState<MediaTrackSettings | null>(null)
  const [analysisSampleRate, setAnalysisSampleRate] = useState<number | null>(
    null,
  )
  const [modelState, setModelState] =
    useState<PolyphonicModelState>('uninitialized')
  const [analysisState, setAnalysisState] =
    useState<PolyphonicAnalysisState>('idle')
  const [inputLevel, setInputLevel] = useState(0)
  const [workerBackend, setWorkerBackend] = useState<string | null>(null)
  const [modelLoadMs, setModelLoadMs] = useState<number | null>(null)
  const [inferenceMs, setInferenceMs] = useState<number | null>(null)
  const resourcesRef = useRef<PolyphonicAudioResources | null>(null)
  const inferenceClientRef = useRef<PolyphonicInferenceClient | null>(null)
  const generationRef = useRef(0)
  const optionsRef = useRef(options)
  const inferenceRunningRef = useRef(false)
  const inferenceIdRef = useRef(0)
  const lastInferenceAtRef = useRef(0)
  const lastInputLevelAtRef = useRef(0)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const releaseAudio = useCallback(() => {
    configureAudioSession('auto')
    const resources = resourcesRef.current
    if (!resources) {
      return
    }

    resources.capture.port.onmessage = null
    resources.capture.onprocessorerror = null
    resources.source.disconnect()
    resources.capture.disconnect()
    resources.mutedOutput.disconnect()
    stopMediaStream(resources.stream)
    void resources.context.close()
    resourcesRef.current = null
    inferenceIdRef.current += 1
    inferenceRunningRef.current = false
  }, [])

  const terminateInference = useCallback(() => {
    inferenceClientRef.current?.terminate()
    inferenceClientRef.current = null
    setModelState('uninitialized')
    setWorkerBackend(null)
    setModelLoadMs(null)
    setInferenceMs(null)
  }, [])

  const stop = useCallback(() => {
    const hasRunningInference = inferenceRunningRef.current
    generationRef.current += 1
    releaseAudio()
    if (hasRunningInference) {
      terminateInference()
    }
    setStatus('idle')
    setReading(null)
    setErrorMessage(null)
    setTrackSettings(null)
    setAnalysisSampleRate(null)
    setAnalysisState('idle')
    setInputLevel(0)
    setInferenceMs(null)
  }, [releaseAudio, terminateInference])

  const dispose = useCallback(() => {
    generationRef.current += 1
    releaseAudio()
    terminateInference()
    setStatus('idle')
    setReading(null)
    setErrorMessage(null)
    setTrackSettings(null)
    setAnalysisSampleRate(null)
    setAnalysisState('idle')
    setInputLevel(0)
  }, [releaseAudio, terminateInference])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setStatus('unsupported')
      setModelState('unsupported')
      setErrorMessage(
        '麦克风需要 HTTPS 或 localhost；局域网 HTTP 地址只用于界面预览。',
      )
      return
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.AudioContext ||
      !window.AudioWorkletNode ||
      !window.OfflineAudioContext ||
      typeof Worker === 'undefined'
    ) {
      setStatus('unsupported')
      setModelState('unsupported')
      setErrorMessage('当前浏览器不支持 Worker 多音麦克风识别。')
      return
    }

    const generation = generationRef.current + 1
    const hasRunningInference = inferenceRunningRef.current
    generationRef.current = generation
    releaseAudio()
    if (hasRunningInference) {
      terminateInference()
    }
    setStatus('requesting')
    setReading(null)
    setErrorMessage(null)
    setTrackSettings(null)
    setAnalysisSampleRate(null)
    setAnalysisState('idle')
    setInputLevel(0)
    setInferenceMs(null)
    setModelState('loading')

    let pendingStream: MediaStream | null = null
    let pendingContext: AudioContext | null = null

    try {
      const client =
        inferenceClientRef.current ?? createPolyphonicInferenceClient()
      inferenceClientRef.current = client
      const runtimePromise = client.prepare()
      void runtimePromise.catch(() => undefined)

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
      await context.audioWorklet.addModule(WORKLET_PATH)
      if (generationRef.current !== generation) {
        stopMediaStream(stream)
        void context.close()
        return
      }

      const source = context.createMediaStreamSource(stream)
      const capture = new AudioWorkletNode(
        context,
        'pcm-capture-processor',
      )
      const mutedOutput = context.createGain()
      mutedOutput.gain.value = 0
      source.connect(capture)
      capture.connect(mutedOutput)
      mutedOutput.connect(context.destination)

      const requiredInputSamples = Math.ceil(
        (BASIC_PITCH_INPUT_SAMPLES * context.sampleRate) /
          BASIC_PITCH_SAMPLE_RATE,
      )
      const ring = new AudioSampleRing(requiredInputSamples + 4_096)
      const resources: PolyphonicAudioResources = {
        context,
        source,
        capture,
        mutedOutput,
        stream,
      }
      resourcesRef.current = resources
      pendingStream = null
      pendingContext = null
      setTrackSettings(stream.getAudioTracks()[0]?.getSettings() ?? null)
      setAnalysisSampleRate(context.sampleRate)
      setStatus('listening')
      setAnalysisState('collecting')

      capture.onprocessorerror = () => {
        if (
          generationRef.current === generation &&
          resourcesRef.current === resources
        ) {
          generationRef.current += 1
          releaseAudio()
          terminateInference()
          setStatus('error')
          setReading(null)
          setErrorMessage('多音音频采集已中断，可以重新启用麦克风。')
          setTrackSettings(null)
          setAnalysisSampleRate(null)
          setAnalysisState('idle')
          setInputLevel(0)
        }
      }

      capture.port.onmessage = (
        event: MessageEvent<Float32Array<ArrayBuffer>>,
      ) => {
        if (
          generationRef.current !== generation ||
          resourcesRef.current !== resources
        ) {
          return
        }

        const now = performance.now()
        if (
          now - lastInputLevelAtRef.current >=
          INPUT_LEVEL_UPDATE_INTERVAL_MS
        ) {
          setInputLevel(normalizeInputLevel(rootMeanSquare(event.data)))
          lastInputLevelAtRef.current = now
        }

        ring.push(event.data)
        const current = optionsRef.current
        if (
          ring.length < requiredInputSamples ||
          inferenceRunningRef.current ||
          now - lastInferenceAtRef.current <
            current.polyphonicAnalysisIntervalMs
        ) {
          return
        }

        lastInferenceAtRef.current = now
        const samples = ring.tail(requiredInputSamples)
        const recentSamples = samples.subarray(
          Math.max(0, samples.length - Math.round(context.sampleRate * 0.25)),
        )
        if (
          rootMeanSquare(recentSamples) <
          sensitivityToSilenceThreshold(current.sensitivity)
        ) {
          setReading(null)
          setAnalysisState('no-result')
          return
        }

        inferenceRunningRef.current = true
        const inferenceId = inferenceIdRef.current + 1
        inferenceIdRef.current = inferenceId
        setAnalysisState('analyzing')

        void resampleAudio(
          samples,
          context.sampleRate,
          BASIC_PITCH_SAMPLE_RATE,
          BASIC_PITCH_INPUT_SAMPLES,
        )
          .then((resampled) => {
            if (
              generationRef.current !== generation ||
              resourcesRef.current !== resources
            ) {
              return null
            }

            return client.analyze({
              generation,
              inferenceId,
              capturedAt: Date.now(),
              samples: resampled,
              settings: {
                minFrequency: current.minFrequency,
                maxFrequency: current.maxFrequency,
                onsetThreshold: current.polyphonicOnsetThreshold,
                frameThreshold: current.polyphonicFrameThreshold,
                minActivation: current.polyphonicMinActivation,
                maxNotes: current.polyphonicMaxNotes,
              },
            })
          })
          .then((result) => {
            if (!result) {
              return
            }
            if (
              generationRef.current === generation &&
              resourcesRef.current === resources
            ) {
              setErrorMessage(null)
              setReading(result.reading)
              setInferenceMs(result.inferenceMs)
              setAnalysisState(result.reading ? 'result' : 'no-result')
            }
          })
          .catch((error: unknown) => {
            if (generationRef.current !== generation) {
              return
            }
            if (error instanceof PolyphonicInferenceBusy) {
              setAnalysisState('collecting')
              return
            }

            generationRef.current += 1
            releaseAudio()
            terminateInference()
            setStatus(errorState(error))
            setModelState(modelErrorState(error))
            setReading(null)
            setTrackSettings(null)
            setAnalysisSampleRate(null)
            setAnalysisState('idle')
            setInputLevel(0)
            setErrorMessage(workerErrorMessage(error))
          })
          .finally(() => {
            if (inferenceIdRef.current === inferenceId) {
              inferenceRunningRef.current = false
              lastInferenceAtRef.current = performance.now()
            }
          })
      }

      const runtime = await runtimePromise
      if (generationRef.current === generation) {
        setModelState('ready')
        setWorkerBackend(runtime.backend)
        setModelLoadMs(runtime.loadMs)
      }
    } catch (error) {
      if (pendingStream) {
        stopMediaStream(pendingStream)
      }
      if (pendingContext) {
        void pendingContext.close()
      }
      if (generationRef.current !== generation) {
        return
      }
      releaseAudio()
      terminateInference()
      setTrackSettings(null)
      setAnalysisSampleRate(null)
      setAnalysisState('idle')
      setInputLevel(0)
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setStatus('denied')
        setErrorMessage('麦克风权限被拒绝，可以在浏览器站点设置中重新允许。')
      } else {
        setStatus(errorState(error))
        setModelState(modelErrorState(error))
        setErrorMessage(workerErrorMessage(error))
      }
    }
  }, [releaseAudio, terminateInference])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      releaseAudio()
      inferenceClientRef.current?.terminate()
      inferenceClientRef.current = null
    }
  }, [releaseAudio])

  useEffect(() => {
    const stopWhenHidden = () => {
      if (!document.hidden) {
        return
      }
      dispose()
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () =>
      document.removeEventListener('visibilitychange', stopWhenHidden)
  }, [dispose])

  return {
    status,
    reading,
    errorMessage,
    trackSettings,
    analysisSampleRate,
    modelState,
    analysisState,
    inputLevel,
    workerBackend,
    modelLoadMs,
    inferenceMs,
    start,
    stop,
    dispose,
    dismissError,
  }
}

function rootMeanSquare(samples: Float32Array<ArrayBuffer>): number {
  if (samples.length === 0) {
    return 0
  }

  let sum = 0
  for (const sample of samples) {
    sum += sample * sample
  }
  return Math.sqrt(sum / samples.length)
}

function normalizeInputLevel(rms: number): number {
  const decibels = 20 * Math.log10(Math.max(rms, 0.000_001))
  return Math.min(1, Math.max(0, (decibels + 60) / 48))
}

function isWorkerWebGlUnavailable(error: unknown): boolean {
  return (
    error instanceof PolyphonicWorkerFailure &&
    error.reason === 'worker-webgl-unavailable'
  )
}

function errorState(error: unknown): MicrophoneDetectionStatus {
  return isWorkerWebGlUnavailable(error) ? 'unsupported' : 'error'
}

function modelErrorState(error: unknown): PolyphonicModelState {
  return isWorkerWebGlUnavailable(error) ? 'unsupported' : 'error'
}

function workerErrorMessage(error: unknown): string {
  if (isWorkerWebGlUnavailable(error)) {
    return '当前浏览器无法在 Worker 中使用 WebGL，多音识别已停用。'
  }
  if (
    error instanceof PolyphonicWorkerFailure &&
    error.reason === 'model-load-failed'
  ) {
    return '多音模型加载失败，请检查网络后重试。'
  }
  return '多音识别失败，可以停止麦克风后重试。'
}
