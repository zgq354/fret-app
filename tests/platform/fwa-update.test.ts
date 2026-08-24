import { describe, expect, it } from 'vitest'
import type { LocalEdgeClientState } from '@fullstack-webapp/local-edge/client'
import {
  formatFwaReleaseId,
  projectFwaUpdateState,
} from '../../src/platform/fwa-update/fwa-update'

describe('FWA update state', () => {
  it('projects the framework-neutral release contract', () => {
    const state: LocalEdgeClientState = {
      phase: 'ready',
      controlled: true,
      releaseId: '1111111111111111',
      availableReleaseId: '2222222222222222',
      updateAvailable: true,
      revalidating: false,
      message: 'A complete release is ready.',
    }

    expect(projectFwaUpdateState(state)).toEqual({
      phase: 'ready',
      currentReleaseId: '1111111111111111',
      availableReleaseId: '2222222222222222',
      updateAvailable: true,
    })
  })

  it('fails closed before the loader is ready', () => {
    expect(projectFwaUpdateState()).toEqual({
      phase: 'unavailable',
      updateAvailable: false,
    })
  })

  it('formats release identities for compact settings UI', () => {
    expect(formatFwaReleaseId('1234567890abcdef')).toBe('12345678')
    expect(formatFwaReleaseId()).toBe('—')
  })
})
