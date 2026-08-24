import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
} from './audio/audioSettings'
import { usePitchDetection } from './audio/usePitchDetection'
import { usePolyphonicPitchDetection } from './audio/usePolyphonicPitchDetection'
import { resolvePolyphonicFeedback } from './audio/polyphonicFeedback'
import type {
  PolyphonicAnalysisState,
  PolyphonicModelState,
} from './audio/polyphonicInferenceMessages'
import { EntryDialog } from './components/EntryDialog/EntryDialog'
import { FretboardSvg } from './components/FretboardSvg/FretboardSvg'
import {
  GestureModeSwitch,
  type PlayGestureMode,
} from './components/GestureModeSwitch/GestureModeSwitch'
import { MidiInputControl } from './components/MidiInputControl/MidiInputControl'
import { PianoKeyboard } from './components/PianoKeyboard/PianoKeyboard'
import { PitchMeter } from './components/PitchMeter/PitchMeter'
import { TechnicalSettingsDialog } from './components/TechnicalSettings/TechnicalSettingsDialog'
import {
  StaffView,
  type StaffNotationMode,
} from './components/StaffView/StaffView'
import {
  canPromptPlayMode,
  resolveLearningDisplay,
  type LearningMode,
} from './learning/playMode'
import {
  type PlayNoteRequest,
} from './learning/playSession'
import { usePlaySession } from './learning/usePlaySession'
import { getFretPosition, STANDARD_TUNING } from './music/fretboard'
import type { ChordReading } from './music/chordAnalysis'
import {
  createPitchReading,
  formatNoteLabel,
  formatFrequency,
  midiToNote,
  midiToFrequency,
  type MiddleCStyle,
  type PitchReading,
} from './music/musicTheory'
import { useMidiInput } from './midi/useMidiInput'
import {
  VOICE_RELEASE_MS,
  type InstrumentId,
} from './playback/instrument'
import { usePlayback } from './playback/usePlayback'
import {
  readFwaDebugState,
  setFwaDebugEnabled,
  subscribeFwaDebugState,
} from './platform/fwa-debug-state'
import {
  applyFwaUpdate,
  readFwaUpdateState,
  subscribeFwaUpdateState,
} from './platform/fwa-update'
import {
  DefaultDisplaySettings,
  loadDisplaySettings,
  normalizeDisplaySettings,
  saveDisplaySettings,
} from './settings/displaySettings'

const MIN_DEMO_MIDI = 40
const MAX_DEMO_MIDI = 88
const PRACTICE_MODE_STORAGE_KEY = 'guitar-note-map.practice-mode.v1'
const MIDI_INSTRUMENT_STORAGE_KEY = 'guitar-note-map.midi-instrument.v1'
const LISTEN_ANALYSIS_MODE_STORAGE_KEY =
  'guitar-note-map.listen-analysis-mode.v1'
const RELEASE_STYLE = {
  '--voice-release-duration': VOICE_RELEASE_MS + 'ms',
} as CSSProperties
type ListenAnalysisMode = 'single' | 'polyphonic'

function App() {
  const [preferredString, setPreferredString] = useState(2)
  const [demoMidi, setDemoMidi] = useState(64)
  const [showPitchClass, setShowPitchClass] = useState(false)
  const [practiceStringMode, setPracticeStringMode] = useState(
    () => loadPersistentBoolean(PRACTICE_MODE_STORAGE_KEY, false),
  )
  const [audioSettings, setAudioSettings] = useState(loadAudioSettings)
  const [displaySettings, setDisplaySettings] = useState(loadDisplaySettings)
  const [fwaDebugState, setFwaDebugState] = useState(readFwaDebugState)
  const [fwaUpdateState, setFwaUpdateState] = useState(readFwaUpdateState)
  const [stickyPitch, setStickyPitch] = useState(false)
  const [midiInstrumentId, setMidiInstrumentId] = useState<InstrumentId>(
    loadMidiInstrument,
  )
  const [latestDetectedReading, setLatestDetectedReading] =
    useState<PitchReading | null>(null)
  const [latestDetectedChord, setLatestDetectedChord] =
    useState<ChordReading | null>(null)
  const [listenAnalysisMode, setListenAnalysisMode] =
    useState<ListenAnalysisMode>(loadListenAnalysisMode)
  const [learningMode, setLearningMode] = useState<LearningMode>('listen')
  const [playModeInviteOpen, setPlayModeInviteOpen] = useState(false)
  const [technicalSettingsOpen, setTechnicalSettingsOpen] = useState(false)
  const [fretboardGestureMode, setFretboardGestureMode] =
    useState<PlayGestureMode>(initialPlayGestureMode)
  const [pianoGestureMode, setPianoGestureMode] =
    useState<PlayGestureMode>(initialPlayGestureMode)
  const [notationMode, setNotationMode] =
    useState<StaffNotationMode>('guitar')
  const technicalSettingsTriggerRef = useRef<HTMLButtonElement>(null)
  const singlePitchDetection = usePitchDetection(audioSettings)
  const polyphonicPitchDetection =
    usePolyphonicPitchDetection(audioSettings)
  const microphoneDetection =
    listenAnalysisMode === 'single'
      ? singlePitchDetection
      : polyphonicPitchDetection
  const playback = usePlayback()
  const playSession = usePlaySession()
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
    onNoteOff: (voiceId) => stopPlayVoice(voiceId),
  })
  const isListening =
    learningMode === 'listen' && microphoneDetection.status === 'listening'
  const isPolyphonicListening =
    isListening && listenAnalysisMode === 'polyphonic'
  const learningDisplay = useMemo(
    () =>
      resolveLearningDisplay({
        mode: learningMode,
        demoMidi,
        pitchStatus: microphoneDetection.status,
        pitchReading:
          listenAnalysisMode === 'single'
            ? singlePitchDetection.reading
            : null,
        stickyPitch,
        latestDetectedReading,
        lastPlayedNote: playSession.focusNote,
        middleCStyle: displaySettings.middleCStyle,
      }),
    [
      demoMidi,
      displaySettings.middleCStyle,
      latestDetectedReading,
      learningMode,
      microphoneDetection.status,
      singlePitchDetection.reading,
      stickyPitch,
      playSession.focusNote,
      listenAnalysisMode,
    ],
  )
  const visibleChordReading =
    isPolyphonicListening
      ? polyphonicPitchDetection.reading ??
        (stickyPitch ? latestDetectedChord : null)
      : null
  const hasLiveChord = polyphonicPitchDetection.reading !== null
  const polyphonicFeedback = resolvePolyphonicFeedback({
    modelState: polyphonicPitchDetection.modelState,
    analysisState: polyphonicPitchDetection.analysisState,
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
      ? playSession.displayMidis
      : visibleChordReading
        ? visibleChordReading.midis
        : activeMidi === null
          ? []
          : [activeMidi]
  const soundingMidis =
    learningMode === 'play'
      ? playSession.soundingMidis
      : visibleChordReading
        ? visibleChordReading.midis
        : activeMidi === null
          ? []
          : [activeMidi]
  const playedPositions = playSession.displayNotes.flatMap((request) =>
    request.source === 'fretboard'
      ? [getFretPosition(request.stringNumber, request.fret)]
      : [],
  )
  const sourceLabel = resolveSourceLabel({
    visibleChordReading,
    hasLiveChord,
    isPolyphonicListening,
    modelState: polyphonicPitchDetection.modelState,
    analysisState: polyphonicPitchDetection.analysisState,
    learningMode,
    playedNoteCount: playSession.displayMidis.length,
    isRecentPlay: playSession.isRecent,
    fallback: learningDisplay.sourceLabel,
  })
  const noteSummary = formatNoteSummary(
    playSession.displayMidis,
    displaySettings.middleCStyle,
  )
  const audioErrorMessage =
    learningMode === 'play'
      ? playback.errorMessage
      : microphoneDetection.errorMessage
  const canInvitePlayMode = canPromptPlayMode(
    learningMode,
    microphoneDetection.status,
  )

  useEffect(() => {
    if (isListening && singlePitchDetection.reading) {
      setLatestDetectedReading(singlePitchDetection.reading)
    }
  }, [isListening, singlePitchDetection.reading])

  useEffect(() => {
    if (isListening && polyphonicPitchDetection.reading) {
      setLatestDetectedChord(polyphonicPitchDetection.reading)
    }
  }, [isListening, polyphonicPitchDetection.reading])

  useEffect(() => {
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  useEffect(() => {
    saveDisplaySettings(displaySettings)
  }, [displaySettings])

  useEffect(
    () => subscribeFwaUpdateState(setFwaUpdateState),
    [],
  )

  useEffect(
    () => subscribeFwaDebugState(setFwaDebugState),
    [],
  )

  useEffect(() => {
    savePersistentBoolean(
      PRACTICE_MODE_STORAGE_KEY,
      practiceStringMode,
    )
  }, [practiceStringMode])

  useEffect(() => {
    saveMidiInstrument(midiInstrumentId)
  }, [midiInstrumentId])

  useEffect(() => {
    saveListenAnalysisMode(listenAnalysisMode)
  }, [listenAnalysisMode])

  const updateAudioSettings = (
    patch: Partial<typeof audioSettings>,
  ) => {
    setAudioSettings((current) =>
      normalizeAudioSettings({ ...current, ...patch }),
    )
  }

  const updateDisplaySettings = (
    patch: Partial<typeof displaySettings>,
  ) => {
    setDisplaySettings((current) =>
      normalizeDisplaySettings({ ...current, ...patch }),
    )
  }

  const updateFwaDebugEnabled = (enabled: boolean) => {
    setFwaDebugEnabled(enabled)
  }

  const moveDemoNote = (semitones: number) => {
    setDemoMidi((current) =>
      Math.min(MAX_DEMO_MIDI, Math.max(MIN_DEMO_MIDI, current + semitones)),
    )
  }

  const selectLearningMode = (mode: LearningMode) => {
    if (mode === learningMode) {
      return
    }

    singlePitchDetection.dismissError()
    polyphonicPitchDetection.dismissError()
    playback.dismissError()
    playSession.clear()

    if (mode === 'play') {
      singlePitchDetection.stop()
      polyphonicPitchDetection.dispose()
      setLatestDetectedReading(null)
      setLatestDetectedChord(null)
    } else {
      playback.stopAll()
    }

    setLearningMode(mode)
  }

  const selectListenAnalysisMode = (mode: ListenAnalysisMode) => {
    if (mode === listenAnalysisMode) {
      return
    }

    singlePitchDetection.stop()
    polyphonicPitchDetection.dispose()
    setLatestDetectedReading(null)
    setLatestDetectedChord(null)
    setListenAnalysisMode(mode)
  }

  const enableMicrophone = () => {
    setLatestDetectedReading(null)
    setLatestDetectedChord(null)
    void microphoneDetection.start()
  }

  const invitePlayMode = () => {
    if (!canInvitePlayMode) {
      return
    }
    setPlayModeInviteOpen(true)
  }

  const switchToPlay = () => {
    if (!playModeInviteOpen) {
      return
    }

    setPlayModeInviteOpen(false)
    selectLearningMode('play')
  }

  const playNote = (request: PlayNoteRequest) => {
    if (learningMode !== 'play') {
      invitePlayMode()
      return
    }

    playSession.trigger(request)
    void playback.play(request.instrumentId, request.midi)
  }

  const startPlayVoice = (
    voiceId: string,
    request: PlayNoteRequest,
    velocity = 1,
  ) => {
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

  const stopPlayVoice = (voiceId: string) => {
    playSession.noteOff(voiceId)
    playback.stopVoice(voiceId)
  }

  return (
    <div
      className={
        'app-shell' +
        (learningMode === 'play' && playSession.sticky
          ? ' has-sticky-playback'
          : '')
      }
      style={RELEASE_STYLE}
    >
      {playModeInviteOpen ? (
        <EntryDialog
          isListening={isListening}
          onDismiss={() => setPlayModeInviteOpen(false)}
          onSwitchToPlay={switchToPlay}
        />
      ) : null}
      <header className="site-header">
        <a className="brand" href="/">
          <img
            className="brand-mark"
            src="/favicon.svg"
            width="42"
            height="42"
            alt=""
            aria-hidden="true"
          />
          <span>
            <strong>弦音地图</strong>
            <small>Fret &amp; Key</small>
          </span>
        </a>
        <div className="header-actions">
          <div className="privacy-chip">
            <span className="privacy-dot" />
            音频只在浏览器内处理
          </div>
          <div className="technical-settings">
            <button
              ref={technicalSettingsTriggerRef}
              type="button"
              className="technical-settings-trigger"
              aria-label="设置"
              title="设置"
              aria-haspopup="dialog"
              aria-expanded={technicalSettingsOpen}
              onClick={() => setTechnicalSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {fwaUpdateState.updateAvailable ? (
                <span className="settings-update-dot" aria-hidden="true" />
              ) : null}
            </button>
            {technicalSettingsOpen ? (
              <TechnicalSettingsDialog
                anchorRef={technicalSettingsTriggerRef}
                settings={audioSettings}
                displaySettings={displaySettings}
                fwaDebugAvailable={fwaDebugState.available}
                fwaDebugEnabled={fwaDebugState.enabled}
                fwaUpdate={fwaUpdateState}
                trackSettings={microphoneDetection.trackSettings}
                analysisSampleRate={microphoneDetection.analysisSampleRate}
                polyphonicRuntime={{
                  modelState: polyphonicPitchDetection.modelState,
                  workerBackend: polyphonicPitchDetection.workerBackend,
                  modelLoadMs: polyphonicPitchDetection.modelLoadMs,
                  inferenceMs: polyphonicPitchDetection.inferenceMs,
                }}
                onChange={updateAudioSettings}
                onDisplayChange={updateDisplaySettings}
                onFwaDebugChange={updateFwaDebugEnabled}
                onApplyFwaUpdate={applyFwaUpdate}
                onReset={() => {
                  setAudioSettings({ ...DEFAULT_AUDIO_SETTINGS })
                  setDisplaySettings({ ...DefaultDisplaySettings })
                }}
                onDismiss={() => {
                  setTechnicalSettingsOpen(false)
                  requestAnimationFrame(() => {
                    technicalSettingsTriggerRef.current?.focus()
                  })
                }}
              />
            ) : null}
          </div>
        </div>
      </header>

      <main className={practiceStringMode ? 'has-practice-string' : undefined}>
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
            middleCStyle={displaySettings.middleCStyle}
            sourceLabel={sourceLabel}
            readingMeta={readingMeta}
            meterContent={
              learningMode === 'play' ? (
                <div className="polyphonic-panel" aria-live="polite">
                  <span className="polyphonic-label">
                    {playSession.displayMidis.length === 0
                      ? '弹奏音'
                      : playSession.isActive
                        ? '弹奏中 · ' + playSession.displayMidis.length + ' 音'
                        : playSession.isTransient
                          ? '弹奏音 · ' + playSession.displayMidis.length + ' 音'
                          : playSession.isReleasing
                            ? '尾音 · ' + playSession.displayMidis.length + ' 音'
                            : playSession.isRecent
                              ? '最近弹奏 · ' + playSession.displayMidis.length + ' 音'
                              : '弹奏音 · ' + playSession.displayMidis.length + ' 音'}
                  </span>
                  <strong>{noteSummary}</strong>
                  <span className="polyphonic-hint">
                    {playSession.isActive
                      ? '多指可分别滑动与释放'
                      : playSession.isTransient
                        ? '点击后短暂显示当前音'
                        : playSession.isReleasing
                          ? '释放后自然衰减中'
                          : playSession.isRecent
                            ? '粘滞已保留最近弹奏'
                            : '切到滑奏可多指按住发声'}
                  </span>
                </div>
              ) : listenAnalysisMode === 'polyphonic' && isListening ? (
                <div
                  className={
                    'polyphonic-panel is-' +
                    polyphonicFeedback.appearance
                  }
                  aria-live="polite"
                  aria-busy={polyphonicFeedback.isBusy}
                >
                  <div className="polyphonic-status-row">
                    <span className="polyphonic-label">
                      {polyphonicFeedback.label}
                    </span>
                    <span
                      className="polyphonic-input-level"
                      role="meter"
                      aria-label="麦克风输入电平"
                      aria-live="off"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(
                        polyphonicPitchDetection.inputLevel * 100,
                      )}
                    >
                      <span
                        style={{
                          width:
                            Math.round(
                              polyphonicPitchDetection.inputLevel * 100,
                            ) + '%',
                        }}
                      />
                    </span>
                  </div>
                  <strong>{polyphonicFeedback.title}</strong>
                  <span className="polyphonic-hint">
                    {visibleChordReading &&
                    hasLiveChord &&
                    polyphonicPitchDetection.analysisState === 'result'
                      ? formatNoteFrequencySummary(
                          visibleChordReading.midis,
                          displaySettings.middleCStyle,
                        )
                      : polyphonicFeedback.hint}
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
                        : formatNoteLabel(
                            midiToNote(activeMidi),
                            displaySettings.middleCStyle,
                          )}
                    </output>
                    <button
                      type="button"
                      className={
                        'sticky-mode-button' +
                        (playSession.sticky ? ' is-selected' : '')
                      }
                      aria-pressed={playSession.sticky}
                      title="释放后保留最近弹奏"
                      onClick={() =>
                        playSession.setSticky((current) => !current)
                      }
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
                      {polyphonicFeedback.shortLabel}
                    </output>
                    <button
                      type="button"
                      className={
                        'sticky-mode-button' +
                        (stickyPitch ? ' is-selected' : '')
                      }
                      aria-pressed={stickyPitch}
                      title="无新和声时保留最后识别结果"
                      onClick={() => setStickyPitch((current) => !current)}
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
                        disabled={isListening || demoMidi <= MIN_DEMO_MIDI}
                        onClick={() => moveDemoNote(-1)}
                      >
                        −
                      </button>
                      <output aria-live="polite">
                        {activeMidi === null
                          ? '—'
                          : formatNoteLabel(
                              midiToNote(activeMidi),
                              displaySettings.middleCStyle,
                            )}
                      </output>
                      <button
                        type="button"
                        aria-label="升高半音"
                        disabled={isListening || demoMidi >= MAX_DEMO_MIDI}
                        onClick={() => moveDemoNote(1)}
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
                      onClick={() => setStickyPitch((current) => !current)}
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
                      className={
                        learningMode === 'listen' ? 'is-selected' : ''
                      }
                      aria-pressed={learningMode === 'listen'}
                      onClick={() => selectLearningMode('listen')}
                    >
                      监听
                    </button>
                    <button
                      type="button"
                      className={learningMode === 'play' ? 'is-selected' : ''}
                      aria-pressed={learningMode === 'play'}
                      onClick={() => selectLearningMode('play')}
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
                            listenAnalysisMode === 'single'
                              ? 'is-selected'
                              : ''
                          }
                          aria-pressed={listenAnalysisMode === 'single'}
                          onClick={() => selectListenAnalysisMode('single')}
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
                          onClick={() =>
                            selectListenAnalysisMode('polyphonic')
                          }
                        >
                          多音
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={
                        'mic-button' + (isListening ? ' is-live' : '')
                      }
                      disabled={microphoneDetection.status === 'requesting'}
                      onClick={() => {
                        if (isListening) {
                          microphoneDetection.stop()
                        } else {
                          enableMicrophone()
                        }
                      }}
                    >
                      <span className="mic-icon" aria-hidden="true">
                        {isListening ? '■' : '●'}
                      </span>
                      {microphoneDetection.status === 'requesting'
                        ? '正在请求权限'
                        : isListening
                          ? '停止麦克风'
                          : '启用麦克风'}
                    </button>
                  </div>
                ) : (
                  <MidiInputControl
                    midi={midiInput}
                    instrumentId={midiInstrumentId}
                    onConnect={() => {
                      void playback.prepare()
                      void midiInput.connect()
                    }}
                    onSelectInput={midiInput.selectInput}
                    onInstrumentChange={setMidiInstrumentId}
                  />
                )}
              </div>
            }
          />
        </section>

        {audioErrorMessage ? (
          <div className="error-banner" role="alert">
            <span>{audioErrorMessage}</span>
            <button
              type="button"
              aria-label="关闭错误提示"
              title="关闭"
              onClick={
                learningMode === 'play'
                  ? playback.dismissError
                  : microphoneDetection.dismissError
              }
            >
              ×
            </button>
          </div>
        ) : null}

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
                            setPreferredString(guitarString.stringNumber)
                          }
                        >
                          <strong>{guitarString.stringNumber}</strong>
                          <small>
                            {formatNoteLabel(
                              note,
                              displaySettings.middleCStyle,
                            )}
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
                    onClick={() =>
                      setPracticeStringMode((current) => !current)
                    }
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
                    onClick={() => setShowPitchClass((current) => !current)}
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
                  mode={fretboardGestureMode}
                  onChange={setFretboardGestureMode}
                />
              ) : null}
            </div>
          </div>
          <div className="fretboard-scroll">
            <FretboardSvg
              midi={activeMidi}
              middleCStyle={displaySettings.middleCStyle}
              midis={displayMidis}
              activeMidis={soundingMidis}
              releasingMidis={playSession.releasingMidis}
              playedPositions={playedPositions}
              preferredString={preferredString}
              highlightPracticeString={practiceStringMode}
              showPitchClass={showPitchClass}
              playable={learningMode === 'play'}
              interactive={learningMode === 'play' || canInvitePlayMode}
              glissandoEnabled={
                learningMode === 'play' &&
                fretboardGestureMode === 'glissando'
              }
              onSelectString={setPreferredString}
              onPlayPosition={(position) =>
                playNote({
                  midi: position.midi,
                  instrumentId: 'guitar',
                  source: 'fretboard',
                  stringNumber: position.stringNumber,
                  fret: position.fret,
                })
              }
              onStartPosition={(pointerId, position) =>
                startPlayVoice('fretboard:' + pointerId, {
                  midi: position.midi,
                  instrumentId: 'guitar',
                  source: 'fretboard',
                  stringNumber: position.stringNumber,
                  fret: position.fret,
                })
              }
              onEndPosition={(pointerId) =>
                stopPlayVoice('fretboard:' + pointerId)
              }
            />
          </div>
        </section>

        <section className="secondary-grid">
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
                  mode={pianoGestureMode}
                  onChange={setPianoGestureMode}
                />
              ) : null}
              <span className="card-note piano-range-note">
                {formatNoteLabel(
                  midiToNote(36),
                  displaySettings.middleCStyle,
                )}{' '}
                —{' '}
                {formatNoteLabel(
                  midiToNote(96),
                  displaySettings.middleCStyle,
                )}
              </span>
            </div>
            <div className="piano-scroll">
              <PianoKeyboard
                midi={activeMidi}
                middleCStyle={displaySettings.middleCStyle}
                midis={displayMidis}
                activeMidis={soundingMidis}
                releasingMidis={playSession.releasingMidis}
                showPitchClass={showPitchClass}
                playable={learningMode === 'play'}
                interactive={learningMode === 'play' || canInvitePlayMode}
                glissandoEnabled={
                  learningMode === 'play' &&
                  pianoGestureMode === 'glissando'
                }
                onPlayKey={(midi) =>
                  playNote({
                    midi,
                    instrumentId: 'piano',
                    source: 'piano',
                  })
                }
                onStartKey={(pointerId, midi) =>
                  startPlayVoice('piano:' + pointerId, {
                    midi,
                    instrumentId: 'piano',
                    source: 'piano',
                  })
                }
                onEndKey={(pointerId) =>
                  stopPlayVoice('piano:' + pointerId)
                }
              />
            </div>
          </article>

          <article className="visual-card staff-card">
            <div className="card-heading">
              <div>
                <p className="card-kicker">Notation</p>
                <h2>五线谱</h2>
              </div>
              <div
                className="compact-switch notation-mode-switch"
                aria-label="记谱模式"
              >
                <button
                  type="button"
                  className={notationMode === 'guitar' ? 'is-selected' : ''}
                  aria-pressed={notationMode === 'guitar'}
                  onClick={() => setNotationMode('guitar')}
                >
                  吉他记谱
                </button>
                <button
                  type="button"
                  className={notationMode === 'concert' ? 'is-selected' : ''}
                  aria-pressed={notationMode === 'concert'}
                  onClick={() => setNotationMode('concert')}
                >
                  实际音高
                </button>
              </div>
            </div>
            <StaffView
              midi={activeMidi}
              middleCStyle={displaySettings.middleCStyle}
              midis={displayMidis}
              activeMidis={soundingMidis}
              releasingMidis={playSession.releasingMidis}
              mode={notationMode}
            />
          </article>
        </section>
      </main>
    </div>
  )
}

export default App

function initialPlayGestureMode(): PlayGestureMode {
  return window.matchMedia('(max-width: 900px)').matches
    ? 'scroll'
    : 'glissando'
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

function loadListenAnalysisMode(): ListenAnalysisMode {
  try {
    return window.localStorage.getItem(LISTEN_ANALYSIS_MODE_STORAGE_KEY) ===
      'polyphonic'
      ? 'polyphonic'
      : 'single'
  } catch {
    return 'single'
  }
}

function saveListenAnalysisMode(mode: ListenAnalysisMode): void {
  try {
    window.localStorage.setItem(LISTEN_ANALYSIS_MODE_STORAGE_KEY, mode)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function loadPersistentBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null ? fallback : stored === 'true'
  } catch {
    return fallback
  }
}

function savePersistentBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function loadMidiInstrument(): InstrumentId {
  try {
    return window.localStorage.getItem(MIDI_INSTRUMENT_STORAGE_KEY) === 'guitar'
      ? 'guitar'
      : 'piano'
  } catch {
    return 'piano'
  }
}

function saveMidiInstrument(instrumentId: InstrumentId): void {
  try {
    window.localStorage.setItem(MIDI_INSTRUMENT_STORAGE_KEY, instrumentId)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}
