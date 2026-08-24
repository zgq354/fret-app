import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import './PianoKeyboard.css'
import {
  formatNoteLabel,
  midiToNote,
  type MiddleCStyle,
} from '../../music/musicTheory'
import {
  resolveGlissandoTarget,
  usePointerGlissando,
} from '../../playback/pointerGlissando'
import {
  BLACK_KEY_WIDTH,
  createPianoKeys,
  PIANO_END_MIDI,
  PIANO_START_MIDI,
  WHITE_KEY_WIDTH,
  type PianoKey,
} from './pianoKeys'

interface PianoKeyboardProps {
  midi: number | null
  middleCStyle: MiddleCStyle
  midis?: readonly number[]
  activeMidis?: readonly number[]
  releasingMidis?: readonly number[]
  showPitchClass: boolean
  playable?: boolean
  interactive?: boolean
  glissandoEnabled?: boolean
  onPlayKey?: (midi: number) => void
  onStartKey?: (pointerId: number, midi: number) => void
  onEndKey?: (pointerId: number, midi: number) => void
}
const WHITE_KEY_HEIGHT = 140
const BLACK_KEY_HEIGHT = 88
const KEYS = createPianoKeys()
const KEY_BY_PLAY_KEY = new Map(
  KEYS.map((key) => [String(key.midi), key.midi]),
)
const PLAY_TARGET_ATTRIBUTE = 'data-piano-play-key'

export function PianoKeyboard({
  midi,
  middleCStyle,
  midis,
  activeMidis,
  releasingMidis = [],
  showPitchClass,
  playable = false,
  interactive = playable,
  glissandoEnabled = false,
  onPlayKey,
  onStartKey,
  onEndKey,
}: PianoKeyboardProps) {
  const [focusMidi, setFocusMidi] = useState(
    midi !== null && midi >= PIANO_START_MIDI && midi <= PIANO_END_MIDI
      ? midi
      : 60,
  )
  const keyRefs = useRef(new Map<number, SVGRectElement>())
  const glissando = usePointerGlissando({
    enabled: glissandoEnabled,
    startOnPointerDown: playable,
    onTrigger: onPlayKey,
    onVoiceStart: onStartKey,
    onVoiceEnd: onEndKey,
    resolveTarget: (clientX, clientY) =>
      resolveGlissandoTarget(
        clientX,
        clientY,
        PLAY_TARGET_ATTRIBUTE,
        KEY_BY_PLAY_KEY,
      ),
  })
  const whiteKeys = KEYS.filter((key) => !key.isBlack)
  const blackKeys = KEYS.filter((key) => key.isBlack)
  const width = whiteKeys.length * WHITE_KEY_WIDTH
  const activeMidi = midi === null ? null : Math.round(midi)
  const displayMidis = new Set(
    (midis ?? (activeMidi === null ? [] : [activeMidi])).map(Math.round),
  )
  const soundingMidis = new Set(
    (activeMidis ?? [...displayMidis]).map(Math.round),
  )
  const fadingMidis = new Set(releasingMidis.map(Math.round))
  const activePitchClass =
    activeMidi === null ? null : ((activeMidi % 12) + 12) % 12

  const keyClass = (key: PianoKey) => {
    const classes = ['piano-key', key.isBlack ? 'is-black' : 'is-white']
    if (displayMidis.has(key.midi)) {
      classes.push(
        soundingMidis.has(key.midi)
          ? 'is-active'
          : fadingMidis.has(key.midi)
            ? 'is-releasing'
            : 'is-recent',
      )
      if (key.midi === activeMidi) {
        classes.push('is-focus')
      }
    } else if (
      showPitchClass &&
      activePitchClass !== null &&
      key.midi % 12 === activePitchClass
    ) {
      classes.push('is-related')
    }
    if (interactive) {
      classes.push('is-interactive')
    }
    if (playable) {
      classes.push('is-playable')
    }
    if (playable && glissandoEnabled) {
      classes.push('is-glissando')
    }
    return classes.join(' ')
  }

  const playOnKeyboard = (
    event: KeyboardEvent<SVGRectElement>,
    midi: number,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPlayKey?.(midi)
      return
    }

    const nextMidi = getNextMidi(midi, event.key)
    if (nextMidi === null) {
      return
    }

    event.preventDefault()
    setFocusMidi(nextMidi)
    keyRefs.current.get(nextMidi)?.focus()
  }

  const interactiveProps = (key: PianoKey) => {
    if (!interactive) {
      return {}
    }

    return {
      ref: (node: SVGRectElement | null) => {
        if (node) {
          keyRefs.current.set(key.midi, node)
        } else {
          keyRefs.current.delete(key.midi)
        }
      },
      role: 'button',
      tabIndex: key.midi === focusMidi ? 0 : -1,
      'aria-label':
        '钢琴 ' + formatNoteLabel(midiToNote(key.midi), middleCStyle),
      'data-piano-play-key': String(key.midi),
      onFocus: () => setFocusMidi(key.midi),
      onPointerDown: (event: PointerEvent<SVGRectElement>) =>
        glissando.start(event, {
          key: String(key.midi),
          value: key.midi,
        }),
      onPointerMove: glissando.move,
      onPointerUp: glissando.end,
      onPointerCancel: glissando.end,
      onLostPointerCapture: glissando.end,
      onClick: (event: MouseEvent<SVGRectElement>) =>
        glissando.activateFromClick(event, {
          key: String(key.midi),
          value: key.midi,
        }),
      onKeyDown: (event: KeyboardEvent<SVGRectElement>) =>
        playOnKeyboard(event, key.midi),
    }
  }

  return (
    <svg
      className={
        'piano-svg' +
        (playable && glissandoEnabled ? ' is-glissando' : '')
      }
      viewBox={'0 0 ' + width + ' ' + (WHITE_KEY_HEIGHT + 26)}
      role={interactive ? 'group' : 'img'}
      aria-label={
        activeMidi === null
          ? '钢琴键盘，等待音高输入' +
            (playable
              ? '，可弹奏'
              : interactive
                ? '，点击可切换到弹奏模式'
                : '')
          : '钢琴键盘，当前音高 ' +
            formatNoteLabel(midiToNote(activeMidi), middleCStyle) +
            (playable
              ? '，可弹奏'
              : interactive
                ? '，点击可切换到弹奏模式'
                : '')
      }
    >
      {whiteKeys.map((key) => {
        const note = midiToNote(key.midi)
        return (
          <g key={key.midi}>
            <rect
              x={key.x}
              y="0"
              width={WHITE_KEY_WIDTH}
              height={WHITE_KEY_HEIGHT}
              rx="2"
              className={keyClass(key)}
              {...interactiveProps(key)}
            >
              <title>{formatNoteLabel(note, middleCStyle)}</title>
            </rect>
            {note.name === 'C' ? (
              <text
                x={key.x + WHITE_KEY_WIDTH / 2}
                y={WHITE_KEY_HEIGHT - 11}
                textAnchor="middle"
                className="piano-octave-label"
              >
                {formatNoteLabel(note, middleCStyle)}
              </text>
            ) : null}
          </g>
        )
      })}

      {blackKeys.map((key) => (
        <rect
          key={key.midi}
          x={key.x}
          y="0"
          width={BLACK_KEY_WIDTH}
          height={BLACK_KEY_HEIGHT}
          rx="2"
          className={keyClass(key)}
          {...interactiveProps(key)}
        >
          <title>
            {formatNoteLabel(midiToNote(key.midi), middleCStyle)}
          </title>
        </rect>
      ))}

      {displayMidis.size > 0 ? (
        <text
          x="0"
          y={WHITE_KEY_HEIGHT + 24}
          className="piano-current-label"
        >
          {[...displayMidis]
            .map((displayMidi) =>
              formatNoteLabel(midiToNote(displayMidi), middleCStyle),
            )
            .join(' · ')}
        </text>
      ) : null}
    </svg>
  )
}

function getNextMidi(midi: number, key: string): number | null {
  if (key === 'ArrowLeft') {
    return Math.max(PIANO_START_MIDI, midi - 1)
  }
  if (key === 'ArrowRight') {
    return Math.min(PIANO_END_MIDI, midi + 1)
  }
  if (key === 'ArrowUp') {
    return Math.min(PIANO_END_MIDI, midi + 12)
  }
  if (key === 'ArrowDown') {
    return Math.max(PIANO_START_MIDI, midi - 12)
  }
  if (key === 'Home') {
    return PIANO_START_MIDI
  }
  if (key === 'End') {
    return PIANO_END_MIDI
  }
  return null
}
