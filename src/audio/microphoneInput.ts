import type { AudioSettings } from './audioSettings'

export type MicrophoneDetectionStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'denied'
  | 'unsupported'
  | 'error'

export function createMicrophoneConstraints(
  settings: AudioSettings,
): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    autoGainControl: settings.autoGainControl,
    echoCancellation: settings.echoCancellation,
    noiseSuppression: settings.noiseSuppression,
  }

  if (settings.preferredSampleRate !== 0) {
    constraints.sampleRate = { ideal: settings.preferredSampleRate }
  }
  if (settings.preferredChannelCount !== 0) {
    constraints.channelCount = { ideal: settings.preferredChannelCount }
  }

  return constraints
}

export function stopMediaStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
