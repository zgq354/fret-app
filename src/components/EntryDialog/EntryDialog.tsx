import { useEffect, useRef, type MouseEvent } from 'react'
import './EntryDialog.css'

interface EntryDialogProps {
  isListening: boolean
  onDismiss: () => void
  onSwitchToPlay: () => void
}

export function EntryDialog({
  isListening,
  onDismiss,
  onSwitchToPlay,
}: EntryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) {
      dialog?.showModal()
    }

    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  const dismissFromBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onDismiss()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="entry-dialog"
      aria-labelledby="entry-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
      onClick={dismissFromBackdrop}
    >
      <div className="entry-dialog-panel">
        <span className="entry-dialog-kicker">输入模式</span>
        <h2 id="entry-dialog-title">切换到弹奏模式？</h2>
        <p>
          {isListening
            ? '麦克风正在监听。切换后会停止麦克风；再次点击指板或琴键即可发声，也可以随时切回监听模式。'
            : '当前处于监听模式。切换后再次点击指板或琴键即可发声，也可以随时切回监听模式。'}
        </p>

        <div className="entry-dialog-actions">
          <button type="button" onClick={onDismiss}>
            取消
          </button>
          <button
            type="button"
            className="is-primary"
            autoFocus
            onClick={onSwitchToPlay}
          >
            切换到弹奏模式
          </button>
        </div>
      </div>
    </dialog>
  )
}
