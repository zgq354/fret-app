import {
  createStaffNotes,
  type StaffNotationMode,
} from './staffNotes'
import {
  formatNoteLabel,
  type MiddleCStyle,
} from '../../modules/music/musicTheory'
export type { StaffNotationMode } from './staffNotes'

interface StaffViewProps {
  midi: number | null
  middleCStyle: MiddleCStyle
  midis?: readonly number[]
  activeMidis?: readonly number[]
  releasingMidis?: readonly number[]
  mode: StaffNotationMode
}

const STAFF_LEFT = 92
const STAFF_RIGHT = 518
const STAFF_BOTTOM = 220
const LINE_GAP = 20
const NOTE_X = 322

export function StaffView({
  midi,
  middleCStyle,
  midis,
  activeMidis,
  releasingMidis = [],
  mode,
}: StaffViewProps) {
  const displayMidis = uniqueMidis(midis ?? (midi === null ? [] : [midi]))
  const soundingMidis = new Set(
    uniqueMidis(activeMidis ?? displayMidis),
  )
  const fadingMidis = new Set(uniqueMidis(releasingMidis))
  const notes = createStaffNotes(displayMidis, mode)
  const ledgerSteps = [
    ...new Set(notes.flatMap((note) => createLedgerSteps(note.step))),
  ].sort((left, right) => left - right)
  const averageY =
    notes.length === 0
      ? STAFF_BOTTOM
      : notes.reduce((sum, note) => sum + note.y, 0) / notes.length
  const stemGoesUp = averageY >= STAFF_BOTTOM - LINE_GAP * 2
  const noteYs = notes.map((note) => note.y)
  const stemStartY =
    notes.length === 0
      ? STAFF_BOTTOM
      : stemGoesUp
        ? Math.max(...noteYs)
        : Math.min(...noteYs)
  const stemEndY =
    notes.length === 0
      ? STAFF_BOTTOM
      : stemGoesUp
        ? Math.min(...noteYs) - 60
        : Math.max(...noteYs) + 60
  const soundingLabels = notes
    .map((note) => formatNoteLabel(note.soundingNote, middleCStyle))
    .join(' · ')
  const writtenLabels = notes
    .map((note) => formatNoteLabel(note.writtenNote, middleCStyle))
    .join(' · ')
  const caption =
    notes.length === 0
      ? '等待音高'
      : mode === 'guitar'
        ? '实际 ' + soundingLabels + ' · 吉他谱写作 ' + writtenLabels
        : '实际音高 ' + soundingLabels

  return (
    <div className="staff-visual">
      <svg
        className="staff-svg"
        viewBox="0 -20 560 420"
        role="img"
        aria-label={
          notes.length === 0
            ? '五线谱，等待音高输入'
            : (mode === 'guitar' ? '吉他记谱 ' : '实际音高记谱 ') +
              soundingLabels
        }
      >
        {Array.from({ length: 5 }, (_, index) => (
          <line
            key={index}
            x1={STAFF_LEFT}
            x2={STAFF_RIGHT}
            y1={STAFF_BOTTOM - index * LINE_GAP}
            y2={STAFF_BOTTOM - index * LINE_GAP}
            className="staff-line"
          />
        ))}

        <text x="102" y="224" className="treble-clef">
          𝄞
        </text>
        {mode === 'guitar' ? (
          <text x="127" y="250" className="clef-octave">
            8
          </text>
        ) : null}

        {ledgerSteps.map((ledgerStep) => {
          const y = STAFF_BOTTOM - ledgerStep * (LINE_GAP / 2)
          return (
            <line
              key={ledgerStep}
              x1={NOTE_X - 24}
              x2={NOTE_X + 42}
              y1={y}
              y2={y}
              className="staff-ledger-line"
            />
          )
        })}

        {notes.map((note, index) => {
          const previousNote = notes[index - 1]
          const headX =
            previousNote && note.step - previousNote.step === 1
              ? NOTE_X + 18
              : NOTE_X
          const isFocus = note.soundingNote.midi === midi
          const isSounding = soundingMidis.has(note.soundingNote.midi)
          const isReleasing = fadingMidis.has(note.soundingNote.midi)

          return (
            <g key={note.soundingNote.midi} className="staff-note">
              {note.writtenNote.name.includes('♯') ? (
                <text x={headX - 36} y={note.y + 8} className="accidental">
                  ♯
                </text>
              ) : null}
              <ellipse
                cx={headX}
                cy={note.y}
                rx="14"
                ry="9"
                transform={'rotate(-16 ' + headX + ' ' + note.y + ')'}
                className={
                  'note-head' +
                  (isFocus ? ' is-focus' : '') +
                  (isSounding
                    ? ' is-sounding'
                    : isReleasing
                      ? ' is-releasing'
                      : ' is-recent')
                }
              />
            </g>
          )
        })}

        {notes.length > 0 ? (
          <line
            x1={NOTE_X + (stemGoesUp ? 12 : -12)}
            x2={NOTE_X + (stemGoesUp ? 12 : -12)}
            y1={stemStartY}
            y2={stemEndY}
            className={
              'note-stem' +
              (soundingMidis.size > 0
                ? ' is-sounding'
                : fadingMidis.size > 0
                  ? ' is-releasing'
                  : ' is-recent')
            }
          />
        ) : null}
      </svg>
      <p className="staff-caption-text" title={caption}>
        {caption}
      </p>
    </div>
  )
}

function uniqueMidis(midis: readonly number[]): number[] {
  return [...new Set(midis.map((midi) => Math.round(midi)))]
}

function createLedgerSteps(noteStep: number): number[] {
  const steps: number[] = []

  if (noteStep < 0) {
    for (let step = -2; step >= noteStep; step -= 2) {
      steps.push(step)
    }
  }

  if (noteStep > 8) {
    for (let step = 10; step <= noteStep; step += 2) {
      steps.push(step)
    }
  }

  return steps
}
