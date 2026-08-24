export interface PolyphonicPitchNote {
  midi: number
  activation: number
}

export interface TimedPitchEvent {
  startTimeSeconds: number
  durationSeconds: number
  pitchMidi: number
  amplitude: number
}

export interface PolyphonicPitchFrame {
  capturedAt: number
  notes: readonly PolyphonicPitchNote[]
}

interface SelectSimultaneousNotesOptions {
  analysisDurationSeconds: number
  lookbackSeconds?: number
  minDurationSeconds?: number
  minMidi?: number
  maxMidi?: number
  maxNotes?: number
  minActivation?: number
}

const DEFAULT_LOOKBACK_SECONDS = 0.9
const DEFAULT_MIN_DURATION_SECONDS = 0.08
const DEFAULT_MIN_MIDI = 21
const DEFAULT_MAX_MIDI = 108
const DEFAULT_MAX_NOTES = 6
const DEFAULT_MIN_ACTIVATION = 0.3
const RELATIVE_ACTIVATION_FLOOR = 0.45
const ARTIFACT_ACTIVATION_GAP = 0.2
const SNAPSHOT_STEP_SECONDS = 0.04

/**
 * Finds the most populated simultaneous snapshot near the end of a Basic Pitch
 * transcription. A held chord survives; adjacent notes from a melody do not get
 * merged merely because they occurred in the same analysis window.
 */
export function selectSimultaneousNotes(
  events: readonly TimedPitchEvent[],
  options: SelectSimultaneousNotesOptions,
): readonly PolyphonicPitchNote[] {
  const lookbackSeconds =
    options.lookbackSeconds ?? DEFAULT_LOOKBACK_SECONDS
  const minDurationSeconds =
    options.minDurationSeconds ?? DEFAULT_MIN_DURATION_SECONDS
  const minMidi = options.minMidi ?? DEFAULT_MIN_MIDI
  const maxMidi = options.maxMidi ?? DEFAULT_MAX_MIDI
  const maxNotes = options.maxNotes ?? DEFAULT_MAX_NOTES
  const minActivation =
    options.minActivation ?? DEFAULT_MIN_ACTIVATION
  const windowEnd = options.analysisDurationSeconds
  const windowStart = Math.max(0, windowEnd - lookbackSeconds)
  const candidates = events.filter((event) => {
    const eventEnd = event.startTimeSeconds + event.durationSeconds
    return (
      event.pitchMidi >= minMidi &&
      event.pitchMidi <= maxMidi &&
      event.durationSeconds >= minDurationSeconds &&
      eventEnd >= windowStart &&
      event.startTimeSeconds <= windowEnd
    )
  })

  if (candidates.length === 0) {
    return []
  }

  let bestTime = windowStart
  let bestCount = 0
  let bestActivation = 0

  for (
    let time = windowStart;
    time <= windowEnd + Number.EPSILON;
    time += SNAPSHOT_STEP_SECONDS
  ) {
    const active = candidates.filter((event) => isActiveAt(event, time))
    const uniqueCount = new Set(active.map((event) => event.pitchMidi)).size
    const activation = active.reduce(
      (sum, event) => sum + event.amplitude,
      0,
    )

    if (
      uniqueCount > bestCount ||
      (uniqueCount === bestCount && activation >= bestActivation)
    ) {
      bestTime = time
      bestCount = uniqueCount
      bestActivation = activation
    }
  }

  const activationByMidi = new Map<number, number>()
  for (const event of candidates) {
    if (!isActiveAt(event, bestTime)) {
      continue
    }

    activationByMidi.set(
      event.pitchMidi,
      Math.max(activationByMidi.get(event.pitchMidi) ?? 0, event.amplitude),
    )
  }

  const notes = [...activationByMidi]
    .map(([midi, activation]) => ({ midi, activation }))
  const peakActivation = Math.max(
    0,
    ...notes.map((note) => note.activation),
  )
  const activationFloor = Math.max(
    minActivation,
    peakActivation * RELATIVE_ACTIVATION_FLOOR,
  )

  const ranked = notes
    .filter((note) => note.activation >= activationFloor)
    .sort((left, right) => right.activation - left.activation)
  const artifactGapIndex = ranked.findIndex(
    (note, index) =>
      index >= 2 &&
      index < ranked.length - 1 &&
      note.activation - ranked[index + 1].activation >=
        ARTIFACT_ACTIVATION_GAP,
  )
  const confident =
    artifactGapIndex === -1
      ? ranked
      : ranked.slice(0, artifactGapIndex + 1)

  return confident
    .slice(0, maxNotes)
    .sort((left, right) => left.midi - right.midi)
}

function isActiveAt(event: TimedPitchEvent, time: number): boolean {
  return (
    event.startTimeSeconds <= time &&
    event.startTimeSeconds + event.durationSeconds >= time
  )
}
