import { useSyncExternalStore } from 'react'
import {
  readFwaDebugState,
  subscribeFwaDebugState,
} from '../fwa-debug-state'

export function useFwaDebugState() {
  return useSyncExternalStore(
    (notify) => subscribeFwaDebugState(notify),
    readFwaDebugState,
    readFwaDebugState,
  )
}
