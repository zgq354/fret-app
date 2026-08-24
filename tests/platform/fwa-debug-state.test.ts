import { describe, expect, it } from 'vitest'
import { projectFwaDebugState } from '../../src/platform/fwa-debug-state'

describe('FWA debug state', () => {
  it('projects the SDK debug facade for the settings UI', () => {
    expect(projectFwaDebugState({ enabled: true })).toEqual({
      available: true,
      enabled: true,
    })
  })

  it('disables the control before the loader is ready', () => {
    expect(projectFwaDebugState()).toEqual({
      available: false,
      enabled: false,
    })
  })
})
