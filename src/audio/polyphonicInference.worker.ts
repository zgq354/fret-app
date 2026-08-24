import {
  prepareBasicPitch,
  transcribeWithBasicPitch,
  WorkerWebGlUnavailable,
} from './basicPitchAdapter'
import type {
  PolyphonicRuntimeInfo,
  PolyphonicWorkerRequest,
  PolyphonicWorkerResponse,
} from './polyphonicInferenceMessages'
import { createChordReading } from '../music/chordAnalysis'

interface WorkerEndpoint {
  onmessage: ((event: MessageEvent<PolyphonicWorkerRequest>) => void) | null
  postMessage: (response: PolyphonicWorkerResponse) => void
}

installTensorFlowWorkerCompatibility()

const endpoint = self as unknown as WorkerEndpoint
let runtimePromise: Promise<PolyphonicRuntimeInfo> | null = null
let inferenceQueue: Promise<void> = Promise.resolve()

endpoint.onmessage = (event) => {
  const request = event.data
  if (request.type === 'prepare') {
    void prepareRuntime()
      .then((runtime) => endpoint.postMessage({ type: 'ready', ...runtime }))
      .catch((error: unknown) => {
        endpoint.postMessage({
          type: 'error',
          stage: 'load',
          reason:
            error instanceof WorkerWebGlUnavailable
              ? 'worker-webgl-unavailable'
              : 'model-load-failed',
        })
      })
    return
  }

  inferenceQueue = inferenceQueue
    .then(async () => {
      await prepareRuntime()
      const startedAt = performance.now()
      const frame = await transcribeWithBasicPitch(request.samples, {
        capturedAt: request.capturedAt,
        minFrequency: request.settings.minFrequency,
        maxFrequency: request.settings.maxFrequency,
        onsetThreshold: request.settings.onsetThreshold,
        frameThreshold: request.settings.frameThreshold,
        minActivation: request.settings.minActivation,
        maxNotes: request.settings.maxNotes,
      })
      endpoint.postMessage({
        type: 'result',
        generation: request.generation,
        inferenceId: request.inferenceId,
        reading: createChordReading(frame),
        inferenceMs: performance.now() - startedAt,
      })
    })
    .catch((error: unknown) => {
      endpoint.postMessage({
        type: 'error',
        stage: 'inference',
        reason:
          error instanceof WorkerWebGlUnavailable
            ? 'worker-webgl-unavailable'
            : 'inference-failed',
        generation: request.generation,
        inferenceId: request.inferenceId,
      })
    })
}

function prepareRuntime(): Promise<PolyphonicRuntimeInfo> {
  runtimePromise ??= (async () => {
    const startedAt = performance.now()
    const backend = await prepareBasicPitch()
    return { backend, loadMs: performance.now() - startedAt }
  })().catch((error: unknown) => {
    runtimePromise = null
    throw error
  })
  return runtimePromise
}

function installTensorFlowWorkerCompatibility(): void {
  // TFJS 3.21 reads `window` directly before choosing its timer fallback.
  if (!('window' in globalThis)) {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    })
  }
}
