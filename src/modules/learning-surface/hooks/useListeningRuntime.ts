import type { AudioSettings } from '../../audio/audioSettings'
import { usePitchDetection } from '../../audio/react/usePitchDetection'
import { usePolyphonicPitchDetection } from '../../audio/react/usePolyphonicPitchDetection'
import type { ListenAnalysisMode } from '../../settings/appPreferences'
import type { LearningMode } from '../model/play-mode'
import { useListeningHistory } from './useListeningHistory'

export function useListeningRuntime({
  audioSettings,
  learningMode,
  listenAnalysisMode,
}: {
  audioSettings: AudioSettings
  learningMode: LearningMode
  listenAnalysisMode: ListenAnalysisMode
}) {
  const singlePitchDetection = usePitchDetection(audioSettings)
  const polyphonicPitchDetection =
    usePolyphonicPitchDetection(audioSettings)
  const microphoneDetection =
    listenAnalysisMode === 'single'
      ? singlePitchDetection
      : polyphonicPitchDetection
  const isListening =
    learningMode === 'listen' && microphoneDetection.status === 'listening'
  const {
    latestDetectedReading,
    latestDetectedChord,
    clear: clearHistory,
  } = useListeningHistory({
    isListening,
    mode: listenAnalysisMode,
    pitchReading: singlePitchDetection.reading,
    chordReading: polyphonicPitchDetection.reading,
  })

  return {
    singlePitchDetection,
    polyphonicPitchDetection,
    microphoneDetection,
    isListening,
    latestDetectedReading,
    latestDetectedChord,
    clearHistory,
    enableMicrophone() {
      clearHistory()
      void microphoneDetection.start()
    },
    dismissErrors() {
      singlePitchDetection.dismissError()
      polyphonicPitchDetection.dismissError()
    },
    stop() {
      singlePitchDetection.stop()
      polyphonicPitchDetection.dispose()
      clearHistory()
    },
  }
}
