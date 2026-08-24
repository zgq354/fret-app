import { describe, expect, it } from 'vitest'
import {
  EMPTY_PLAY_SESSION,
  getActivePlayNotes,
  getReleasingPlayNotes,
  getUniqueMidis,
  reducePlaySession,
  type PlayNoteRequest,
} from './playSession'

describe('reducePlaySession', () => {
  it('tracks multiple voices and releases them independently', () => {
    const c4 = piano(60)
    const e4 = piano(64)
    const withC = reducePlaySession(EMPTY_PLAY_SESSION, {
      type: 'noteOn',
      voiceId: 'piano:1',
      request: c4,
    })
    const chord = reducePlaySession(withC, {
      type: 'noteOn',
      voiceId: 'piano:2',
      request: e4,
    })
    const releasedE = reducePlaySession(chord, {
      type: 'noteOff',
      voiceId: 'piano:2',
    })
    const releasedAll = reducePlaySession(releasedE, {
      type: 'noteOff',
      voiceId: 'piano:1',
    })

    expect(getActivePlayNotes(chord)).toEqual([c4, e4])
    expect(chord.focusNote).toBe(e4)
    expect(getActivePlayNotes(releasedE)).toEqual([c4])
    expect(getReleasingPlayNotes(releasedE)).toEqual([e4])
    expect(releasedE.focusNote).toBe(c4)
    expect(getActivePlayNotes(releasedAll)).toEqual([])
    expect(getReleasingPlayNotes(releasedAll)).toEqual([e4, c4])
    expect(releasedAll.lastSnapshot).toEqual([c4, e4])
    expect(releasedAll.focusNote).toBe(c4)
  })

  it('keeps equal pitches owned by separate voices', () => {
    const first = reducePlaySession(EMPTY_PLAY_SESSION, {
      type: 'noteOn',
      voiceId: 'fretboard:1',
      request: fretboard(64, 1, 0),
    })
    const second = reducePlaySession(first, {
      type: 'noteOn',
      voiceId: 'fretboard:2',
      request: fretboard(64, 2, 5),
    })
    const releasedFirst = reducePlaySession(second, {
      type: 'noteOff',
      voiceId: 'fretboard:1',
    })

    expect(second.activeVoices).toHaveLength(2)
    expect(getUniqueMidis(second.lastSnapshot)).toEqual([64])
    expect(releasedFirst.activeVoices).toHaveLength(1)
  })

  it('replaces a moving voice and starts a fresh snapshot after release', () => {
    const started = reducePlaySession(EMPTY_PLAY_SESSION, {
      type: 'noteOn',
      voiceId: 'piano:1',
      request: piano(60),
    })
    const moved = reducePlaySession(started, {
      type: 'noteOn',
      voiceId: 'piano:1',
      request: piano(62),
    })
    const ended = reducePlaySession(moved, {
      type: 'noteOff',
      voiceId: 'piano:1',
    })
    const nextGesture = reducePlaySession(ended, {
      type: 'noteOn',
      voiceId: 'piano:2',
      request: piano(67),
    })

    expect(moved.activeVoices).toHaveLength(1)
    expect(moved.lastSnapshot).toEqual([piano(62)])
    expect(nextGesture.lastSnapshot).toEqual([piano(67)])
  })

  it('keeps a one-shot note as the latest snapshot', () => {
    const state = reducePlaySession(EMPTY_PLAY_SESSION, {
      type: 'trigger',
      request: piano(69),
    })

    expect(state.lastSnapshot).toEqual([piano(69)])
    expect(state.focusNote).toEqual(piano(69))
    expect(state.activeVoices).toEqual([])
  })

  it('expires release tails independently and cancels one on retrigger', () => {
    const c4 = piano(60)
    const e4 = piano(64)
    const chord = reducePlaySession(
      reducePlaySession(EMPTY_PLAY_SESSION, {
        type: 'noteOn',
        voiceId: 'piano:1',
        request: c4,
      }),
      { type: 'noteOn', voiceId: 'piano:2', request: e4 },
    )
    const releasedC = reducePlaySession(chord, {
      type: 'noteOff',
      voiceId: 'piano:1',
    })
    const releasedBoth = reducePlaySession(releasedC, {
      type: 'noteOff',
      voiceId: 'piano:2',
    })
    const retriggeredC = reducePlaySession(releasedBoth, {
      type: 'noteOn',
      voiceId: 'piano:1',
      request: c4,
    })
    const expiredE = reducePlaySession(retriggeredC, {
      type: 'releaseExpired',
      voiceId: 'piano:2',
    })

    expect(getReleasingPlayNotes(releasedBoth)).toEqual([c4, e4])
    expect(getReleasingPlayNotes(retriggeredC)).toEqual([e4])
    expect(getReleasingPlayNotes(expiredE)).toEqual([])
    expect(getActivePlayNotes(expiredE)).toEqual([c4])
  })
})

function piano(midi: number): PlayNoteRequest {
  return { midi, instrumentId: 'piano', source: 'piano' }
}

function fretboard(
  midi: number,
  stringNumber: number,
  fret: number,
): PlayNoteRequest {
  return {
    midi,
    instrumentId: 'guitar',
    source: 'fretboard',
    stringNumber,
    fret,
  }
}
