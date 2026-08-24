import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from 'react'

export interface GlissandoTarget<T> {
  key: string
  value: T
}

export interface GlissandoTracker<T> {
  start(pointerId: number, target: GlissandoTarget<T>): boolean
  move(pointerId: number, target: GlissandoTarget<T> | null): void
  end(pointerId: number): void
  cancelAll(): void
  isTracking(pointerId: number): boolean
}

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

export function createGlissandoTracker<T>(
  onVoiceStart: (pointerId: number, value: T) => void,
  onVoiceEnd: (pointerId: number, value: T) => void,
): GlissandoTracker<T> {
  const pointerTargets = new Map<number, GlissandoTarget<T> | null>()

  const end = (pointerId: number) => {
    if (!pointerTargets.has(pointerId)) {
      return
    }

    const target = pointerTargets.get(pointerId)
    pointerTargets.delete(pointerId)
    if (target) {
      onVoiceEnd(pointerId, target.value)
    }
  }

  return {
    start(pointerId, target) {
      if (pointerTargets.has(pointerId)) {
        return false
      }

      pointerTargets.set(pointerId, target)
      onVoiceStart(pointerId, target.value)
      return true
    },
    move(pointerId, target) {
      if (!pointerTargets.has(pointerId)) {
        return
      }

      const previousTarget = pointerTargets.get(pointerId) ?? null
      if (target?.key === previousTarget?.key) {
        return
      }

      if (previousTarget) {
        onVoiceEnd(pointerId, previousTarget.value)
      }
      pointerTargets.set(pointerId, target)
      if (target) {
        onVoiceStart(pointerId, target.value)
      }
    },
    end,
    cancelAll() {
      for (const pointerId of [...pointerTargets.keys()]) {
        end(pointerId)
      }
    },
    isTracking(pointerId) {
      return pointerTargets.has(pointerId)
    },
  }
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
      if (event.button !== 0) {
        return
      }

      if (!startOnPointerDownRef.current) {
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
    if (
      !enabledRef.current ||
      !tracker?.isTracking(event.pointerId)
    ) {
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

export function resolveGlissandoTarget<T>(
  clientX: number,
  clientY: number,
  attribute: string,
  values: ReadonlyMap<string, T>,
): GlissandoTarget<T> | null {
  const element = document.elementFromPoint(clientX, clientY)
  const target = element?.closest('[' + attribute + ']')
  const key = target?.getAttribute(attribute)
  if (key === null || key === undefined) {
    return null
  }

  const value = values.get(key)
  return value === undefined ? null : { key, value }
}
