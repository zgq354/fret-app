export class AudioSampleRing {
  private readonly storage: Float32Array<ArrayBuffer>
  private writeIndex = 0
  private sampleCount = 0

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('Audio sample ring capacity must be positive')
    }
    this.storage = new Float32Array(capacity)
  }

  get length(): number {
    return this.sampleCount
  }

  get capacity(): number {
    return this.storage.length
  }

  push(samples: Float32Array<ArrayBufferLike>): void {
    for (const sample of samples) {
      this.storage[this.writeIndex] = sample
      this.writeIndex = (this.writeIndex + 1) % this.storage.length
    }
    this.sampleCount = Math.min(
      this.storage.length,
      this.sampleCount + samples.length,
    )
  }

  tail(requestedLength: number): Float32Array<ArrayBuffer> {
    const length = Math.min(
      this.sampleCount,
      Math.max(0, Math.floor(requestedLength)),
    )
    const result = new Float32Array(length)
    const start =
      (this.writeIndex - length + this.storage.length) % this.storage.length

    for (let index = 0; index < length; index += 1) {
      result[index] = this.storage[(start + index) % this.storage.length]
    }
    return result
  }
}
