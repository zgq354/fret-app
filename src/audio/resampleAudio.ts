export async function resampleAudio(
  input: Float32Array<ArrayBuffer>,
  inputSampleRate: number,
  outputSampleRate: number,
  outputLength: number,
): Promise<Float32Array<ArrayBuffer>> {
  const offlineContext = new OfflineAudioContext(
    1,
    outputLength,
    outputSampleRate,
  )
  const inputBuffer = offlineContext.createBuffer(
    1,
    input.length,
    inputSampleRate,
  )
  inputBuffer.copyToChannel(input, 0)

  const source = offlineContext.createBufferSource()
  source.buffer = inputBuffer
  source.connect(offlineContext.destination)
  source.start()

  const rendered = await offlineContext.startRendering()
  return new Float32Array(rendered.getChannelData(0))
}
