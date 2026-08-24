import { resolvePolyphonicFeedback } from '../../audio/polyphonicFeedback'
import type {
  PolyphonicAnalysisState,
  PolyphonicModelState,
} from '../../audio/polyphonicInferenceMessages'
import type { MicrophoneDetectionStatus } from '../../audio/microphoneInput'
import type { ChordReading } from '../../music/chordAnalysis'
import { getFretPosition, type FretPosition } from '../../music/fretboard'
import {
  createPitchReading,
  formatFrequency,
  formatNoteLabel,
  midiToFrequency,
  midiToNote,
  type MiddleCStyle,
  type PitchReading,
} from '../../music/musicTheory'
import type { ListenAnalysisMode } from '../../settings/appPreferences'
import {
  resolveLearningDisplay,
  type LearningMode,
} from './play-mode'
import type { PlayNoteRequest } from './play-session'

export interface LearningSurfaceDisplayInput {
  learningMode: LearningMode
  listenAnalysisMode: ListenAnalysisMode
  demoMidi: number
  microphoneStatus: MicrophoneDetectionStatus
  singlePitchReading: PitchReading | null
  polyphonicReading: ChordReading | null
  polyphonicModelState: PolyphonicModelState
  polyphonicAnalysisState: PolyphonicAnalysisState
  stickyPitch: boolean
  latestDetectedReading: PitchReading | null
  latestDetectedChord: ChordReading | null
  playFocusNote: PlayNoteRequest | null
  playDisplayNotes: readonly PlayNoteRequest[]
  playDisplayMidis: readonly number[]
  playSoundingMidis: readonly number[]
  playIsRecent: boolean
  middleCStyle: MiddleCStyle
}

export interface LearningSurfaceDisplay {
  activeReading: PitchReading | null
  activeMidi: number | null
  displayMidis: readonly number[]
  soundingMidis: readonly number[]
  playedPositions: readonly FretPosition[]
  visibleChordReading: ChordReading | null
  hasLiveChord: boolean
  polyphonicFeedback: ReturnType<typeof resolvePolyphonicFeedback>
  readingMeta: string | undefined
  sourceLabel: string
  noteSummary: string
}

export function resolveLearningSurfaceDisplay({
  learningMode,
  listenAnalysisMode,
  demoMidi,
  microphoneStatus,
  singlePitchReading,
  polyphonicReading,
  polyphonicModelState,
  polyphonicAnalysisState,
  stickyPitch,
  latestDetectedReading,
  latestDetectedChord,
  playFocusNote,
  playDisplayNotes,
  playDisplayMidis,
  playSoundingMidis,
  playIsRecent,
  middleCStyle,
}: LearningSurfaceDisplayInput): LearningSurfaceDisplay {
  const isListening =
    learningMode === 'listen' && microphoneStatus === 'listening'
  const isPolyphonicListening =
    isListening && listenAnalysisMode === 'polyphonic'
  const learningDisplay = resolveLearningDisplay({
    mode: learningMode,
    demoMidi,
    pitchStatus: microphoneStatus,
    pitchReading:
      listenAnalysisMode === 'single' ? singlePitchReading : null,
    stickyPitch,
    latestDetectedReading,
    lastPlayedNote: playFocusNote,
    middleCStyle,
  })
  const visibleChordReading = isPolyphonicListening
    ? polyphonicReading ?? (stickyPitch ? latestDetectedChord : null)
    : null
  const hasLiveChord = polyphonicReading !== null
  const polyphonicFeedback = resolvePolyphonicFeedback({
    modelState: polyphonicModelState,
    analysisState: polyphonicAnalysisState,
    visibleChord: visibleChordReading
      ? {
          chordLabel: visibleChordReading.chordLabel,
          noteCount: visibleChordReading.midis.length,
        }
      : null,
    hasLiveChord,
  })
  const activeReading = visibleChordReading
    ? createStandardPitchReading(visibleChordReading.focusMidi)
    : learningDisplay.reading
  const activeMidi = visibleChordReading
    ? visibleChordReading.focusMidi
    : learningDisplay.midi
  const readingMeta =
    learningMode === 'play'
      ? activeReading === null || activeMidi === null
        ? '等待弹奏'
        : formatFrequency(activeReading.frequency) + ' · MIDI ' + activeMidi
      : visibleChordReading
        ? formatFrequency(activeReading?.frequency ?? 0) + ' · 最低识别音'
        : undefined
  const displayMidis =
    learningMode === 'play'
      ? playDisplayMidis
      : visibleChordReading
        ? visibleChordReading.midis
        : activeMidi === null
          ? []
          : [activeMidi]
  const soundingMidis =
    learningMode === 'play'
      ? playSoundingMidis
      : visibleChordReading
        ? visibleChordReading.midis
        : activeMidi === null
          ? []
          : [activeMidi]
  const playedPositions = playDisplayNotes.flatMap((request) =>
    request.source === 'fretboard'
      ? [getFretPosition(request.stringNumber, request.fret)]
      : [],
  )

  return {
    activeReading,
    activeMidi,
    displayMidis,
    soundingMidis,
    playedPositions,
    visibleChordReading,
    hasLiveChord,
    polyphonicFeedback,
    readingMeta,
    sourceLabel: resolveSourceLabel({
      visibleChordReading,
      hasLiveChord,
      isPolyphonicListening,
      modelState: polyphonicModelState,
      analysisState: polyphonicAnalysisState,
      learningMode,
      playedNoteCount: playDisplayMidis.length,
      isRecentPlay: playIsRecent,
      fallback: learningDisplay.sourceLabel,
    }),
    noteSummary: formatNoteSummary(playDisplayMidis, middleCStyle),
  }
}

function formatNoteSummary(
  midis: readonly number[],
  middleCStyle: MiddleCStyle,
): string {
  if (midis.length === 0) {
    return '等待点击'
  }

  const visible = midis
    .slice(0, 4)
    .map((midi) => formatNoteLabel(midiToNote(midi), middleCStyle))
  const remaining = midis.length - visible.length
  return visible.join(' · ') + (remaining > 0 ? '  +' + remaining : '')
}

function createStandardPitchReading(midi: number): PitchReading {
  return createPitchReading(midiToFrequency(midi))
}

function resolveSourceLabel({
  visibleChordReading,
  hasLiveChord,
  isPolyphonicListening,
  modelState,
  analysisState,
  learningMode,
  playedNoteCount,
  isRecentPlay,
  fallback,
}: {
  visibleChordReading: ChordReading | null
  hasLiveChord: boolean
  isPolyphonicListening: boolean
  modelState: PolyphonicModelState
  analysisState: PolyphonicAnalysisState
  learningMode: LearningMode
  playedNoteCount: number
  isRecentPlay: boolean
  fallback: string
}): string {
  if (visibleChordReading) {
    return hasLiveChord
      ? '实时麦克风 · 候选 ' +
          (visibleChordReading.chordLabel ?? '多音') +
          ' · ' +
          visibleChordReading.midis.length +
          ' 音'
      : '实时麦克风 · 粘滞最后和声'
  }

  if (isPolyphonicListening) {
    if (modelState === 'loading') {
      return '实时麦克风 · 后台加载模型'
    }
    if (analysisState === 'analyzing') {
      return '实时麦克风 · 后台分析和声'
    }
    if (analysisState === 'no-result') {
      return '实时麦克风 · 本轮无结果'
    }
    return '实时麦克风 · 正在收集多音'
  }

  if (learningMode === 'play' && playedNoteCount > 0 && isRecentPlay) {
    return '最近弹奏 · ' + fallback
  }

  return fallback
}
