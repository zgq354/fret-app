import { useSyncExternalStore } from 'react'
import {
  readFwaUpdateState,
  subscribeFwaUpdateState,
} from '../fwa-update'

export function useFwaUpdateState() {
  return useSyncExternalStore(
    (notify) => subscribeFwaUpdateState(notify),
    readFwaUpdateState,
    readFwaUpdateState,
  )
}
