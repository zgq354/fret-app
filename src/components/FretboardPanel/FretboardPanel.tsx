import { FretboardSurface } from '../FretboardSurface/FretboardSurface'
import {
  GestureModeSwitch,
  type PlayGestureMode,
} from '../GestureModeSwitch/GestureModeSwitch'
import type { LearningMode } from '../../learning/playMode'
import { STANDARD_TUNING, type FretPosition } from '../../modules/music/fretboard'
import {
  formatNoteLabel,
  midiToNote,
  type MiddleCStyle,
} from '../../modules/music/musicTheory'

interface FretboardPanelProps {
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
  onTogglePracticeStringMode: () => void
  onToggleShowPitchClass: () => void
  onGestureModeChange: (mode: PlayGestureMode) => void
  onPlayPosition: (position: FretPosition) => void
  onStartPosition: (pointerId: number, position: FretPosition) => void
  onEndPosition: (pointerId: number) => void
}

export function FretboardPanel({
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
  onTogglePracticeStringMode,
  onToggleShowPitchClass,
  onGestureModeChange,
  onPlayPosition,
  onStartPosition,
  onEndPosition,
}: FretboardPanelProps) {
  return (
    <section className="visual-card fretboard-card">
      <div
        className={
          'card-heading fretboard-heading' +
          (practiceStringMode ? ' has-practice-string' : '')
        }
      >
        <div className="fretboard-title">
          <p className="card-kicker">Fretboard</p>
          <h2>吉他指板</h2>
        </div>
        <div className="fretboard-controls">
          {practiceStringMode ? (
            <div className="fretboard-string-control">
              <span className="control-label">练习弦</span>
              <div className="string-buttons">
                {STANDARD_TUNING.map((guitarString) => {
                  const note = midiToNote(guitarString.openMidi)
                  const isSelected =
                    preferredString === guitarString.stringNumber

                  return (
                    <button
                      type="button"
                      key={guitarString.stringNumber}
                      className={
                        'string-button' +
                        (isSelected ? ' is-selected' : '')
                      }
                      aria-pressed={isSelected}
                      onClick={() =>
                        onSelectString(guitarString.stringNumber)
                      }
                    >
                      <strong>{guitarString.stringNumber}</strong>
                      <small>
                        {formatNoteLabel(note, middleCStyle)}
                      </small>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="fretboard-display-control">
            <span className="control-label">辅助显示</span>
            <div className="fretboard-toggle-list">
              <button
                type="button"
                className={
                  'toggle-button' +
                  (practiceStringMode ? ' is-selected' : '')
                }
                aria-label="练习弦模式"
                aria-pressed={practiceStringMode}
                onClick={onTogglePracticeStringMode}
              >
                <span className="toggle-indicator" />
                <span className="toggle-label-long" aria-hidden="true">
                  练习弦模式
                </span>
                <span className="toggle-label-short" aria-hidden="true">
                  练习弦
                </span>
              </button>
              <button
                type="button"
                className={
                  'toggle-button' +
                  (showPitchClass ? ' is-selected' : '')
                }
                aria-label="同音名其他八度"
                aria-pressed={showPitchClass}
                onClick={onToggleShowPitchClass}
              >
                <span className="toggle-indicator" />
                <span className="toggle-label-long" aria-hidden="true">
                  同音名其他八度
                </span>
                <span className="toggle-label-short" aria-hidden="true">
                  其他八度
                </span>
              </button>
            </div>
          </div>

          <div className="legend" aria-label="指板音高图例">
            {practiceStringMode ? (
              <>
                <span>
                  <i className="legend-primary" />
                  <span className="legend-label-long">
                    练习弦 · 当前音高
                  </span>
                  <span className="legend-label-short">练习弦音高</span>
                </span>
                <span>
                  <i className="legend-secondary" />
                  <span className="legend-label-long">
                    其他弦 · 同音高
                  </span>
                  <span className="legend-label-short">其他弦同音</span>
                </span>
              </>
            ) : (
              <span>
                <i className="legend-equal" />
                <span className="legend-label-long">
                  {learningMode === 'play'
                    ? '弹奏音 · 全部位置'
                    : '当前音高 · 全部位置'}
                </span>
                <span className="legend-label-short">
                  {learningMode === 'play' ? '弹奏音' : '当前音高'}
                </span>
              </span>
            )}
            {showPitchClass ? (
              <span>
                <i className="legend-octave" />
                <span className="legend-label-long">
                  同音名 · 其他八度
                </span>
                <span className="legend-label-short">其他八度</span>
              </span>
            ) : null}
          </div>

          {learningMode === 'play' ? (
            <GestureModeSwitch
              className="fretboard-gesture-control"
              label="指板手势"
              mode={gestureMode}
              onChange={onGestureModeChange}
            />
          ) : null}
        </div>
      </div>
      <FretboardSurface
        learningMode={learningMode}
        canInvitePlayMode={canInvitePlayMode}
        activeMidi={activeMidi}
        middleCStyle={middleCStyle}
        displayMidis={displayMidis}
        soundingMidis={soundingMidis}
        releasingMidis={releasingMidis}
        playedPositions={playedPositions}
        preferredString={preferredString}
        practiceStringMode={practiceStringMode}
        showPitchClass={showPitchClass}
        gestureMode={gestureMode}
        onSelectString={onSelectString}
        onPlayPosition={onPlayPosition}
        onStartPosition={onStartPosition}
        onEndPosition={onEndPosition}
      />
    </section>
  )
}
