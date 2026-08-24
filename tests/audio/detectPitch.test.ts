import { describe, expect, it } from 'vitest'
import { createPitchReading } from '../../src/modules/music/musicTheory'
import {
  detectPitch,
  sensitivityToSilenceThreshold,
} from '../../src/modules/audio/detectPitch'

const SAMPLE_RATE = 48_000
const BUFFER_SIZE = 4_096

function sineWave(
  frequency: number,
  amplitude = 1,
): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(BUFFER_SIZE)

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] =
      amplitude * Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE)
  }

  return samples
}

describe('pitch detection', () => {
  it.each([
    ['E2', 82.4069],
    ['A2', 110],
    ['E4', 329.6276],
    ['A4', 440],
  ])('detects a synthetic %s guitar tone', (label, frequency) => {
    const detected = detectPitch(sineWave(frequency), SAMPLE_RATE)

    expect(detected).not.toBeNull()
    const reading = createPitchReading(
      detected?.frequency ?? 0,
      detected?.confidence,
    )
    expect(reading.label).toBe(label)
    expect(Math.abs(reading.cents)).toBeLessThan(2)
  })

  it('ignores silence', () => {
    expect(
      detectPitch(new Float32Array(BUFFER_SIZE), SAMPLE_RATE),
    ).toBeNull()
  })

  it('maps input sensitivity to a clamped silence threshold', () => {
    expect(sensitivityToSilenceThreshold(0)).toBeCloseTo(0.032)
    expect(sensitivityToSilenceThreshold(50)).toBeCloseTo(0.008)
    expect(sensitivityToSilenceThreshold(100)).toBeCloseTo(0.002)
    expect(sensitivityToSilenceThreshold(-10)).toBeCloseTo(0.032)
    expect(sensitivityToSilenceThreshold(110)).toBeCloseTo(0.002)
  })

  it('detects a weak tone when sensitivity lowers the silence threshold', () => {
    const weakTone = sineWave(329.6276, 0.004)

    expect(detectPitch(weakTone, SAMPLE_RATE)).toBeNull()
    expect(
      detectPitch(weakTone, SAMPLE_RATE, {
        silenceThreshold: sensitivityToSilenceThreshold(100),
      }),
    ).not.toBeNull()
  })

  it('allows the fallback match threshold to be tuned', () => {
    const noisyTone = sineWave(329.6276).map(
      (sample, index) => sample + Math.sin(index * 1.73) * 0.32,
    )

    expect(
      detectPitch(noisyTone, SAMPLE_RATE, {
        threshold: 0.0001,
        fallbackThreshold: 0.001,
      }),
    ).toBeNull()
    expect(
      detectPitch(noisyTone, SAMPLE_RATE, {
        threshold: 0.0001,
        fallbackThreshold: 0.5,
      }),
    ).not.toBeNull()
  })
})
