export interface DetectedPitch {
  frequency: number
  confidence: number
}
export interface PitchDetectionOptions {
  minFrequency?: number
  maxFrequency?: number
  threshold?: number
  fallbackThreshold?: number
  silenceThreshold?: number
}

const DEFAULT_OPTIONS = {
  minFrequency: 65,
  maxFrequency: 1_200,
  threshold: 0.14,
  fallbackThreshold: 0.25,
  silenceThreshold: 0.008,
} satisfies Required<PitchDetectionOptions>

export function detectPitch(
  input: Float32Array<ArrayBuffer>,
  sampleRate: number,
  options: PitchDetectionOptions = {},
): DetectedPitch | null {
  const resolved = { ...DEFAULT_OPTIONS, ...options }
  const rms = rootMeanSquare(input)

  if (rms < resolved.silenceThreshold) {
    return null
  }

  const minTau = Math.max(2, Math.floor(sampleRate / resolved.maxFrequency))
  const maxTau = Math.min(
    Math.floor(sampleRate / resolved.minFrequency),
    Math.floor(input.length / 2),
  )

  if (maxTau <= minTau) {
    return null
  }

  const difference = new Float32Array(maxTau + 1)
  const normalized = new Float32Array(maxTau + 1)
  const analysisLength = input.length - maxTau
  const mean = average(input)

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0

    for (let index = 0; index < analysisLength; index += 1) {
      const delta = input[index] - mean - (input[index + tau] - mean)
      sum += delta * delta
    }

    difference[tau] = sum
  }

  normalized[0] = 1
  let runningSum = 0

  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau]
    normalized[tau] =
      runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum
  }

  let bestTau = -1

  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (normalized[tau] >= resolved.threshold) {
      continue
    }

    bestTau = tau
    while (
      bestTau + 1 <= maxTau &&
      normalized[bestTau + 1] < normalized[bestTau]
    ) {
      bestTau += 1
    }
    break
  }

  if (bestTau === -1) {
    bestTau = findMinimumIndex(normalized, minTau, maxTau)
    if (normalized[bestTau] > resolved.fallbackThreshold) {
      return null
    }
  }

  const refinedTau = parabolicInterpolation(normalized, bestTau)
  const frequency = sampleRate / refinedTau

  if (
    frequency < resolved.minFrequency ||
    frequency > resolved.maxFrequency
  ) {
    return null
  }

  return {
    frequency,
    confidence: Math.min(1, Math.max(0, 1 - normalized[bestTau])),
  }
}

export function sensitivityToSilenceThreshold(sensitivity: number): number {
  const normalized = Math.min(100, Math.max(0, sensitivity)) / 100
  return 0.032 * Math.pow(0.0625, normalized)
}

function rootMeanSquare(input: Float32Array<ArrayBuffer>): number {
  let sum = 0
  for (const sample of input) {
    sum += sample * sample
  }
  return Math.sqrt(sum / input.length)
}

function average(input: Float32Array<ArrayBuffer>): number {
  let sum = 0
  for (const sample of input) {
    sum += sample
  }
  return sum / input.length
}

function findMinimumIndex(
  values: Float32Array<ArrayBuffer>,
  start: number,
  end: number,
): number {
  let result = start
  for (let index = start + 1; index <= end; index += 1) {
    if (values[index] < values[result]) {
      result = index
    }
  }
  return result
}

function parabolicInterpolation(
  values: Float32Array<ArrayBuffer>,
  index: number,
): number {
  if (index <= 0 || index >= values.length - 1) {
    return index
  }

  const left = values[index - 1]
  const center = values[index]
  const right = values[index + 1]
  const denominator = 2 * (left - 2 * center + right)

  if (Math.abs(denominator) < Number.EPSILON) {
    return index
  }

  const offset = (left - right) / denominator
  return index + Math.max(-1, Math.min(1, offset))
}
