import type { ReactNode } from 'react'
import {
  formatCents,
  formatFrequency,
  formatNoteOctave,
  type MiddleCStyle,
  type PitchReading,
} from '../../modules/music/musicTheory'

interface PitchMeterProps {
  reading: PitchReading | null
  middleCStyle: MiddleCStyle
  sourceLabel: string
  readingControl: ReactNode
  controls: ReactNode
  readingMeta?: ReactNode
  meterContent?: ReactNode
}

export function PitchMeter({
  reading,
  middleCStyle,
  sourceLabel,
  readingControl,
  controls,
  readingMeta,
  meterContent,
}: PitchMeterProps) {
  const cents = reading?.cents ?? 0
  const indicatorPosition = Math.min(100, Math.max(0, cents + 50))
  const isCentered = reading !== null && Math.abs(cents) <= 5

  return (
    <section className="pitch-meter">
      <div className="pitch-reading" aria-live="polite">
        <div className="pitch-source">{sourceLabel}</div>
        <div className="pitch-note">
          {reading ? (
            <>
              <span>{reading.name}</span>
              <sup>{formatNoteOctave(reading.octave, middleCStyle)}</sup>
            </>
          ) : (
            <span className="pitch-empty">—</span>
          )}
        </div>
        <div className="pitch-frequency">
          {readingMeta ??
            (reading ? formatFrequency(reading.frequency) : '等待单音')}
        </div>
      </div>

      <div className="pitch-reading-control">{readingControl}</div>

      {meterContent ?? (
        <div className="tuning-panel">
          <div className="tuning-copy">
            <span>偏低</span>
            <strong className={isCentered ? 'is-centered' : ''}>
              {reading ? formatCents(cents) + ' cents' : '—'}
            </strong>
            <span>偏高</span>
          </div>
          <div className="tuning-track">
            <div className="tuning-center" />
            {reading ? (
              <div
                className={
                  'tuning-indicator' + (isCentered ? ' is-centered' : '')
                }
                style={{ left: indicatorPosition + '%' }}
              />
            ) : null}
          </div>
          <div className="tuning-ticks">
            <span>−50</span>
            <span>0</span>
            <span>+50</span>
          </div>
        </div>
      )}

      {controls}
    </section>
  )
}
