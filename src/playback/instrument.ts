export type InstrumentId = 'guitar' | 'piano'

export const VOICE_RELEASE_MS = 520

export interface InstrumentDriver {
  trigger(midi: number): void
  noteOn(voiceId: string, midi: number, velocity?: number): void
  noteOff(voiceId: string): void
  stopAll(): void
  dispose(): void
}

export interface PlaybackBackend {
  instruments: Record<InstrumentId, InstrumentDriver>
  unlock(): Promise<void>
  dispose(): void
}

export interface PlaybackRuntime {
  prepare(): Promise<void>
  trigger(instrumentId: InstrumentId, midi: number): Promise<void>
  noteOn(
    voiceId: string,
    instrumentId: InstrumentId,
    midi: number,
    velocity?: number,
  ): Promise<void>
  noteOff(voiceId: string): void
  stopAll(): void
  dispose(): void
}

export type CreatePlaybackBackend = () => PlaybackBackend
