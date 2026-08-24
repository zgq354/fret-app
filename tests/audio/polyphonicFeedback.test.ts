import { describe, expect, it } from 'vitest'
import { resolvePolyphonicFeedback } from '../../src/modules/audio/polyphonicFeedback'

describe('polyphonic feedback', () => {
  it('makes model loading explicit', () => {
    expect(
      resolvePolyphonicFeedback({
        modelState: 'loading',
        analysisState: 'collecting',
        visibleChord: null,
        hasLiveChord: false,
      }),
    ).toMatchObject({
      title: '准备识别',
      appearance: 'busy',
      isBusy: true,
    })
  })

  it('distinguishes an analyzed window with no chord', () => {
    expect(
      resolvePolyphonicFeedback({
        modelState: 'ready',
        analysisState: 'no-result',
        visibleChord: null,
        hasLiveChord: false,
      }),
    ).toMatchObject({
      title: '未识别到和弦',
      appearance: 'no-result',
      isBusy: false,
    })
  })

  it('marks a live chord as a completed result', () => {
    expect(
      resolvePolyphonicFeedback({
        modelState: 'ready',
        analysisState: 'result',
        visibleChord: { chordLabel: 'C', noteCount: 3 },
        hasLiveChord: true,
      }),
    ).toMatchObject({
      label: '已识别 · 3 个同时音符',
      title: 'C',
      appearance: 'result',
    })
  })

  it('keeps a sticky result visibly distinct while analyzing', () => {
    expect(
      resolvePolyphonicFeedback({
        modelState: 'ready',
        analysisState: 'analyzing',
        visibleChord: { chordLabel: 'Am', noteCount: 3 },
        hasLiveChord: false,
      }),
    ).toMatchObject({
      title: 'Am',
      shortLabel: 'Am',
      appearance: 'busy',
      isBusy: true,
    })
  })
})
