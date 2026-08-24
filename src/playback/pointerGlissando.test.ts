import { describe, expect, it, vi } from 'vitest'
import { createGlissandoTracker } from './pointerGlissando'

describe('createGlissandoTracker', () => {
  it('starts the initial target and replaces it on each newly entered target', () => {
    const start = vi.fn()
    const end = vi.fn()
    const tracker = createGlissandoTracker(start, end)

    expect(tracker.start(7, target('a', 60))).toBe(true)
    tracker.move(7, target('a', 60))
    tracker.move(7, target('b', 61))
    tracker.move(7, target('b', 61))

    expect(start.mock.calls).toEqual([[7, 60], [7, 61]])
    expect(end.mock.calls).toEqual([[7, 60]])
  })

  it('ends a voice while outside the surface and restarts on re-entry', () => {
    const start = vi.fn()
    const end = vi.fn()
    const tracker = createGlissandoTracker(start, end)

    tracker.start(3, target('a', 60))
    tracker.move(3, null)
    tracker.move(3, target('a', 60))

    expect(start.mock.calls).toEqual([[3, 60], [3, 60]])
    expect(end.mock.calls).toEqual([[3, 60]])
  })

  it('tracks multiple pointers and releases them independently', () => {
    const start = vi.fn()
    const end = vi.fn()
    const tracker = createGlissandoTracker(start, end)

    tracker.start(1, target('a', 60))
    expect(tracker.start(2, target('b', 64))).toBe(true)
    tracker.move(1, target('d', 65))
    tracker.move(2, target('c', 62))
    tracker.end(1)
    tracker.move(1, target('e', 63))

    expect(start.mock.calls).toEqual([
      [1, 60],
      [2, 64],
      [1, 65],
      [2, 62],
    ])
    expect(end.mock.calls).toEqual([[1, 60], [2, 64], [1, 65]])
    expect(tracker.isTracking(1)).toBe(false)
    expect(tracker.isTracking(2)).toBe(true)
  })

  it('releases every active voice when cancelled', () => {
    const start = vi.fn()
    const end = vi.fn()
    const tracker = createGlissandoTracker(start, end)

    tracker.start(1, target('a', 60))
    tracker.start(2, target('b', 64))
    tracker.cancelAll()

    expect(end.mock.calls).toEqual([[1, 60], [2, 64]])
    expect(tracker.isTracking(1)).toBe(false)
    expect(tracker.isTracking(2)).toBe(false)
  })
})

function target(key: string, value: number) {
  return { key, value }
}
