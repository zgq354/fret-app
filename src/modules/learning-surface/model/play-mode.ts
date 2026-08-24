import type { MicrophoneDetectionStatus } from '../../audio/microphoneInput'
import {
  createPitchReading,
  formatNoteLabel,
  midiToFrequency,
  midiToNote,
  type MiddleCStyle,
  type PitchReading,
} from '../../music/musicTheory'
import type { PlayNoteRequest } from './play-session'
export type { PlayNoteRequest } from './play-session'
export type LearningMode = 'listen' | 'play'

interface ResolveLearningDisplayInput {
  mode: LearningMode
  demoMidi: number
  pitchStatus: MicrophoneDetectionStatus
  pitchReading: PitchReading | null
  stickyPitch: boolean
  latestDetectedReading: PitchReading | null
  lastPlayedNote: PlayNoteRequest | null
  middleCStyle: MiddleCStyle
}

export interface LearningDisplay {
  reading: PitchReading | null
  midi: number | null
  sourceLabel: string
}

export function canPromptPlayMode(
  mode: LearningMode,
  microphoneStatus: MicrophoneDetectionStatus,
): boolean {
  return mode === 'listen' && microphoneStatus !== 'requesting'
}

export function resolveLearningDisplay({
  mode,
  demoMidi,
  pitchStatus,
  pitchReading,
  stickyPitch,
  latestDetectedReading,
  lastPlayedNote,
  middleCStyle,
}: ResolveLearningDisplayInput): LearningDisplay {
  if (mode === 'play') {
    if (!lastPlayedNote) {
      return {
        reading: null,
        midi: null,
        sourceLabel: '弹奏模式 · 指板、琴键或 MIDI',
      }
    }

    const reading = createPitchReading(midiToFrequency(lastPlayedNote.midi))
    return {
      reading,
      midi: reading.midi,
      sourceLabel: getPlayedSourceLabel(lastPlayedNote, middleCStyle),
    }
  }

  const isListening = pitchStatus === 'listening'
  const reading = isListening
    ? pitchReading ?? (stickyPitch ? latestDetectedReading : null)
    : createPitchReading(midiToFrequency(demoMidi))

  return {
    reading,
    midi: reading?.midi ?? null,
    sourceLabel:
      isListening && !pitchReading && stickyPitch && latestDetectedReading
        ? '实时麦克风 · 粘滞最后音符'
        : getListeningSourceLabel(pitchStatus, pitchReading?.confidence),
  }
}

function getPlayedSourceLabel(
  request: PlayNoteRequest,
  middleCStyle: MiddleCStyle,
): string {
  const note = midiToNote(request.midi)
  const noteLabel = formatNoteLabel(note, middleCStyle)
  if (request.source === 'piano') {
    return '钢琴 · ' + noteLabel
  }

  if (request.source === 'midi') {
    return 'MIDI · ' + request.inputName + ' · ' + noteLabel
  }

  const position = request.fret === 0 ? '空弦' : request.fret + ' 品'
  return '吉他 · ' + request.stringNumber + ' 弦 ' + position
}

function getListeningSourceLabel(
  status: MicrophoneDetectionStatus,
  confidence?: number,
): string {
  if (status === 'requesting') {
    return '正在准备麦克风'
  }

  if (status === 'listening') {
    return confidence === undefined
      ? '实时麦克风 · 等待单音'
      : '实时麦克风 · 置信度 ' + Math.round(confidence * 100) + '%'
  }

  return '演示音 · 可用 ± 切换'
}
