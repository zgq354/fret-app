export type PlayGestureMode = 'scroll' | 'glissando'

interface GestureModeSwitchProps {
  className?: string
  label: string
  mode: PlayGestureMode
  onChange: (mode: PlayGestureMode) => void
}

export function GestureModeSwitch({
  className = '',
  label,
  mode,
  onChange,
}: GestureModeSwitchProps) {
  return (
    <div className={'compact-switch-control ' + className}>
      <div className="compact-switch" aria-label={label}>
        <button
          type="button"
          className={mode === 'scroll' ? 'is-selected' : ''}
          aria-pressed={mode === 'scroll'}
          title="拖动时横向滚动，点击仍可发声"
          onClick={() => onChange('scroll')}
        >
          滚动
        </button>
        <button
          type="button"
          className={mode === 'glissando' ? 'is-selected' : ''}
          aria-pressed={mode === 'glissando'}
          title="按住或多指拖过品位、琴键时连续发声"
          onClick={() => onChange('glissando')}
        >
          滑奏
        </button>
      </div>
    </div>
  )
}
