import { useRef, useState } from 'react'
import { setFwaDebugEnabled } from '../../../../platform/fwa-debug-state/fwa-debug-state'
import { useFwaDebugState } from '../../../../platform/fwa-debug-state/react/useFwaDebugState'
import { applyFwaUpdate } from '../../../../platform/fwa-update/fwa-update'
import { useFwaUpdateState } from '../../../../platform/fwa-update/react/useFwaUpdateState'
import {
  TechnicalSettingsDialog,
} from '../TechnicalSettings/TechnicalSettingsDialog'
import type { TechnicalSettingsProps } from '../TechnicalSettings/TechnicalSettings'

type LearningSurfaceHeaderProps = Pick<
  TechnicalSettingsProps,
  | 'settings'
  | 'displaySettings'
  | 'trackSettings'
  | 'analysisSampleRate'
  | 'polyphonicRuntime'
  | 'onChange'
  | 'onDisplayChange'
  | 'onReset'
>

export function LearningSurfaceHeader(props: LearningSurfaceHeaderProps) {
  const [technicalSettingsOpen, setTechnicalSettingsOpen] = useState(false)
  const technicalSettingsTriggerRef = useRef<HTMLButtonElement>(null)
  const fwaDebugState = useFwaDebugState()
  const fwaUpdateState = useFwaUpdateState()

  const dismissTechnicalSettings = () => {
    setTechnicalSettingsOpen(false)
    requestAnimationFrame(() => {
      technicalSettingsTriggerRef.current?.focus()
    })
  }

  return (
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
              {...props}
              anchorRef={technicalSettingsTriggerRef}
              fwaDebugAvailable={fwaDebugState.available}
              fwaDebugEnabled={fwaDebugState.enabled}
              fwaUpdate={fwaUpdateState}
              onFwaDebugChange={setFwaDebugEnabled}
              onApplyFwaUpdate={applyFwaUpdate}
              onDismiss={dismissTechnicalSettings}
            />
          ) : null}
        </div>
      </div>
    </header>
  )
}
