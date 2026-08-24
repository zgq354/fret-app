import { useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { useAudioSettings } from './audio/react/useAudioSettings'
import { usePitchDetection } from './audio/usePitchDetection'
import { usePolyphonicPitchDetection } from './audio/usePolyphonicPitchDetection'
import { FretboardPanel } from './components/FretboardPanel/FretboardPanel'
import { KeyboardPanel } from './components/KeyboardPanel/KeyboardPanel'
import { LearningPanel } from './components/LearningPanel/LearningPanel'
import { NotationPanel } from './components/NotationPanel/NotationPanel'
import { resolvePolyphonicFeedback } from './audio/polyphonicFeedback'
import type {
  PolyphonicAnalysisState,
  PolyphonicModelState,
} from './audio/polyphonicInferenceMessages'
import { EntryDialog } from './components/EntryDialog/EntryDialog'
import type { PlayGestureMode } from './components/GestureModeSwitch/GestureModeSwitch'
import { TechnicalSettingsDialog } from './components/TechnicalSettings/TechnicalSettingsDialog'
import type { StaffNotationMode } from './components/StaffView/StaffView'
import {
  canPromptPlayMode,
  resolveLearningDisplay,
  type LearningMode,
} from './learning/playMode'
import type { ListenAnalysisMode } from './learning/listenAnalysisMode'
import type { PlayNoteRequest } from './learning/playSession'
import { useListeningHistory } from './learning/react/useListeningHistory'
import { usePlaySession } from './learning/usePlaySession'
import { getFretPosition } from './music/fretboard'
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
import { VOICE_RELEASE_MS } from './playback/instrument'
import { usePlayback } from './playback/usePlayback'
import { setFwaDebugEnabled } from './platform/fwa-debug-state/fwa-debug-state'
import { useFwaDebugState } from './platform/fwa-debug-state/react/useFwaDebugState'
import { applyFwaUpdate } from './platform/fwa-update/fwa-update'
import { useFwaUpdateState } from './platform/fwa-update/react/useFwaUpdateState'
import { useDisplaySettings } from './settings/react/useDisplaySettings'
import { useAppPreferences } from './settings/react/useAppPreferences'

const MIN_DEMO_MIDI = 40
const MAX_DEMO_MIDI = 88
const RELEASE_STYLE = {
  '--voice-release-duration': VOICE_RELEASE_MS + 'ms',
} as CSSProperties

function App() {
  const [preferredString, setPreferredString] = useState(2)
  const [demoMidi, setDemoMidi] = useState(64)
  const [showPitchClass, setShowPitchClass] = useState(false)
  const { preferences, setPreference } = useAppPreferences()
  const { practiceStringMode, midiInstrumentId, listenAnalysisMode } =
    preferences
  const {
    settings: audioSettings,
    updateSettings: updateAudioSettings,
    resetSettings: resetAudioSettings,
  } = useAudioSettings()
  const {
    settings: displaySettings,
    updateSettings: updateDisplaySettings,
    resetSettings: resetDisplaySettings,
  } = useDisplaySettings()
  const fwaDebugState = useFwaDebugState()
  const fwaUpdateState = useFwaUpdateState()
  const [stickyPitch, setStickyPitch] = useState(false)
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

  const {
    latestDetectedReading,
    latestDetectedChord,
    clear: clearListeningHistory,
  } = useListeningHistory({
    isListening,
    mode: listenAnalysisMode,
    pitchReading: singlePitchDetection.reading,
    chordReading: polyphonicPitchDetection.reading,
  })
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
      clearListeningHistory()
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
    clearListeningHistory()
    setPreference('listenAnalysisMode', mode)
  }

  const enableMicrophone = () => {
    clearListeningHistory()
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
                  resetAudioSettings()
                  resetDisplaySettings()
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
        <LearningPanel
          learningMode={learningMode}
          listenAnalysisMode={listenAnalysisMode}
          isListening={isListening}
          microphoneRequesting={microphoneDetection.status === 'requesting'}
          activeReading={activeReading}
          activeMidi={activeMidi}
          middleCStyle={displaySettings.middleCStyle}
          sourceLabel={sourceLabel}
          readingMeta={readingMeta}
          play={{
            displayMidis: playSession.displayMidis,
            noteSummary,
            isActive: playSession.isActive,
            isTransient: playSession.isTransient,
            isReleasing: playSession.isReleasing,
            isRecent: playSession.isRecent,
            sticky: playSession.sticky,
            onToggleSticky: () =>
              playSession.setSticky((current) => !current),
          }}
          polyphonic={{
            feedback: polyphonicFeedback,
            inputLevel: polyphonicPitchDetection.inputLevel,
            analysisState: polyphonicPitchDetection.analysisState,
            visibleChordReading,
            hasLiveChord,
          }}
          stickyPitch={stickyPitch}
          demoMidi={demoMidi}
          minDemoMidi={MIN_DEMO_MIDI}
          maxDemoMidi={MAX_DEMO_MIDI}
          midi={midiInput}
          midiInstrumentId={midiInstrumentId}
          onSelectLearningMode={selectLearningMode}
          onSelectListenAnalysisMode={selectListenAnalysisMode}
          onToggleMicrophone={() => {
            if (isListening) {
              microphoneDetection.stop()
            } else {
              enableMicrophone()
            }
          }}
          onMoveDemoNote={moveDemoNote}
          onToggleStickyPitch={() => setStickyPitch((current) => !current)}
          onMidiConnect={() => {
            void playback.prepare()
            void midiInput.connect()
          }}
          onMidiInstrumentChange={(instrumentId) =>
            setPreference('midiInstrumentId', instrumentId)
          }
        />

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

        <FretboardPanel
          learningMode={learningMode}
          canInvitePlayMode={canInvitePlayMode}
          activeMidi={activeMidi}
          middleCStyle={displaySettings.middleCStyle}
          displayMidis={displayMidis}
          soundingMidis={soundingMidis}
          releasingMidis={playSession.releasingMidis}
          playedPositions={playedPositions}
          preferredString={preferredString}
          practiceStringMode={practiceStringMode}
          showPitchClass={showPitchClass}
          gestureMode={fretboardGestureMode}
          onSelectString={setPreferredString}
          onTogglePracticeStringMode={() =>
            setPreference('practiceStringMode', !practiceStringMode)
          }
          onToggleShowPitchClass={() =>
            setShowPitchClass((current) => !current)
          }
          onGestureModeChange={setFretboardGestureMode}
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

        <section className="secondary-grid">
          <KeyboardPanel
            learningMode={learningMode}
            canInvitePlayMode={canInvitePlayMode}
            activeMidi={activeMidi}
            middleCStyle={displaySettings.middleCStyle}
            displayMidis={displayMidis}
            soundingMidis={soundingMidis}
            releasingMidis={playSession.releasingMidis}
            showPitchClass={showPitchClass}
            gestureMode={pianoGestureMode}
            onGestureModeChange={setPianoGestureMode}
            onPlayKey={(midi) =>
              playNote({ midi, instrumentId: 'piano', source: 'piano' })
            }
            onStartKey={(pointerId, midi) =>
              startPlayVoice('piano:' + pointerId, {
                midi,
                instrumentId: 'piano',
                source: 'piano',
              })
            }
            onEndKey={(pointerId) => stopPlayVoice('piano:' + pointerId)}
          />
          <NotationPanel
            activeMidi={activeMidi}
            middleCStyle={displaySettings.middleCStyle}
            displayMidis={displayMidis}
            soundingMidis={soundingMidis}
            releasingMidis={playSession.releasingMidis}
            mode={notationMode}
            onModeChange={setNotationMode}
          />
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
