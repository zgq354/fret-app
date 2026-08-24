import type { KeyboardEvent } from 'react'
import './FretboardSvg.css'
import {
  findFretPositions,
  findPitchClassPositions,
  STANDARD_MARKERS,
  type FretPosition,
} from '../../modules/music/fretboard'
import {
  formatNoteLabel,
  midiToNote,
  type MiddleCStyle,
} from '../../modules/music/musicTheory'
import { FretboardPlayTargets } from './FretboardPlayTargets'
import {
  BOARD_BOTTOM,
  BOARD_END_X,
  BOARD_TOP,
  DISPLAY_STRINGS,
  FRETBOARD_HEIGHT,
  FRETBOARD_WIDTH,
  FRET_COUNT,
  fretLineX,
  NUT_X,
  OPEN_NOTE_X,
  positionX,
  stringY,
} from './fretboardGeometry'

interface FretboardSvgProps {
  midi: number | null
  middleCStyle: MiddleCStyle
  midis?: readonly number[]
  activeMidis?: readonly number[]
  releasingMidis?: readonly number[]
  playedPositions?: readonly FretPosition[]
  preferredString: number
  highlightPracticeString: boolean
  showPitchClass: boolean
  playable?: boolean
  interactive?: boolean
  glissandoEnabled?: boolean
  onSelectString: (stringNumber: number) => void
  onPlayPosition?: (position: FretPosition) => void
  onStartPosition?: (pointerId: number, position: FretPosition) => void
  onEndPosition?: (pointerId: number, position: FretPosition) => void
}

export function FretboardSvg({
  midi,
  middleCStyle,
  midis,
  activeMidis,
  releasingMidis = [],
  playedPositions = [],
  preferredString,
  highlightPracticeString,
  showPitchClass,
  playable = false,
  interactive = playable,
  glissandoEnabled = false,
  onSelectString,
  onPlayPosition,
  onStartPosition,
  onEndPosition,
}: FretboardSvgProps) {
  const displayMidis = midis ?? (midi === null ? [] : [midi])
  const soundingMidis = new Set(activeMidis ?? displayMidis)
  const fadingMidis = new Set(releasingMidis)
  const exactPositions = displayMidis.flatMap((displayMidi) =>
    findFretPositions(displayMidi),
  )
  const pitchClassPositions =
    midi === null || !showPitchClass ? [] : findPitchClassPositions(midi)
  const note = midi === null ? null : midiToNote(midi)
  const yByString = new Map(
    DISPLAY_STRINGS.map((guitarString, index) => [
      guitarString.stringNumber,
      stringY(index),
    ]),
  )

  const selectOnKeyboard = (
    event: KeyboardEvent<SVGGElement>,
    stringNumber: number,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectString(stringNumber)
    }
  }

  return (
    <svg
      className={
        'fretboard-svg' +
        (playable && glissandoEnabled ? ' is-glissando' : '')
      }
      viewBox={'0 0 ' + FRETBOARD_WIDTH + ' ' + FRETBOARD_HEIGHT}
      role={interactive ? 'group' : 'img'}
      aria-label={
        note
          ? '吉他指板，当前音高 ' +
            formatNoteLabel(note, middleCStyle) +
            (playable
              ? '，可弹奏'
              : interactive
                ? '，点击可切换到弹奏模式'
                : '')
          : '吉他指板，等待音高输入' +
            (playable
              ? '，可弹奏'
              : interactive
                ? '，点击可切换到弹奏模式'
                : '')
      }
    >
      <defs>
        <linearGradient id="fretboard-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a251b" />
          <stop offset="0.5" stopColor="#241711" />
          <stop offset="1" stopColor="#17100d" />
        </linearGradient>
        <filter id="note-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={NUT_X}
        y={BOARD_TOP}
        width={BOARD_END_X - NUT_X}
        height={BOARD_BOTTOM - BOARD_TOP}
        rx="14"
        fill="url(#fretboard-wood)"
        className="fretboard-board"
      />

      {STANDARD_MARKERS.filter((marker) => marker.fret <= FRET_COUNT).map(
        (marker) => {
          const x = positionX(marker.fret)
          const dotYs =
            marker.dotCount === 2
              ? [BOARD_TOP + 58, BOARD_BOTTOM - 58]
              : [(BOARD_TOP + BOARD_BOTTOM) / 2]

          return dotYs.map((y, dotIndex) => (
            <circle
              key={marker.fret + '-' + dotIndex}
              cx={x}
              cy={y}
              r="7"
              className="fret-marker"
            />
          ))
        },
      )}

      {Array.from({ length: FRET_COUNT }, (_, index) => index + 1).map(
        (fret) => {
          const x = fretLineX(fret)
          const marker = STANDARD_MARKERS.find((item) => item.fret === fret)

          return (
            <g key={fret}>
              <line
                x1={x}
                x2={x}
                y1={BOARD_TOP}
                y2={BOARD_BOTTOM}
                className="fret-line"
              />
              {marker ? (
                <text
                  x={positionX(fret)}
                  y="28"
                  textAnchor="middle"
                  className="fret-number"
                >
                  {fret}
                </text>
              ) : null}
            </g>
          )
        },
      )}

      <line
        x1={NUT_X}
        x2={NUT_X}
        y1={BOARD_TOP - 1}
        y2={BOARD_BOTTOM + 1}
        className="nut-line"
      />

      {DISPLAY_STRINGS.map((guitarString, index) => {
        const y = stringY(index)
        const openNote = midiToNote(guitarString.openMidi)
        const isSelected =
          highlightPracticeString &&
          preferredString === guitarString.stringNumber

        return (
          <g
            key={guitarString.stringNumber}
            role={highlightPracticeString && !interactive ? 'button' : undefined}
            tabIndex={highlightPracticeString && !interactive ? 0 : undefined}
            aria-pressed={highlightPracticeString && !interactive ? isSelected : undefined}
            className={
              'fretboard-string-row' +
              (highlightPracticeString && !interactive ? ' is-interactive' : '') +
              (isSelected ? ' is-selected' : '')
            }
            onClick={
              highlightPracticeString && !interactive
                ? () => onSelectString(guitarString.stringNumber)
                : undefined
            }
            onKeyDown={
              highlightPracticeString && !interactive
                ? (event) =>
                    selectOnKeyboard(event, guitarString.stringNumber)
                : undefined
            }
          >
            <rect
              x="4"
              y={y - 16}
              width={BOARD_END_X - 4}
              height="32"
              className="string-hit-area"
            />
            <text x="18" y={y + 5} className="string-number">
              {guitarString.stringNumber}
            </text>
            <text x="43" y={y + 5} className="string-open-note">
              {formatNoteLabel(openNote, middleCStyle)}
            </text>
            <line
              x1={OPEN_NOTE_X}
              x2={BOARD_END_X}
              y1={y}
              y2={y}
              strokeWidth={0.8 + guitarString.gaugeRank * 0.32}
              className="guitar-string"
            />
          </g>
        )
      })}

      {pitchClassPositions.map((position) => (
        <circle
          key={
            'related-' +
            position.stringNumber +
            '-' +
            position.fret +
            '-' +
            position.midi
          }
          cx={positionX(position.fret)}
          cy={yByString.get(position.stringNumber)}
          r="7"
          className="pitch-class-note"
        >
          <title>
            {formatNoteLabel(midiToNote(position.midi), middleCStyle) +
              ' · ' +
              position.stringNumber +
              ' 弦 ' +
              position.fret +
              ' 品'}
          </title>
        </circle>
      ))}

      {exactPositions.map((position) => {
        const isFocus = position.midi === midi
        const isPrimary = isFocus && position.stringNumber === preferredString
        const isPlayedPosition = playedPositions.some(
          (playedPosition) =>
            playedPosition.stringNumber === position.stringNumber &&
            playedPosition.fret === position.fret,
        )
        const noteClass = isPlayedPosition
          ? 'note-origin'
          : highlightPracticeString && isFocus
            ? isPrimary
              ? 'note-primary'
              : 'note-secondary'
            : 'note-equal'

        return (
          <g
            key={'exact-' + position.stringNumber + '-' + position.fret}
            className={
              noteClass +
              (isFocus ? ' is-focus' : '') +
              (soundingMidis.has(position.midi)
                ? ' is-sounding'
                : fadingMidis.has(position.midi)
                  ? ' is-releasing'
                  : ' is-recent')
            }
            filter={
              highlightPracticeString && isPrimary
                ? 'url(#note-glow)'
                : undefined
            }
          >
            <circle
              cx={positionX(position.fret)}
              cy={yByString.get(position.stringNumber)}
              r={highlightPracticeString && isPrimary ? 17 : 13}
              className="note-circle"
            />
            <text
              x={positionX(position.fret)}
              y={(yByString.get(position.stringNumber) ?? 0) + 4}
              textAnchor="middle"
              className="note-label"
            >
              {midiToNote(position.midi).name}
            </text>
            <title>
              {formatNoteLabel(midiToNote(position.midi), middleCStyle) +
                ' · ' +
                position.stringNumber +
                ' 弦 ' +
                position.fret +
                ' 品' +
                (highlightPracticeString && isPrimary ? ' · 练习弦' : '')}
            </title>
          </g>
        )
      })}

      {interactive ? (
        <FretboardPlayTargets
          glissandoEnabled={glissandoEnabled}
          middleCStyle={middleCStyle}
          playable={playable}
          onPlayPosition={onPlayPosition}
          onStartPosition={onStartPosition}
          onEndPosition={onEndPosition}
        />
      ) : null}

      <text x={OPEN_NOTE_X} y="28" textAnchor="middle" className="fret-number">
        OPEN
      </text>
    </svg>
  )
}
