import {
  fwaGlobalReadyEventName,
  getFwaLocalEdge,
  type FwaDebugState,
} from '@fullstack-webapp/local-edge/client'

export interface FwaDebugStateSnapshot {
  available: boolean
  enabled: boolean
}

const unavailableState: FwaDebugStateSnapshot = {
  available: false,
  enabled: false,
}

export function projectFwaDebugState(
  state?: FwaDebugState,
): FwaDebugStateSnapshot {
  return state ? { available: true, enabled: state.enabled } : unavailableState
}

export function readFwaDebugState(): FwaDebugStateSnapshot {
  return projectFwaDebugState(getFwaLocalEdge()?.debug?.getState())
}

export function subscribeFwaDebugState(
  listener: (state: FwaDebugStateSnapshot) => void,
): () => void {
  if (typeof window === 'undefined') {
    listener(unavailableState)
    return () => undefined
  }

  let unsubscribe: (() => void) | undefined
  const connect = () => {
    unsubscribe?.()
    const debug = getFwaLocalEdge()?.debug
    if (!debug) {
      listener(unavailableState)
      unsubscribe = undefined
      return
    }

    unsubscribe = debug.subscribe((state) => {
      listener(projectFwaDebugState(state))
    })
  }

  connect()
  window.addEventListener(fwaGlobalReadyEventName, connect)

  return () => {
    window.removeEventListener(fwaGlobalReadyEventName, connect)
    unsubscribe?.()
  }
}

export function setFwaDebugEnabled(enabled: boolean): boolean {
  const debug = getFwaLocalEdge()?.debug
  if (!debug) {
    return false
  }

  debug.setEnabled(enabled)
  return true
}
