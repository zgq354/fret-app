import { describe, expect, it } from 'vitest'
import { createPianoKeys } from './pianoKeys'

describe('createPianoKeys', () => {
  it('creates every chromatic key from C2 through C7', () => {
    const keys = createPianoKeys()

    expect(keys).toHaveLength(61)
    expect(keys[0]).toMatchObject({ midi: 36, isBlack: false, x: 0 })
    expect(keys.at(-1)).toMatchObject({ midi: 96, isBlack: false })
    expect(keys.map((key) => key.midi)).toEqual(
      Array.from({ length: 61 }, (_, index) => 36 + index),
    )
  })

  it('places black keys between adjacent white keys', () => {
    const keys = createPianoKeys()
    const c4 = keys.find((key) => key.midi === 60)
    const cSharp4 = keys.find((key) => key.midi === 61)
    const d4 = keys.find((key) => key.midi === 62)

    expect(c4).toMatchObject({ isBlack: false, x: 392 })
    expect(cSharp4).toMatchObject({ isBlack: true, x: 411.5 })
    expect(d4).toMatchObject({ isBlack: false, x: 420 })
  })
})
