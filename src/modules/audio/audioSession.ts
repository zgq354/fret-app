export type AudioSessionType =
  | 'auto'
  | 'playback'
  | 'play-and-record'

interface AudioSessionLike {
  type: AudioSessionType
}

interface AudioSessionNavigator {
  readonly audioSession?: AudioSessionLike
}

export function configureAudioSession(
  type: AudioSessionType,
  target: AudioSessionNavigator = navigator as AudioSessionNavigator,
): boolean {
  const session = target.audioSession
  if (!session) {
    return false
  }

  try {
    session.type = type
    return true
  } catch {
    return false
  }
}
