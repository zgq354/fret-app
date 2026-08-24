import type {
  PolyphonicAnalysisSettings,
  PolyphonicInferenceResult,
  PolyphonicRuntimeInfo,
  PolyphonicWorkerErrorReason,
  PolyphonicWorkerRequest,
  PolyphonicWorkerResponse,
} from './polyphonicInferenceMessages'

const MODEL_LOAD_TIMEOUT_MS = 60_000
const INFERENCE_TIMEOUT_MS = 30_000

export interface PolyphonicWorkerPort {
  onmessage: ((event: MessageEvent<PolyphonicWorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage: (
    message: PolyphonicWorkerRequest,
    transfer: Transferable[],
  ) => void
  terminate: () => void
}

export interface AnalyzePolyphonicSamplesRequest {
  generation: number
  inferenceId: number
  capturedAt: number
  samples: Float32Array<ArrayBuffer>
  settings: PolyphonicAnalysisSettings
}

export interface PolyphonicInferenceClient {
  prepare: () => Promise<PolyphonicRuntimeInfo>
  analyze: (
    request: AnalyzePolyphonicSamplesRequest,
  ) => Promise<PolyphonicInferenceResult>
  terminate: () => void
}

export class PolyphonicWorkerFailure extends Error {
  readonly reason: PolyphonicWorkerErrorReason

  constructor(reason: PolyphonicWorkerErrorReason) {
    super(`Polyphonic worker failed: ${reason}`)
    this.name = 'PolyphonicWorkerFailure'
    this.reason = reason
  }
}

export class PolyphonicInferenceBusy extends Error {
  constructor() {
    super('Polyphonic inference is already running')
    this.name = 'PolyphonicInferenceBusy'
  }
}

export class PolyphonicWorkerTerminated extends Error {
  constructor() {
    super('Polyphonic worker was terminated')
    this.name = 'PolyphonicWorkerTerminated'
  }
}

interface PendingAnalysis {
  generation: number
  inferenceId: number
  resolve: (result: PolyphonicInferenceResult) => void
  reject: (error: Error) => void
}

export function createPolyphonicInferenceClient(
  createWorker: () => PolyphonicWorkerPort = createModuleWorker,
): PolyphonicInferenceClient {
  let worker: PolyphonicWorkerPort | null = null
  let readyInfo: PolyphonicRuntimeInfo | null = null
  let preparePromise: Promise<PolyphonicRuntimeInfo> | null = null
  let resolvePrepare: ((info: PolyphonicRuntimeInfo) => void) | null = null
  let rejectPrepare: ((error: Error) => void) | null = null
  let analysisPromise: Promise<PolyphonicInferenceResult> | null = null
  let pendingAnalysis: PendingAnalysis | null = null
  let prepareTimeout: ReturnType<typeof setTimeout> | null = null
  let analysisTimeout: ReturnType<typeof setTimeout> | null = null
  let terminated = false

  const clearPrepareTimeout = () => {
    if (prepareTimeout !== null) {
      clearTimeout(prepareTimeout)
      prepareTimeout = null
    }
  }

  const clearAnalysisTimeout = () => {
    if (analysisTimeout !== null) {
      clearTimeout(analysisTimeout)
      analysisTimeout = null
    }
  }

  const ensureWorker = (): PolyphonicWorkerPort => {
    if (worker) {
      return worker
    }

    worker = createWorker()
    worker.onmessage = (event) => {
      const response = event.data
      if (response.type === 'ready') {
        clearPrepareTimeout()
        readyInfo = { backend: response.backend, loadMs: response.loadMs }
        resolvePrepare?.(readyInfo)
        resolvePrepare = null
        rejectPrepare = null
        return
      }

      if (response.type === 'result') {
        if (
          pendingAnalysis?.generation === response.generation &&
          pendingAnalysis.inferenceId === response.inferenceId
        ) {
          clearAnalysisTimeout()
          pendingAnalysis.resolve({
            reading: response.reading,
            inferenceMs: response.inferenceMs,
          })
          pendingAnalysis = null
        }
        return
      }

      const error = new PolyphonicWorkerFailure(response.reason)
      if (response.stage === 'load') {
        clearPrepareTimeout()
        rejectPrepare?.(error)
        resolvePrepare = null
        rejectPrepare = null
        preparePromise = null
      } else if (
        pendingAnalysis &&
        pendingAnalysis.generation === response.generation &&
        pendingAnalysis.inferenceId === response.inferenceId
      ) {
        clearAnalysisTimeout()
        pendingAnalysis.reject(error)
        pendingAnalysis = null
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      failPending(
        new PolyphonicWorkerFailure(
          pendingAnalysis ? 'inference-failed' : 'model-load-failed',
        ),
      )
      worker?.terminate()
      worker = null
      readyInfo = null
    }
    return worker
  }

  const failPending = (error: Error) => {
    clearPrepareTimeout()
    clearAnalysisTimeout()
    rejectPrepare?.(error)
    pendingAnalysis?.reject(error)
    resolvePrepare = null
    rejectPrepare = null
    pendingAnalysis = null
    preparePromise = null
  }

  const prepare = (): Promise<PolyphonicRuntimeInfo> => {
    if (terminated) {
      return Promise.reject(new PolyphonicWorkerTerminated())
    }
    if (readyInfo) {
      return Promise.resolve(readyInfo)
    }
    if (preparePromise) {
      return preparePromise
    }

    const currentWorker = ensureWorker()
    preparePromise = new Promise<PolyphonicRuntimeInfo>((resolve, reject) => {
      resolvePrepare = resolve
      rejectPrepare = reject
      currentWorker.postMessage({ type: 'prepare' }, [])
      prepareTimeout = setTimeout(() => {
        failPending(new PolyphonicWorkerFailure('model-load-failed'))
        worker?.terminate()
        worker = null
        readyInfo = null
      }, MODEL_LOAD_TIMEOUT_MS)
    })
    return preparePromise
  }

  const analyze = (
    request: AnalyzePolyphonicSamplesRequest,
  ): Promise<PolyphonicInferenceResult> => {
    if (analysisPromise) {
      return Promise.reject(new PolyphonicInferenceBusy())
    }

    const task = prepare().then(
      () =>
        new Promise<PolyphonicInferenceResult>((resolve, reject) => {
          pendingAnalysis = {
            generation: request.generation,
            inferenceId: request.inferenceId,
            resolve,
            reject,
          }
          ensureWorker().postMessage(
            { type: 'analyze', ...request },
            [request.samples.buffer],
          )
          analysisTimeout = setTimeout(() => {
            failPending(new PolyphonicWorkerFailure('inference-failed'))
            worker?.terminate()
            worker = null
            readyInfo = null
          }, INFERENCE_TIMEOUT_MS)
        }),
    )
    analysisPromise = task.finally(() => {
      analysisPromise = null
    })
    return analysisPromise
  }

  const terminate = () => {
    if (terminated) {
      return
    }
    terminated = true
    failPending(new PolyphonicWorkerTerminated())
    worker?.terminate()
    worker = null
    readyInfo = null
    analysisPromise = null
  }

  return { prepare, analyze, terminate }
}

function createModuleWorker(): Worker {
  return new Worker(
    new URL('./polyphonicInference.worker.ts', import.meta.url),
    { type: 'module', name: 'polyphonic-inference' },
  )
}
