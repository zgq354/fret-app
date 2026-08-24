import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard'
import {
  GestureModeSwitch,
  type PlayGestureMode,
} from '../GestureModeSwitch/GestureModeSwitch'
import type { LearningMode } from '../../learning/playMode'
import {
  formatNoteLabel,
  midiToNote,
  type MiddleCStyle,
} from '../../modules/music/musicTheory'

interface KeyboardPanelProps {
  learningMode: LearningMode
  canInvitePlayMode: boolean
  activeMidi: number | null
  middleCStyle: MiddleCStyle
  displayMidis: readonly number[]
  soundingMidis: readonly number[]
  releasingMidis: readonly number[]
  showPitchClass: boolean
  gestureMode: PlayGestureMode
  onGestureModeChange: (mode: PlayGestureMode) => void
  onPlayKey: (midi: number) => void
  onStartKey: (pointerId: number, midi: number) => void
  onEndKey: (pointerId: number) => void
}

export function KeyboardPanel({
  learningMode,
  canInvitePlayMode,
  activeMidi,
  middleCStyle,
  displayMidis,
  soundingMidis,
  releasingMidis,
  showPitchClass,
  gestureMode,
  onGestureModeChange,
  onPlayKey,
  onStartKey,
  onEndKey,
}: KeyboardPanelProps) {
  return (
    <article className="visual-card piano-card">
      <div className="card-heading piano-heading">
        <div className="piano-title">
          <p className="card-kicker">Keyboard</p>
          <h2>钢琴键盘</h2>
        </div>
        {learningMode === 'play' ? (
          <GestureModeSwitch
            className="piano-gesture-control"
            label="键盘手势"
            mode={gestureMode}
            onChange={onGestureModeChange}
          />
        ) : null}
        <span className="card-note piano-range-note">
          {formatNoteLabel(midiToNote(36), middleCStyle)} —{' '}
          {formatNoteLabel(midiToNote(96), middleCStyle)}
        </span>
      </div>
      <div className="piano-scroll">
        <PianoKeyboard
          midi={activeMidi}
          middleCStyle={middleCStyle}
          midis={displayMidis}
          activeMidis={soundingMidis}
          releasingMidis={releasingMidis}
          showPitchClass={showPitchClass}
          playable={learningMode === 'play'}
          interactive={learningMode === 'play' || canInvitePlayMode}
          glissandoEnabled={
            learningMode === 'play' && gestureMode === 'glissando'
          }
          onPlayKey={onPlayKey}
          onStartKey={onStartKey}
          onEndKey={onEndKey}
        />
      </div>
    </article>
  )
}
