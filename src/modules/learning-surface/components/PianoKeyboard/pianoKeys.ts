export interface PianoKey {
  midi: number
  x: number
  isBlack: boolean
}

export const PIANO_START_MIDI = 36
export const PIANO_END_MIDI = 96
export const WHITE_KEY_WIDTH = 28
export const BLACK_KEY_WIDTH = 17

export function createPianoKeys(): PianoKey[] {
  const keys: PianoKey[] = []
  let whiteIndex = -1

  for (let midi = PIANO_START_MIDI; midi <= PIANO_END_MIDI; midi += 1) {
    const isBlackKey = isBlack(midi)

    if (!isBlackKey) {
      whiteIndex += 1
      keys.push({
        midi,
        x: whiteIndex * WHITE_KEY_WIDTH,
        isBlack: false,
      })
    } else {
      keys.push({
        midi,
        x: (whiteIndex + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
        isBlack: true,
      })
    }
  }

  return keys
}

function isBlack(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)
}
