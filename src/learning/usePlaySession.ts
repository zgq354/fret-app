import { useEffect, useReducer, useRef, useState } from 'react'
import { VOICE_RELEASE_MS } from '../playback/instrument'
import {
  EMPTY_PLAY_SESSION,
  getActivePlayNotes,
  getReleasingPlayNotes,
  getUniqueMidis,
  reducePlaySession,
  type PlayNoteRequest,
} from './playSession'

const PLAY_FEEDBACK_DURATION_MS = 720

export function usePlaySession() {
  const [state, dispatch] = useReducer(
    reducePlaySession,
    EMPTY_PLAY_SESSION,
  )
  const [sticky, setSticky] = useState(false)
  const [isTransient, setIsTransient] = useState(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const releaseTimerRef = useRef(new Map<string, number>())
  const activeNotes = getActivePlayNotes(state)
  const releasingNotes = getReleasingPlayNotes(state)
  const isActive = activeNotes.length > 0
  const isReleasing = releasingNotes.length > 0
  const isVisible = isActive || isReleasing || sticky || isTransient
  const focusNote = isVisible ? state.focusNote : null
  const isRecent =
    sticky &&
    !isActive &&
    !isReleasing &&
    !isTransient &&
    state.lastSnapshot.length > 0
  const displayNotes =
    isActive || isReleasing
      ? [
          ...activeNotes,
          ...releasingNotes,
          ...(isTransient ? state.lastSnapshot : []),
        ]
      : isVisible
        ? state.lastSnapshot
        : []
  const displayMidis = getUniqueMidis(displayNotes, focusNote?.midi)
  const activeMidis = getUniqueMidis(activeNotes)
  const releasingMidis = getUniqueMidis(releasingNotes)
  const transientMidis = isTransient
    ? getUniqueMidis(state.lastSnapshot, state.focusNote?.midi)
    : []
  const soundingMidis = [
    ...new Set([...activeMidis, ...transientMidis]),
  ]

  useEffect(() => {
    const releaseVoiceIds = new Set(
      state.releasingVoices.map((voice) => voice.voiceId),
    )
    for (const [voiceId, timerId] of releaseTimerRef.current) {
      if (!releaseVoiceIds.has(voiceId)) {
        window.clearTimeout(timerId)
        releaseTimerRef.current.delete(voiceId)
      }
    }
    for (const voice of state.releasingVoices) {
      if (releaseTimerRef.current.has(voice.voiceId)) {
        continue
      }
      const timerId = window.setTimeout(() => {
        releaseTimerRef.current.delete(voice.voiceId)
        dispatch({ type: 'releaseExpired', voiceId: voice.voiceId })
      }, VOICE_RELEASE_MS)
      releaseTimerRef.current.set(voice.voiceId, timerId)
    }
  }, [state.releasingVoices])

  useEffect(() => {
    const releaseTimers = releaseTimerRef.current
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
      for (const timerId of releaseTimers.values()) {
        window.clearTimeout(timerId)
      }
      releaseTimers.clear()
    }
  }, [])

  const clearTransient = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    setIsTransient(false)
  }

  return {
    focusNote,
    displayNotes,
    displayMidis,
    soundingMidis,
    releasingMidis,
    isActive,
    isReleasing,
    isRecent,
    isTransient,
    sticky,
    setSticky,
    clear() {
      clearTransient()
      dispatch({ type: 'clear' })
    },
    trigger(request: PlayNoteRequest) {
      dispatch({ type: 'trigger', request })
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
      setIsTransient(true)
      feedbackTimerRef.current = window.setTimeout(() => {
        feedbackTimerRef.current = null
        setIsTransient(false)
      }, PLAY_FEEDBACK_DURATION_MS)
    },
    noteOn(voiceId: string, request: PlayNoteRequest) {
      clearTransient()
      dispatch({ type: 'noteOn', voiceId, request })
    },
    noteOff(voiceId: string) {
      dispatch({ type: 'noteOff', voiceId })
    },
  }
}
