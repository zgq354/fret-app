import { describe, expect, it, vi } from 'vitest'
import {
  createPolyphonicInferenceClient,
  PolyphonicInferenceBusy,
  PolyphonicWorkerTerminated,
  type PolyphonicWorkerPort,
} from './polyphonicInferenceClient'
import type {
  PolyphonicWorkerRequest,
  PolyphonicWorkerResponse,
} from './polyphonicInferenceMessages'

const settings = {
  minFrequency: 65,
  maxFrequency: 1_200,
  onsetThreshold: 0.35,
  frameThreshold: 0.3,
  minActivation: 0.3,
  maxNotes: 6,
}

class FakeWorker implements PolyphonicWorkerPort {
  onmessage: ((event: MessageEvent<PolyphonicWorkerResponse>) => void) | null =
    null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: PolyphonicWorkerRequest[] = []
  readonly transfers: Transferable[][] = []
  terminated = false

  postMessage(
    message: PolyphonicWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    this.messages.push(message)
    this.transfers.push(transfer)
  }

  terminate() {
    this.terminated = true
  }

  emit(response: PolyphonicWorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<PolyphonicWorkerResponse>)
  }
}

describe('polyphonic inference client', () => {
  it('loads one worker runtime and reuses its ready result', async () => {
    const worker = new FakeWorker()
    const client = createPolyphonicInferenceClient(() => worker)

    const first = client.prepare()
    const second = client.prepare()
    expect(worker.messages).toEqual([{ type: 'prepare' }])

    worker.emit({ type: 'ready', backend: 'webgl', loadMs: 420 })
    await expect(first).resolves.toEqual({ backend: 'webgl', loadMs: 420 })
    await expect(second).resolves.toEqual({ backend: 'webgl', loadMs: 420 })
    await expect(client.prepare()).resolves.toEqual({
      backend: 'webgl',
      loadMs: 420,
    })
    expect(worker.messages).toHaveLength(1)
  })

  it('transfers the PCM buffer and resolves the matching result', async () => {
    const worker = new FakeWorker()
    const client = createPolyphonicInferenceClient(() => worker)
    const prepared = client.prepare()
    worker.emit({ type: 'ready', backend: 'webgl', loadMs: 120 })
    await prepared

    const samples = new Float32Array([0.1, 0.2, 0.3])
    const result = client.analyze({
      generation: 2,
      inferenceId: 7,
      capturedAt: 42,
      samples,
      settings,
    })
    await Promise.resolve()

    expect(worker.messages[1]).toMatchObject({
      type: 'analyze',
      generation: 2,
      inferenceId: 7,
      capturedAt: 42,
    })
    expect(worker.transfers[1]).toEqual([samples.buffer])

    worker.emit({
      type: 'result',
      generation: 2,
      inferenceId: 7,
      reading: null,
      inferenceMs: 88,
    })
    await expect(result).resolves.toEqual({ reading: null, inferenceMs: 88 })
  })

  it('rejects overlapping analysis instead of creating a queue', async () => {
    const worker = new FakeWorker()
    const client = createPolyphonicInferenceClient(() => worker)
    const prepared = client.prepare()
    worker.emit({ type: 'ready', backend: 'webgl', loadMs: 120 })
    await prepared

    const first = client.analyze({
      generation: 1,
      inferenceId: 1,
      capturedAt: 42,
      samples: new Float32Array(1),
      settings,
    })
    const second = client.analyze({
      generation: 1,
      inferenceId: 2,
      capturedAt: 43,
      samples: new Float32Array(1),
      settings,
    })
    await expect(second).rejects.toBeInstanceOf(PolyphonicInferenceBusy)

    worker.emit({
      type: 'result',
      generation: 1,
      inferenceId: 1,
      reading: null,
      inferenceMs: 10,
    })
    await first
  })

  it('reports worker capability failures without a silent fallback', async () => {
    const worker = new FakeWorker()
    const client = createPolyphonicInferenceClient(() => worker)
    const prepared = client.prepare()

    worker.emit({
      type: 'error',
      stage: 'load',
      reason: 'worker-webgl-unavailable',
    })
    await expect(prepared).rejects.toMatchObject({
      reason: 'worker-webgl-unavailable',
    })
  })

  it('rejects pending work when the worker is terminated', async () => {
    const worker = new FakeWorker()
    const client = createPolyphonicInferenceClient(() => worker)
    const prepared = client.prepare()
    client.terminate()

    await expect(prepared).rejects.toBeInstanceOf(PolyphonicWorkerTerminated)
    await expect(client.prepare()).rejects.toBeInstanceOf(
      PolyphonicWorkerTerminated,
    )
    expect(worker.terminated).toBe(true)
  })

  it('terminates a worker when inference stops responding', async () => {
    vi.useFakeTimers()
    try {
      const worker = new FakeWorker()
      const client = createPolyphonicInferenceClient(() => worker)
      const prepared = client.prepare()
      worker.emit({ type: 'ready', backend: 'webgl', loadMs: 120 })
      await prepared

      const result = client.analyze({
        generation: 1,
        inferenceId: 1,
        capturedAt: 42,
        samples: new Float32Array(1),
        settings,
      })
      const failure = result.catch((error: unknown) => error)
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(30_000)

      await expect(failure).resolves.toMatchObject({
        reason: 'inference-failed',
      })
      expect(worker.terminated).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
