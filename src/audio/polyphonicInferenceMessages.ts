import type { ChordReading } from '../music/chordAnalysis'

export const BASIC_PITCH_SAMPLE_RATE = 22_050
export const BASIC_PITCH_INPUT_SAMPLES =
  BASIC_PITCH_SAMPLE_RATE * 2 - 256

export interface PolyphonicAnalysisSettings {
  minFrequency: number
  maxFrequency: number
  onsetThreshold: number
  frameThreshold: number
  minActivation: number
  maxNotes: number
}

export interface PolyphonicRuntimeInfo {
  backend: string
  loadMs: number
}

export interface PolyphonicInferenceResult {
  reading: ChordReading | null
  inferenceMs: number
}

export type PolyphonicModelState =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'error'

export type PolyphonicAnalysisState =
  | 'idle'
  | 'collecting'
  | 'analyzing'
  | 'no-result'
  | 'result'

export type PolyphonicWorkerErrorReason =
  | 'worker-webgl-unavailable'
  | 'model-load-failed'
  | 'inference-failed'

export type PolyphonicWorkerRequest =
  | { type: 'prepare' }
  | {
      type: 'analyze'
      generation: number
      inferenceId: number
      capturedAt: number
      samples: Float32Array<ArrayBuffer>
      settings: PolyphonicAnalysisSettings
    }

export type PolyphonicWorkerResponse =
  | ({ type: 'ready' } & PolyphonicRuntimeInfo)
  | ({
      type: 'result'
      generation: number
      inferenceId: number
    } & PolyphonicInferenceResult)
  | {
      type: 'error'
      stage: 'load' | 'inference'
      reason: PolyphonicWorkerErrorReason
      generation?: number
      inferenceId?: number
    }
