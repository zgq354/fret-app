import { useState, type CSSProperties } from 'react'
import './learning-surface.css'
import { useAudioSettings } from '../audio/react/useAudioSettings'
import { FretboardPanel } from './components/FretboardPanel/FretboardPanel'
import { KeyboardPanel } from './components/KeyboardPanel/KeyboardPanel'
import { LearningPanel } from './components/LearningPanel/LearningPanel'
import { NotationPanel } from './components/NotationPanel/NotationPanel'
import { EntryDialog } from './components/EntryDialog/EntryDialog'
import type { PlayGestureMode } from './components/GestureModeSwitch/GestureModeSwitch'
import { LearningSurfaceHeader } from './components/LearningSurfaceHeader/LearningSurfaceHeader'
import type { StaffNotationMode } from './components/StaffView/StaffView'
import { canPromptPlayMode, type LearningMode } from './model/play-mode'
import { resolveLearningSurfaceDisplay } from './model/learning-surface-display'
import { useListeningRuntime } from './hooks/useListeningRuntime'
import { usePlayRuntime } from './hooks/usePlayRuntime'
import { VOICE_RELEASE_MS } from '../playback/instrument'
import { useDisplaySettings } from '../settings/react/useDisplaySettings'
import type { ListenAnalysisMode } from '../settings/appPreferences'
import { useAppPreferences } from '../settings/react/useAppPreferences'

const MIN_DEMO_MIDI = 40
const MAX_DEMO_MIDI = 88
const RELEASE_STYLE = {
  '--voice-release-duration': VOICE_RELEASE_MS + 'ms',
} as CSSProperties

export function LearningSurface() {
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
  const [stickyPitch, setStickyPitch] = useState(false)
  const [learningMode, setLearningMode] = useState<LearningMode>('listen')
  const [playModeInviteOpen, setPlayModeInviteOpen] = useState(false)
  const [fretboardGestureMode, setFretboardGestureMode] =
    useState<PlayGestureMode>(initialPlayGestureMode)
  const [pianoGestureMode, setPianoGestureMode] =
    useState<PlayGestureMode>(initialPlayGestureMode)
  const [notationMode, setNotationMode] =
    useState<StaffNotationMode>('guitar')
  const listening = useListeningRuntime({
    audioSettings,
    learningMode,
    listenAnalysisMode,
  })
  const {
    singlePitchDetection,
    polyphonicPitchDetection,
    microphoneDetection,
    isListening,
    latestDetectedReading,
    latestDetectedChord,
  } = listening
  const canInvitePlayMode = canPromptPlayMode(
    learningMode,
    microphoneDetection.status,
  )
  const invitePlayMode = () => {
    if (canInvitePlayMode) {
      setPlayModeInviteOpen(true)
    }
  }
  const {
    playback,
    playSession,
    midiInput,
    playNote,
    startPlayVoice,
    stopPlayVoice,
    dismissError: dismissPlaybackError,
    clear: clearPlaySession,
    stopAll: stopAllPlayback,
  } = usePlayRuntime({
    learningMode,
    midiInstrumentId,
    onInactivePlay: invitePlayMode,
  })
  const {
    activeReading,
    activeMidi,
    displayMidis,
    soundingMidis,
    playedPositions,
    visibleChordReading,
    hasLiveChord,
    polyphonicFeedback,
    readingMeta,
    sourceLabel,
    noteSummary,
  } = resolveLearningSurfaceDisplay({
    learningMode,
    listenAnalysisMode,
    demoMidi,
    microphoneStatus: microphoneDetection.status,
    singlePitchReading: singlePitchDetection.reading,
    polyphonicReading: polyphonicPitchDetection.reading,
    polyphonicModelState: polyphonicPitchDetection.modelState,
    polyphonicAnalysisState: polyphonicPitchDetection.analysisState,
    stickyPitch,
    latestDetectedReading,
    latestDetectedChord,
    playFocusNote: playSession.focusNote,
    playDisplayNotes: playSession.displayNotes,
    playDisplayMidis: playSession.displayMidis,
    playSoundingMidis: playSession.soundingMidis,
    playIsRecent: playSession.isRecent,
    middleCStyle: displaySettings.middleCStyle,
  })
  const audioErrorMessage =
    learningMode === 'play'
      ? playback.errorMessage
      : microphoneDetection.errorMessage

  const moveDemoNote = (semitones: number) => {
    setDemoMidi((current) =>
      Math.min(MAX_DEMO_MIDI, Math.max(MIN_DEMO_MIDI, current + semitones)),
    )
  }

  const selectLearningMode = (mode: LearningMode) => {
    if (mode === learningMode) {
      return
    }

    listening.dismissErrors()
    dismissPlaybackError()
    clearPlaySession()

    if (mode === 'play') {
      listening.stop()
    } else {
      stopAllPlayback()
    }

    setLearningMode(mode)
  }

  const selectListenAnalysisMode = (mode: ListenAnalysisMode) => {
    if (mode === listenAnalysisMode) {
      return
    }

    listening.stop()
    setPreference('listenAnalysisMode', mode)
  }

  const enableMicrophone = () => {
    listening.enableMicrophone()
  }

  const switchToPlay = () => {
    if (!playModeInviteOpen) {
      return
    }

    setPlayModeInviteOpen(false)
    selectLearningMode('play')
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
      <LearningSurfaceHeader
        settings={audioSettings}
        displaySettings={displaySettings}
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
        onReset={() => {
          resetAudioSettings()
          resetDisplaySettings()
        }}
      />

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

function initialPlayGestureMode(): PlayGestureMode {
  return window.matchMedia('(max-width: 900px)').matches
    ? 'scroll'
    : 'glissando'
}
