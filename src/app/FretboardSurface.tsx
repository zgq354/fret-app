import { FretboardSvg } from '../components/FretboardSvg/FretboardSvg'
import type { PlayGestureMode } from '../components/GestureModeSwitch/GestureModeSwitch'
import type { LearningMode } from '../learning/playMode'
import type { FretPosition } from '../music/fretboard'
import type { MiddleCStyle } from '../music/musicTheory'

interface FretboardSurfaceProps {
  learningMode: LearningMode
  canInvitePlayMode: boolean
  activeMidi: number | null
  middleCStyle: MiddleCStyle
  displayMidis: readonly number[]
  soundingMidis: readonly number[]
  releasingMidis: readonly number[]
  playedPositions: readonly FretPosition[]
  preferredString: number
  practiceStringMode: boolean
  showPitchClass: boolean
  gestureMode: PlayGestureMode
  onSelectString: (stringNumber: number) => void
  onPlayPosition: (position: FretPosition) => void
  onStartPosition: (pointerId: number, position: FretPosition) => void
  onEndPosition: (pointerId: number) => void
}

export function FretboardSurface({
  learningMode,
  canInvitePlayMode,
  activeMidi,
  middleCStyle,
  displayMidis,
  soundingMidis,
  releasingMidis,
  playedPositions,
  preferredString,
  practiceStringMode,
  showPitchClass,
  gestureMode,
  onSelectString,
  onPlayPosition,
  onStartPosition,
  onEndPosition,
}: FretboardSurfaceProps) {
  return (
    <div className="fretboard-scroll">
      <FretboardSvg
        midi={activeMidi}
        middleCStyle={middleCStyle}
        midis={displayMidis}
        activeMidis={soundingMidis}
        releasingMidis={releasingMidis}
        playedPositions={playedPositions}
        preferredString={preferredString}
        highlightPracticeString={practiceStringMode}
        showPitchClass={showPitchClass}
        playable={learningMode === 'play'}
        interactive={learningMode === 'play' || canInvitePlayMode}
        glissandoEnabled={
          learningMode === 'play' && gestureMode === 'glissando'
        }
        onSelectString={onSelectString}
        onPlayPosition={onPlayPosition}
        onStartPosition={onStartPosition}
        onEndPosition={onEndPosition}
      />
    </div>
  )
}
