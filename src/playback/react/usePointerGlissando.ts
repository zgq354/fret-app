import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import {
  createGlissandoTracker,
  type GlissandoTarget,
  type GlissandoTracker,
} from '../pointerGlissando'

interface PointerGlissandoOptions<T> {
  enabled: boolean
  startOnPointerDown: boolean
  onTrigger?: (value: T) => void
  onVoiceStart?: (pointerId: number, value: T) => void
  onVoiceEnd?: (pointerId: number, value: T) => void
  resolveTarget: (
    clientX: number,
    clientY: number,
  ) => GlissandoTarget<T> | null
}

export function usePointerGlissando<T>({
  enabled,
  startOnPointerDown,
  onTrigger,
  onVoiceStart,
  onVoiceEnd,
  resolveTarget,
}: PointerGlissandoOptions<T>) {
  const enabledRef = useRef(enabled)
  const startOnPointerDownRef = useRef(startOnPointerDown)
  const onTriggerRef = useRef(onTrigger)
  const onVoiceStartRef = useRef(onVoiceStart)
  const onVoiceEndRef = useRef(onVoiceEnd)
  const resolveTargetRef = useRef(resolveTarget)
  enabledRef.current = enabled
  startOnPointerDownRef.current = startOnPointerDown
  onTriggerRef.current = onTrigger
  onVoiceStartRef.current = onVoiceStart
  onVoiceEndRef.current = onVoiceEnd
  resolveTargetRef.current = resolveTarget

  const trackerRef = useRef<GlissandoTracker<T> | null>(null)
  trackerRef.current ??= createGlissandoTracker(
    (pointerId, value) => onVoiceStartRef.current?.(pointerId, value),
    (pointerId, value) => onVoiceEndRef.current?.(pointerId, value),
  )

  useEffect(() => {
    if (!enabled) {
      trackerRef.current?.cancelAll()
    }
  }, [enabled])

  useEffect(() => {
    if (!startOnPointerDown) {
      trackerRef.current?.cancelAll()
    }
  }, [startOnPointerDown])

  useEffect(() => {
    const endPointer = (event: globalThis.PointerEvent) => {
      trackerRef.current?.end(event.pointerId)
    }

    window.addEventListener('pointerup', endPointer)
    window.addEventListener('pointercancel', endPointer)
    return () => {
      window.removeEventListener('pointerup', endPointer)
      window.removeEventListener('pointercancel', endPointer)
    }
  }, [])

  const start = useCallback(
    (
      event: PointerEvent<SVGElement>,
      target: GlissandoTarget<T>,
    ) => {
      if (event.button !== 0 || !startOnPointerDownRef.current) {
        return
      }

      const tracker = trackerRef.current
      if (!tracker?.start(event.pointerId, target)) {
        return
      }

      if (!enabledRef.current) {
        // Scroll mode sounds the initial press without capturing the pointer,
        // so the browser can still promote movement into native scrolling.
        return
      }

      event.preventDefault()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is an enhancement; moves inside the surface still work.
      }
    },
    [],
  )

  const move = useCallback((event: PointerEvent<SVGElement>) => {
    const tracker = trackerRef.current
    if (!enabledRef.current || !tracker?.isTracking(event.pointerId)) {
      return
    }

    event.preventDefault()
    tracker.move(
      event.pointerId,
      resolveTargetRef.current(event.clientX, event.clientY),
    )
  }, [])

  const end = useCallback((event: PointerEvent<SVGElement>) => {
    trackerRef.current?.end(event.pointerId)
  }, [])

  const activateFromClick = useCallback(
    (
      event: MouseEvent<SVGElement>,
      target: GlissandoTarget<T>,
    ) => {
      // Play mode starts pointer voices on pointerdown, so only keyboard and
      // assistive clicks need the one-shot path there. Outside play mode the
      // completed click is the activation that requests a mode switch.
      if (!startOnPointerDownRef.current || event.detail === 0) {
        onTriggerRef.current?.(target.value)
      }
    },
    [],
  )

  return { start, move, end, activateFromClick }
}
