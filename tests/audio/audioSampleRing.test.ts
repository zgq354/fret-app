import { describe, expect, it } from 'vitest'
import { AudioSampleRing } from '../../src/audio/audioSampleRing'

describe('AudioSampleRing', () => {
  it('returns the newest samples in chronological order', () => {
    const ring = new AudioSampleRing(5)
    ring.push(new Float32Array([1, 2, 3]))
    ring.push(new Float32Array([4, 5, 6, 7]))

    expect([...ring.tail(5)]).toEqual([3, 4, 5, 6, 7])
    expect([...ring.tail(3)]).toEqual([5, 6, 7])
  })

  it('tracks partial fill without exposing uninitialized samples', () => {
    const ring = new AudioSampleRing(8)
    ring.push(new Float32Array([0.25, 0.5]))

    expect(ring.length).toBe(2)
    expect([...ring.tail(8)]).toEqual([0.25, 0.5])
  })

  it('rejects an unusable capacity', () => {
    expect(() => new AudioSampleRing(0)).toThrow(RangeError)
  })
})
