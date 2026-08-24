import { useRef, useState, type KeyboardEvent } from 'react'
import {
  getFretPosition,
  type FretPosition,
} from '../../../music/fretboard'
import {
  formatNoteLabel,
  midiToNote,
  type MiddleCStyle,
} from '../../../music/musicTheory'
import { resolveGlissandoTarget } from '../../../playback/pointerGlissando'
import { usePointerGlissando } from '../../../playback/react/usePointerGlissando'
import {
  DISPLAY_STRINGS,
  FRET_COUNT,
  fretHitEndX,
  fretHitStartX,
  stringY,
} from './fretboardGeometry'

interface FretboardPlayTargetsProps {
  glissandoEnabled: boolean
  middleCStyle: MiddleCStyle
  playable: boolean
  onPlayPosition?: (position: FretPosition) => void
  onStartPosition?: (pointerId: number, position: FretPosition) => void
  onEndPosition?: (pointerId: number, position: FretPosition) => void
}

const PLAY_POSITIONS = DISPLAY_STRINGS.flatMap((guitarString) =>
  Array.from({ length: FRET_COUNT + 1 }, (_, fret) =>
    getFretPosition(guitarString.stringNumber, fret),
  ),
)
const PLAY_POSITION_BY_KEY = new Map(
  PLAY_POSITIONS.map((position) => [
    positionKey(position.stringNumber, position.fret),
    position,
  ]),
)
const PLAY_TARGET_ATTRIBUTE = 'data-fret-play-key'

export function FretboardPlayTargets({
  glissandoEnabled,
  middleCStyle,
  playable,
  onPlayPosition,
  onStartPosition,
  onEndPosition,
}: FretboardPlayTargetsProps) {
  const [focusPosition, setFocusPosition] = useState({
    stringNumber: DISPLAY_STRINGS[0].stringNumber,
    fret: 0,
  })
  const targetRefs = useRef(new Map<string, SVGRectElement>())
  const glissando = usePointerGlissando({
    enabled: glissandoEnabled,
    startOnPointerDown: playable,
    onTrigger: onPlayPosition,
    onVoiceStart: onStartPosition,
    onVoiceEnd: onEndPosition,
    resolveTarget: (clientX, clientY) =>
      resolveGlissandoTarget(
        clientX,
        clientY,
        PLAY_TARGET_ATTRIBUTE,
        PLAY_POSITION_BY_KEY,
      ),
  })

  const playOnKeyboard = (
    event: KeyboardEvent<SVGRectElement>,
    position: FretPosition,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPlayPosition?.(position)
      return
    }

    const nextPosition = getNextFocusPosition(position, event.key)
    if (!nextPosition) {
      return
    }

    event.preventDefault()
    setFocusPosition(nextPosition)
    targetRefs.current
      .get(positionKey(nextPosition.stringNumber, nextPosition.fret))
      ?.focus()
  }

  return PLAY_POSITIONS.map((position) => {
    const displayIndex = DISPLAY_STRINGS.findIndex(
      (guitarString) =>
        guitarString.stringNumber === position.stringNumber,
    )
    const key = positionKey(position.stringNumber, position.fret)
    const isFocused =
      focusPosition.stringNumber === position.stringNumber &&
      focusPosition.fret === position.fret

    return (
      <rect
        key={'play-' + key}
        ref={(node) => {
          if (node) {
            targetRefs.current.set(key, node)
          } else {
            targetRefs.current.delete(key)
          }
        }}
        x={fretHitStartX(position.fret)}
        y={stringY(displayIndex) - 12}
        width={fretHitEndX(position.fret) - fretHitStartX(position.fret)}
        height="24"
        rx="4"
        role="button"
        tabIndex={isFocused ? 0 : -1}
        aria-label={getPositionLabel(position, middleCStyle)}
        data-fret-play-key={key}
        className={
          'fret-play-target' +
          (glissandoEnabled ? ' is-glissando' : '')
        }
        onFocus={() =>
          setFocusPosition({
            stringNumber: position.stringNumber,
            fret: position.fret,
          })
        }
        onPointerDown={(event) =>
          glissando.start(event, { key, value: position })
        }
        onPointerMove={glissando.move}
        onPointerUp={glissando.end}
        onPointerCancel={glissando.end}
        onLostPointerCapture={glissando.end}
        onClick={(event) =>
          glissando.activateFromClick(event, { key, value: position })
        }
        onKeyDown={(event) => playOnKeyboard(event, position)}
      />
    )
  })
}

function positionKey(stringNumber: number, fret: number): string {
  return stringNumber + '-' + fret
}

function getPositionLabel(
  position: FretPosition,
  middleCStyle: MiddleCStyle,
): string {
  const fretLabel = position.fret === 0 ? '空弦' : position.fret + ' 品'
  return (
    formatNoteLabel(midiToNote(position.midi), middleCStyle) +
    '，' +
    position.stringNumber +
    ' 弦，' +
    fretLabel
  )
}

function getNextFocusPosition(
  position: FretPosition,
  key: string,
): { stringNumber: number; fret: number } | null {
  const displayIndex = DISPLAY_STRINGS.findIndex(
    (guitarString) => guitarString.stringNumber === position.stringNumber,
  )
  let nextDisplayIndex = displayIndex
  let nextFret = position.fret

  if (key === 'ArrowLeft') {
    nextFret = Math.max(0, position.fret - 1)
  } else if (key === 'ArrowRight') {
    nextFret = Math.min(FRET_COUNT, position.fret + 1)
  } else if (key === 'ArrowUp') {
    nextDisplayIndex = Math.max(0, displayIndex - 1)
  } else if (key === 'ArrowDown') {
    nextDisplayIndex = Math.min(DISPLAY_STRINGS.length - 1, displayIndex + 1)
  } else if (key === 'Home') {
    nextFret = 0
  } else if (key === 'End') {
    nextFret = FRET_COUNT
  } else {
    return null
  }

  return {
    stringNumber: DISPLAY_STRINGS[nextDisplayIndex].stringNumber,
    fret: nextFret,
  }
}
