export interface MidiNoteOnEvent {
  type: 'noteOn'
  voiceId: string
  inputId: string
  channel: number
  midi: number
  velocity: number
}

export interface MidiNoteOffEvent {
  type: 'noteOff'
  voiceId: string
  inputId: string
  channel: number
  midi: number
}

export interface MidiAllNotesOffEvent {
  type: 'allNotesOff'
  inputId: string
  channel: number
}

export type MidiInputEvent =
  | MidiNoteOnEvent
  | MidiNoteOffEvent
  | MidiAllNotesOffEvent

const NOTE_OFF = 0x80
const NOTE_ON = 0x90
const CONTROL_CHANGE = 0xb0
const ALL_SOUND_OFF = 120
const ALL_NOTES_OFF = 123

export function parseMidiMessage(
  data: ArrayLike<number>,
  inputId: string,
): MidiInputEvent | null {
  if (data.length < 2) {
    return null
  }

  const status = data[0] ?? 0
  const command = status & 0xf0
  const channel = status & 0x0f
  const midi = (data[1] ?? 0) & 0x7f
  const value = (data[2] ?? 0) & 0x7f

  if (command === NOTE_ON && value > 0) {
    return {
      type: 'noteOn',
      voiceId: createMidiVoiceId(inputId, channel, midi),
      inputId,
      channel,
      midi,
      velocity: value / 127,
    }
  }

  if (command === NOTE_OFF || command === NOTE_ON) {
    return {
      type: 'noteOff',
      voiceId: createMidiVoiceId(inputId, channel, midi),
      inputId,
      channel,
      midi,
    }
  }

  if (
    command === CONTROL_CHANGE &&
    (midi === ALL_SOUND_OFF || midi === ALL_NOTES_OFF)
  ) {
    return { type: 'allNotesOff', inputId, channel }
  }

  return null
}

export function createMidiVoiceId(
  inputId: string,
  channel: number,
  midi: number,
): string {
  return 'midi:' + inputId + ':' + channel + ':' + midi
}
