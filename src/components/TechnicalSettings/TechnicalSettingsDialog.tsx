import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from 'react'
import {
  TechnicalSettings,
  type TechnicalSettingsProps,
} from './TechnicalSettings'

const PANEL_GAP = 10
const VIEWPORT_MARGIN = 12
const BOTTOM_VIEWPORT_MARGIN = 24
const PREFERRED_VISIBLE_HEIGHT = 320

interface TechnicalSettingsDialogProps extends TechnicalSettingsProps {
  anchorRef: RefObject<HTMLButtonElement | null>
  onDismiss: () => void
}

export function TechnicalSettingsDialog({
  anchorRef,
  onDismiss,
  ...settingsProps
}: TechnicalSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    visibility: 'hidden',
  })

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) {
      return
    }

    const anchorRect = anchor.getBoundingClientRect()
    const visualViewport = window.visualViewport
    const viewportLeft = visualViewport?.offsetLeft ?? 0
    const viewportTop = visualViewport?.offsetTop ?? 0
    const viewportWidth = visualViewport?.width ?? window.innerWidth
    const viewportHeight = visualViewport?.height ?? window.innerHeight
    const viewportRight = viewportLeft + viewportWidth
    const viewportBottom = viewportTop + viewportHeight
    const panelWidth = Math.min(
      panel.offsetWidth,
      viewportWidth - VIEWPORT_MARGIN * 2,
    )
    const left = Math.min(
      Math.max(anchorRect.right - panelWidth, viewportLeft + VIEWPORT_MARGIN),
      viewportRight - panelWidth - VIEWPORT_MARGIN,
    )
    const belowTop = anchorRect.bottom + PANEL_GAP
    const belowHeight = viewportBottom - belowTop - BOTTOM_VIEWPORT_MARGIN
    const aboveHeight =
      anchorRect.top - PANEL_GAP - viewportTop - VIEWPORT_MARGIN
    const placeBelow =
      belowHeight >= Math.min(panel.scrollHeight, PREFERRED_VISIBLE_HEIGHT) ||
      belowHeight >= aboveHeight
    const maxHeight = Math.max(0, placeBelow ? belowHeight : aboveHeight)
    const top = placeBelow
      ? belowTop
      : anchorRect.top - PANEL_GAP - Math.min(panel.scrollHeight, maxHeight)

    setPanelStyle({
      left,
      maxHeight,
      top,
      visibility: 'visible',
    })
  }, [anchorRef])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) {
      dialog?.showModal()
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.visualViewport?.addEventListener('resize', updatePanelPosition)
    window.visualViewport?.addEventListener('scroll', updatePanelPosition)

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.visualViewport?.removeEventListener('resize', updatePanelPosition)
      window.visualViewport?.removeEventListener('scroll', updatePanelPosition)
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [updatePanelPosition])

  const dismissFromMask = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onDismiss()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="technical-settings-dialog"
      aria-label="设置"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
      onClick={dismissFromMask}
    >
      <TechnicalSettings
        {...settingsProps}
        ref={panelRef}
        style={panelStyle}
      />
    </dialog>
  )
}
