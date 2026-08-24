import { useMidiInput } from '../../midi/react/useMidiInput'
import type { InstrumentId } from '../../playback/instrument'
import { usePlayback } from '../../playback/react/usePlayback'
import type { LearningMode } from '../model/play-mode'
import type { PlayNoteRequest } from '../model/play-session'
import { usePlaySession } from './usePlaySession'

export function usePlayRuntime({
  learningMode,
  midiInstrumentId,
  onInactivePlay,
}: {
  learningMode: LearningMode
  midiInstrumentId: InstrumentId
  onInactivePlay: () => void
}) {
  const playback = usePlayback()
  const playSession = usePlaySession()

  function startPlayVoice(
    voiceId: string,
    request: PlayNoteRequest,
    velocity = 1,
  ) {
    if (learningMode !== 'play') {
      return
    }

    playSession.noteOn(voiceId, request)
    void playback.startVoice(
      voiceId,
      request.instrumentId,
      request.midi,
      velocity,
    )
  }

  function stopPlayVoice(voiceId: string) {
    playSession.noteOff(voiceId)
    playback.stopVoice(voiceId)
  }

  const midiInput = useMidiInput({
    enabled: learningMode === 'play',
    onNoteOn: (event, inputName) => {
      startPlayVoice(
        event.voiceId,
        {
          midi: event.midi,
          instrumentId: midiInstrumentId,
          source: 'midi',
          inputId: event.inputId,
          inputName,
        },
        event.velocity,
      )
    },
    onNoteOff: stopPlayVoice,
  })

  return {
    playback,
    playSession,
    midiInput,
    playNote(request: PlayNoteRequest) {
      if (learningMode !== 'play') {
        onInactivePlay()
        return
      }

      playSession.trigger(request)
      void playback.play(request.instrumentId, request.midi)
    },
    startPlayVoice,
    stopPlayVoice,
    dismissError: playback.dismissError,
    clear: playSession.clear,
    stopAll: playback.stopAll,
  }
}
