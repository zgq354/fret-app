import {
  fwaGlobalReadyEventName,
  getFwaLocalEdge,
  type LocalEdgeClientPhase,
  type LocalEdgeClientState,
} from '@fullstack-webapp/local-edge/client'

export interface FwaUpdateState {
  phase: LocalEdgeClientPhase | 'unavailable'
  currentReleaseId?: string
  availableReleaseId?: string
  updateAvailable: boolean
}

const unavailableState: FwaUpdateState = {
  phase: 'unavailable',
  updateAvailable: false,
}

let cachedState: FwaUpdateState = unavailableState

export function projectFwaUpdateState(
  state?: LocalEdgeClientState,
): FwaUpdateState {
  if (!state) {
    return unavailableState
  }

  return {
    phase: state.phase,
    currentReleaseId: state.releaseId,
    availableReleaseId: state.availableReleaseId,
    updateAvailable: state.updateAvailable,
  }
}

export function readFwaUpdateState(): FwaUpdateState {
  const nextState = projectFwaUpdateState(getFwaLocalEdge()?.getState())
  if (
    cachedState.phase !== nextState.phase ||
    cachedState.currentReleaseId !== nextState.currentReleaseId ||
    cachedState.availableReleaseId !== nextState.availableReleaseId ||
    cachedState.updateAvailable !== nextState.updateAvailable
  ) {
    cachedState = nextState
  }
  return cachedState
}

export function subscribeFwaUpdateState(
  listener: (state: FwaUpdateState) => void,
): () => void {
  if (typeof window === 'undefined') {
    listener(unavailableState)
    return () => undefined
  }

  let unsubscribe: (() => void) | undefined
  const connect = () => {
    unsubscribe?.()
    const localEdge = getFwaLocalEdge()
    if (!localEdge) {
      listener(unavailableState)
      unsubscribe = undefined
      return
    }

    listener(projectFwaUpdateState(localEdge.getState()))
    unsubscribe = localEdge.subscribe((state) => {
      listener(projectFwaUpdateState(state))
    })
  }

  connect()
  window.addEventListener(fwaGlobalReadyEventName, connect)

  return () => {
    window.removeEventListener(fwaGlobalReadyEventName, connect)
    unsubscribe?.()
  }
}

export function applyFwaUpdate(): boolean {
  return getFwaLocalEdge()?.applyUpdate() ?? false
}

export function formatFwaReleaseId(releaseId?: string): string {
  return releaseId ? releaseId.slice(0, 8) : '—'
}
