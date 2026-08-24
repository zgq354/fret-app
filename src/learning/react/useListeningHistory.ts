import { useEffect, useState } from 'react'
import type { ChordReading } from '../../modules/music/chordAnalysis'
import type { PitchReading } from '../../modules/music/musicTheory'
import type { ListenAnalysisMode } from '../listenAnalysisMode'

export interface ListeningHistory {
  latestDetectedReading: PitchReading | null
  latestDetectedChord: ChordReading | null
  clear: () => void
}

export function useListeningHistory({
  isListening,
  mode,
  pitchReading,
  chordReading,
}: {
  isListening: boolean
  mode: ListenAnalysisMode
  pitchReading: PitchReading | null
  chordReading: ChordReading | null
}): ListeningHistory {
  const [latestDetectedReading, setLatestDetectedReading] =
    useState<PitchReading | null>(null)
  const [latestDetectedChord, setLatestDetectedChord] =
    useState<ChordReading | null>(null)

  useEffect(() => {
    if (isListening && mode === 'single' && pitchReading) {
      setLatestDetectedReading(pitchReading)
    }
  }, [isListening, mode, pitchReading])

  useEffect(() => {
    if (isListening && mode === 'polyphonic' && chordReading) {
      setLatestDetectedChord(chordReading)
    }
  }, [chordReading, isListening, mode])

  return {
    latestDetectedReading,
    latestDetectedChord,
    clear() {
      setLatestDetectedReading(null)
      setLatestDetectedChord(null)
    },
  }
}
