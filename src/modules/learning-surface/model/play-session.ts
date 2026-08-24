interface FretboardPlayNoteRequest {
  midi: number
  instrumentId: 'guitar'
  source: 'fretboard'
  stringNumber: number
  fret: number
}

interface PianoPlayNoteRequest {
  midi: number
  instrumentId: 'piano'
  source: 'piano'
}

interface MidiPlayNoteRequest {
  midi: number
  instrumentId: 'guitar' | 'piano'
  source: 'midi'
  inputId: string
  inputName: string
}

export type PlayNoteRequest =
  | FretboardPlayNoteRequest
  | PianoPlayNoteRequest
  | MidiPlayNoteRequest

export interface PlayVoice {
  voiceId: string
  request: PlayNoteRequest
}

export interface PlaySessionState {
  activeVoices: readonly PlayVoice[]
  releasingVoices: readonly PlayVoice[]
  lastSnapshot: readonly PlayNoteRequest[]
  focusVoiceId: string | null
  focusNote: PlayNoteRequest | null
}

export type PlaySessionAction =
  | {
      type: 'noteOn'
      voiceId: string
      request: PlayNoteRequest
    }
  | { type: 'noteOff'; voiceId: string }
  | { type: 'releaseExpired'; voiceId: string }
  | { type: 'trigger'; request: PlayNoteRequest }
  | { type: 'clear' }

export const EMPTY_PLAY_SESSION: PlaySessionState = {
  activeVoices: [],
  releasingVoices: [],
  lastSnapshot: [],
  focusVoiceId: null,
  focusNote: null,
}

export function reducePlaySession(
  state: PlaySessionState,
  action: PlaySessionAction,
): PlaySessionState {
  if (action.type === 'clear') {
    return EMPTY_PLAY_SESSION
  }

  if (action.type === 'trigger') {
    const activeRequests = state.activeVoices.map((voice) => voice.request)
    return {
      ...state,
      lastSnapshot:
        activeRequests.length === 0
          ? [action.request]
          : [...activeRequests, action.request],
      focusVoiceId: null,
      focusNote: action.request,
    }
  }

  if (action.type === 'noteOn') {
    const activeVoices = [
      ...state.activeVoices.filter(
        (voice) => voice.voiceId !== action.voiceId,
      ),
      { voiceId: action.voiceId, request: action.request },
    ]

    return {
      activeVoices,
      releasingVoices: state.releasingVoices.filter(
        (voice) => voice.voiceId !== action.voiceId,
      ),
      lastSnapshot: activeVoices.map((voice) => voice.request),
      focusVoiceId: action.voiceId,
      focusNote: action.request,
    }
  }

  if (action.type === 'releaseExpired') {
    return {
      ...state,
      releasingVoices: state.releasingVoices.filter(
        (voice) => voice.voiceId !== action.voiceId,
      ),
    }
  }

  const endedVoice = state.activeVoices.find(
    (voice) => voice.voiceId === action.voiceId,
  )
  if (!endedVoice) {
    return state
  }

  const activeVoices = state.activeVoices.filter(
    (voice) => voice.voiceId !== action.voiceId,
  )
  const releasingVoices = [
    ...state.releasingVoices.filter(
      (voice) => voice.voiceId !== action.voiceId,
    ),
    endedVoice,
  ]
  if (state.focusVoiceId !== action.voiceId) {
    return { ...state, activeVoices, releasingVoices }
  }

  const fallbackVoice = activeVoices.at(-1)
  return {
    ...state,
    activeVoices,
    releasingVoices,
    focusVoiceId: fallbackVoice?.voiceId ?? null,
    focusNote: fallbackVoice?.request ?? state.focusNote,
  }
}

export function getActivePlayNotes(
  state: PlaySessionState,
): readonly PlayNoteRequest[] {
  return state.activeVoices.map((voice) => voice.request)
}

export function getReleasingPlayNotes(
  state: PlaySessionState,
): readonly PlayNoteRequest[] {
  return state.releasingVoices.map((voice) => voice.request)
}

export function getUniqueMidis(
  notes: readonly PlayNoteRequest[],
  focusMidi?: number | null,
): number[] {
  const midis = new Set<number>()
  if (focusMidi !== null && focusMidi !== undefined) {
    midis.add(Math.round(focusMidi))
  }
  for (const note of notes) {
    midis.add(Math.round(note.midi))
  }
  return [...midis]
}
