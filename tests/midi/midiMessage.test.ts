import { describe, expect, it } from 'vitest'
import { createMidiVoiceId, parseMidiMessage } from '../../src/midi/midiMessage'

describe('parseMidiMessage', () => {
  it('parses note on with channel and normalized velocity', () => {
    expect(parseMidiMessage([0x92, 64, 100], 'keyboard-1')).toEqual({
      type: 'noteOn',
      voiceId: createMidiVoiceId('keyboard-1', 2, 64),
      inputId: 'keyboard-1',
      channel: 2,
      midi: 64,
      velocity: 100 / 127,
    })
  })

  it('normalizes velocity-zero note on to note off', () => {
    expect(parseMidiMessage([0x90, 60, 0], 'keyboard-1')).toEqual({
      type: 'noteOff',
      voiceId: createMidiVoiceId('keyboard-1', 0, 60),
      inputId: 'keyboard-1',
      channel: 0,
      midi: 60,
    })
  })

  it('parses ordinary note off and channel all-notes-off', () => {
    expect(parseMidiMessage([0x81, 67, 55], 'keyboard-2')).toMatchObject({
      type: 'noteOff',
      channel: 1,
      midi: 67,
    })
    expect(parseMidiMessage([0xb4, 123, 0], 'keyboard-2')).toEqual({
      type: 'allNotesOff',
      inputId: 'keyboard-2',
      channel: 4,
    })
  })

  it('ignores messages outside the note lifecycle', () => {
    expect(parseMidiMessage([0xe0, 0, 64], 'keyboard-1')).toBeNull()
    expect(parseMidiMessage([0xf8], 'keyboard-1')).toBeNull()
  })
})
