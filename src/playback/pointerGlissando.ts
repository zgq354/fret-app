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
