import { MidiInputControl } from '../MidiInputControl/MidiInputControl'
import { PitchMeter } from '../PitchMeter/PitchMeter'
import type { PolyphonicFeedback } from '../../modules/audio/polyphonicFeedback'
import type { PolyphonicAnalysisState } from '../../modules/audio/polyphonicInferenceMessages'
import type { ChordReading } from '../../modules/music/chordAnalysis'
import {
  formatNoteLabel,
  midiToFrequency,
  midiToNote,
  type MiddleCStyle,
  type PitchReading,
} from '../../modules/music/musicTheory'
import type { MidiInputState } from '../../modules/midi/react/useMidiInput'
import type { InstrumentId } from '../../modules/playback/instrument'
import type { LearningMode } from '../../learning/playMode'
import type { ListenAnalysisMode } from '../../learning/listenAnalysisMode'

interface LearningPanelProps {
  learningMode: LearningMode
  listenAnalysisMode: ListenAnalysisMode
  isListening: boolean
  microphoneRequesting: boolean
  activeReading: PitchReading | null
  activeMidi: number | null
  middleCStyle: MiddleCStyle
  sourceLabel: string
  readingMeta: string | undefined
  play: {
    displayMidis: readonly number[]
    noteSummary: string
    isActive: boolean
    isTransient: boolean
    isReleasing: boolean
    isRecent: boolean
    sticky: boolean
    onToggleSticky: () => void
  }
  polyphonic: {
    feedback: PolyphonicFeedback
    inputLevel: number
    analysisState: PolyphonicAnalysisState
    visibleChordReading: ChordReading | null
    hasLiveChord: boolean
  }
  stickyPitch: boolean
  demoMidi: number
  minDemoMidi: number
  maxDemoMidi: number
  midi: MidiInputState
  midiInstrumentId: InstrumentId
  onSelectLearningMode: (mode: LearningMode) => void
  onSelectListenAnalysisMode: (mode: ListenAnalysisMode) => void
  onToggleMicrophone: () => void
  onMoveDemoNote: (semitones: number) => void
  onToggleStickyPitch: () => void
  onMidiConnect: () => void
  onMidiInstrumentChange: (instrumentId: InstrumentId) => void
}

export function LearningPanel({
  learningMode,
  listenAnalysisMode,
  isListening,
  microphoneRequesting,
  activeReading,
  activeMidi,
  middleCStyle,
  sourceLabel,
  readingMeta,
  play,
  polyphonic,
  stickyPitch,
  demoMidi,
  minDemoMidi,
  maxDemoMidi,
  midi,
  midiInstrumentId,
  onSelectLearningMode,
  onSelectListenAnalysisMode,
  onToggleMicrophone,
  onMoveDemoNote,
  onToggleStickyPitch,
  onMidiConnect,
  onMidiInstrumentChange,
}: LearningPanelProps) {
  return (
    <section className="top-grid">
      <div className="intro">
        <p className="eyebrow">声音 → 乐理 → 位置</p>
        <h1>识别音符所在位置</h1>
        <p className="intro-copy">
          弹一个音或一组和声；识别结果会同时落到指板、键盘和五线谱上。
        </p>
      </div>
      <PitchMeter
        reading={activeReading}
        middleCStyle={middleCStyle}
        sourceLabel={sourceLabel}
        readingMeta={readingMeta}
        meterContent={
          learningMode === 'play' ? (
            <div className="polyphonic-panel" aria-live="polite">
              <span className="polyphonic-label">
                {play.displayMidis.length === 0
                  ? '弹奏音'
                  : play.isActive
                    ? '弹奏中 · ' + play.displayMidis.length + ' 音'
                    : play.isTransient
                      ? '弹奏音 · ' + play.displayMidis.length + ' 音'
                      : play.isReleasing
                        ? '尾音 · ' + play.displayMidis.length + ' 音'
                        : play.isRecent
                          ? '最近弹奏 · ' + play.displayMidis.length + ' 音'
                          : '弹奏音 · ' + play.displayMidis.length + ' 音'}
              </span>
              <strong>{play.noteSummary}</strong>
              <span className="polyphonic-hint">
                {play.isActive
                  ? '多指可分别滑动与释放'
                  : play.isTransient
                    ? '点击后短暂显示当前音'
                    : play.isReleasing
                      ? '释放后自然衰减中'
                      : play.isRecent
                        ? '粘滞已保留最近弹奏'
                        : '切到滑奏可多指按住发声'}
              </span>
            </div>
          ) : listenAnalysisMode === 'polyphonic' && isListening ? (
            <div
              className={
                'polyphonic-panel is-' + polyphonic.feedback.appearance
              }
              aria-live="polite"
              aria-busy={polyphonic.feedback.isBusy}
            >
              <div className="polyphonic-status-row">
                <span className="polyphonic-label">
                  {polyphonic.feedback.label}
                </span>
                <span
                  className="polyphonic-input-level"
                  role="meter"
                  aria-label="麦克风输入电平"
                  aria-live="off"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(polyphonic.inputLevel * 100)}
                >
                  <span
                    style={{
                      width: Math.round(polyphonic.inputLevel * 100) + '%',
                    }}
                  />
                </span>
              </div>
              <strong>{polyphonic.feedback.title}</strong>
              <span className="polyphonic-hint">
                {polyphonic.visibleChordReading &&
                polyphonic.hasLiveChord &&
                polyphonic.analysisState === 'result'
                  ? formatNoteFrequencySummary(
                      polyphonic.visibleChordReading.midis,
                      middleCStyle,
                    )
                  : polyphonic.feedback.hint}
              </span>
            </div>
          ) : undefined
        }
        readingControl={
          learningMode === 'play' ? (
            <div className="pitch-control-group pitch-demo-control">
              <span className="control-label">弹奏音</span>
              <div className="pitch-demo-row">
                <output className="play-note-output" aria-live="polite">
                  {activeMidi === null
                    ? '等待点击'
                    : formatNoteLabel(midiToNote(activeMidi), middleCStyle)}
                </output>
                <button
                  type="button"
                  className={
                    'sticky-mode-button' +
                    (play.sticky ? ' is-selected' : '')
                  }
                  aria-pressed={play.sticky}
                  title="释放后保留最近弹奏"
                  onClick={play.onToggleSticky}
                >
                  <span aria-hidden="true" />
                  粘滞
                </button>
              </div>
            </div>
          ) : listenAnalysisMode === 'polyphonic' && isListening ? (
            <div className="pitch-control-group pitch-demo-control">
              <div className="pitch-demo-heading">
                <span className="control-label">识别和声</span>
              </div>
              <div className="pitch-demo-row">
                <output className="play-note-output" aria-live="polite">
                  {polyphonic.feedback.shortLabel}
                </output>
                <button
                  type="button"
                  className={
                    'sticky-mode-button' +
                    (stickyPitch ? ' is-selected' : '')
                  }
                  aria-pressed={stickyPitch}
                  title="无新和声时保留最后识别结果"
                  onClick={onToggleStickyPitch}
                >
                  <span aria-hidden="true" />
                  粘滞
                </button>
              </div>
            </div>
          ) : (
            <div className="pitch-control-group pitch-demo-control">
              <div className="pitch-demo-heading">
                <span className="control-label">
                  {isListening ? '识别音' : '演示音'}
                </span>
              </div>
              <div className="pitch-demo-row">
                <div className="stepper">
                  <button
                    type="button"
                    aria-label="降低半音"
                    disabled={isListening || demoMidi <= minDemoMidi}
                    onClick={() => onMoveDemoNote(-1)}
                  >
                    −
                  </button>
                  <output aria-live="polite">
                    {activeMidi === null
                      ? '—'
                      : formatNoteLabel(midiToNote(activeMidi), middleCStyle)}
                  </output>
                  <button
                    type="button"
                    aria-label="升高半音"
                    disabled={isListening || demoMidi >= maxDemoMidi}
                    onClick={() => onMoveDemoNote(1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className={
                    'sticky-mode-button' +
                    (stickyPitch ? ' is-selected' : '')
                  }
                  aria-pressed={stickyPitch}
                  title="监听无新音高时保留最后识别音"
                  onClick={onToggleStickyPitch}
                >
                  <span aria-hidden="true" />
                  粘滞
                </button>
              </div>
            </div>
          )
        }
        controls={
          <div className="pitch-controls" aria-label="音高输入">
            <div className="pitch-control-group input-mode-control">
              <span className="control-label">输入模式</span>
              <div className="input-mode-switch" aria-label="输入模式">
                <button
                  type="button"
                  className={learningMode === 'listen' ? 'is-selected' : ''}
                  aria-pressed={learningMode === 'listen'}
                  onClick={() => onSelectLearningMode('listen')}
                >
                  监听
                </button>
                <button
                  type="button"
                  className={learningMode === 'play' ? 'is-selected' : ''}
                  aria-pressed={learningMode === 'play'}
                  onClick={() => onSelectLearningMode('play')}
                >
                  弹奏
                </button>
              </div>
            </div>
            {learningMode === 'listen' ? (
              <div className="pitch-control-group microphone-control">
                <div className="microphone-heading">
                  <span className="control-label">实时麦克风</span>
                  <div
                    className="compact-switch analysis-mode-switch"
                    aria-label="识别模式"
                  >
                    <button
                      type="button"
                      className={
                        listenAnalysisMode === 'single' ? 'is-selected' : ''
                      }
                      aria-pressed={listenAnalysisMode === 'single'}
                      onClick={() => onSelectListenAnalysisMode('single')}
                    >
                      单音
                    </button>
                    <button
                      type="button"
                      className={
                        listenAnalysisMode === 'polyphonic'
                          ? 'is-selected'
                          : ''
                      }
                      aria-pressed={listenAnalysisMode === 'polyphonic'}
                      onClick={() => onSelectListenAnalysisMode('polyphonic')}
                    >
                      多音
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={'mic-button' + (isListening ? ' is-live' : '')}
                  disabled={microphoneRequesting}
                  onClick={onToggleMicrophone}
                >
                  <span className="mic-icon" aria-hidden="true">
                    {isListening ? '■' : '●'}
                  </span>
                  {microphoneRequesting
                    ? '正在请求权限'
                    : isListening
                      ? '停止麦克风'
                      : '启用麦克风'}
                </button>
              </div>
            ) : (
              <MidiInputControl
                midi={midi}
                instrumentId={midiInstrumentId}
                onConnect={onMidiConnect}
                onSelectInput={midi.selectInput}
                onInstrumentChange={onMidiInstrumentChange}
              />
            )}
          </div>
        }
      />
    </section>
  )
}

function formatNoteFrequencySummary(
  midis: readonly number[],
  middleCStyle: MiddleCStyle,
): string {
  return midis
    .slice(0, 4)
    .map(
      (midi) =>
        formatNoteLabel(midiToNote(midi), middleCStyle) +
        ' ' +
        midiToFrequency(midi).toFixed(1) +
        'Hz',
    )
    .join(' · ')
}
