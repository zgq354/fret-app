import type { BasicPitch as BasicPitchInstance } from '@spotify/basic-pitch'
import {
  selectSimultaneousNotes,
  type PolyphonicPitchFrame,
} from './polyphonicPitch'
import {
  BASIC_PITCH_INPUT_SAMPLES,
  BASIC_PITCH_SAMPLE_RATE,
} from './polyphonicInferenceMessages'

interface BasicPitchRuntime {
  basicPitch: BasicPitchInstance
  backend: string
  engine: {
    startScope: (name?: string) => void
    endScope: () => void
  }
  noteFramesToTime: typeof import('@spotify/basic-pitch').noteFramesToTime
  outputToNotesPoly: typeof import('@spotify/basic-pitch').outputToNotesPoly
}

interface TranscribeOptions {
  capturedAt?: number
  minFrequency?: number
  maxFrequency?: number
  onsetThreshold?: number
  frameThreshold?: number
  minActivation?: number
  maxNotes?: number
}

let runtimePromise: Promise<BasicPitchRuntime> | null = null

export class WorkerWebGlUnavailable extends Error {
  constructor() {
    super('WebGL is unavailable inside the inference worker')
    this.name = 'WorkerWebGlUnavailable'
  }
}

export function prepareBasicPitch(): Promise<string> {
  return loadRuntime().then((runtime) => runtime.backend)
}

export function transcribeWithBasicPitch(
  input: Float32Array<ArrayBuffer>,
  options: TranscribeOptions = {},
): Promise<PolyphonicPitchFrame> {
  if (input.length !== BASIC_PITCH_INPUT_SAMPLES) {
    return Promise.reject(
      new RangeError(
        `Basic Pitch expects ${BASIC_PITCH_INPUT_SAMPLES} samples`,
      ),
    )
  }

  return runTranscription(input, options)
}

async function runTranscription(
  input: Float32Array<ArrayBuffer>,
  options: TranscribeOptions,
): Promise<PolyphonicPitchFrame> {
  const runtime = await loadRuntime()
  const frames: number[][] = []
  const onsets: number[][] = []
  const minFrequency = options.minFrequency ?? 55
  const maxFrequency = options.maxFrequency ?? 2_100
  runtime.engine.startScope('basic-pitch-inference')

  try {
    await runtime.basicPitch.evaluateModel(
      input,
      (frameChunk, onsetChunk) => {
        frames.push(...frameChunk)
        onsets.push(...onsetChunk)
      },
      () => undefined,
    )

    const events = runtime.noteFramesToTime(
      runtime.outputToNotesPoly(
        frames,
        onsets,
        options.onsetThreshold ?? 0.35,
        options.frameThreshold ?? 0.3,
        5,
        true,
        maxFrequency,
        minFrequency,
      ),
    )

    return {
      capturedAt: options.capturedAt ?? Date.now(),
      notes: selectSimultaneousNotes(events, {
        analysisDurationSeconds: input.length / BASIC_PITCH_SAMPLE_RATE,
        minActivation: options.minActivation,
        maxNotes: options.maxNotes,
        minMidi: Math.ceil(frequencyToMidi(minFrequency)),
        maxMidi: Math.floor(frequencyToMidi(maxFrequency)),
      }),
    }
  } finally {
    runtime.engine.endScope()
  }
}

function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

async function loadRuntime(): Promise<BasicPitchRuntime> {
  runtimePromise ??= Promise.all([
    import('@spotify/basic-pitch'),
    import('@tensorflow/tfjs'),
  ])
    .then(async ([basicPitchModule, tensorflow]) => {
      const backend = await activateWorkerWebGl(tensorflow)
      const modelPath =
        import.meta.env.BASE_URL + 'models/basic-pitch/model.json'
      const basicPitch = new basicPitchModule.BasicPitch(modelPath)
      await basicPitch.model

      return {
        basicPitch,
        backend,
        engine: tensorflow.engine(),
        noteFramesToTime: basicPitchModule.noteFramesToTime,
        outputToNotesPoly: basicPitchModule.outputToNotesPoly,
      }
    })
    .catch((error: unknown) => {
      runtimePromise = null
      throw error
    })

  return runtimePromise
}

async function activateWorkerWebGl(
  tensorflow: typeof import('@tensorflow/tfjs'),
): Promise<string> {
  try {
    const selected = await tensorflow.setBackend('webgl')
    await tensorflow.ready()
    const backend = tensorflow.getBackend()

    if (!selected || backend !== 'webgl') {
      throw new WorkerWebGlUnavailable()
    }

    return backend
  } catch (error) {
    if (error instanceof WorkerWebGlUnavailable) {
      throw error
    }
    throw new WorkerWebGlUnavailable()
  }
}
