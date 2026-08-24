class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2_048)
    this.offset = 0
  }

  process(inputs) {
    const channels = inputs[0]
    const frameCount = channels?.[0]?.length ?? 0

    for (let frame = 0; frame < frameCount; frame += 1) {
      let sample = 0
      for (const channel of channels) {
        sample += channel[frame] ?? 0
      }
      this.buffer[this.offset] = sample / channels.length
      this.offset += 1

      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer])
        this.buffer = new Float32Array(2_048)
        this.offset = 0
      }
    }

    return true
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
