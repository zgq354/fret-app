import { StaffView, type StaffNotationMode } from '../StaffView/StaffView'
import type { MiddleCStyle } from '../../music/musicTheory'

interface NotationPanelProps {
  activeMidi: number | null
  middleCStyle: MiddleCStyle
  displayMidis: readonly number[]
  soundingMidis: readonly number[]
  releasingMidis: readonly number[]
  mode: StaffNotationMode
  onModeChange: (mode: StaffNotationMode) => void
}

export function NotationPanel({
  activeMidi,
  middleCStyle,
  displayMidis,
  soundingMidis,
  releasingMidis,
  mode,
  onModeChange,
}: NotationPanelProps) {
  return (
    <article className="visual-card staff-card">
      <div className="card-heading">
        <div>
          <p className="card-kicker">Notation</p>
          <h2>五线谱</h2>
        </div>
        <div className="compact-switch notation-mode-switch" aria-label="记谱模式">
          <button
            type="button"
            className={mode === 'guitar' ? 'is-selected' : ''}
            aria-pressed={mode === 'guitar'}
            onClick={() => onModeChange('guitar')}
          >
            吉他记谱
          </button>
          <button
            type="button"
            className={mode === 'concert' ? 'is-selected' : ''}
            aria-pressed={mode === 'concert'}
            onClick={() => onModeChange('concert')}
          >
            实际音高
          </button>
        </div>
      </div>
      <StaffView
        midi={activeMidi}
        middleCStyle={middleCStyle}
        midis={displayMidis}
        activeMidis={soundingMidis}
        releasingMidis={releasingMidis}
        mode={mode}
      />
    </article>
  )
}
