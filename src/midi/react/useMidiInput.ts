import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  parseMidiMessage,
  type MidiNoteOnEvent,
} from '../midiMessage'
import {
  createMidiSessionState,
  reduceMidiSession,
  type MidiInputDevice,
  type MidiSessionState,
} from '../midiSession'

type RequestMidiAccess = (
  options?: MIDIOptions,
) => Promise<MIDIAccess>

interface ActiveMidiVoice {
  inputId: string
  channel: number
}

interface UseMidiInputOptions {
  enabled: boolean
  onNoteOn: (event: MidiNoteOnEvent, inputName: string) => void
  onNoteOff: (voiceId: string) => void
}

export interface MidiInputState extends MidiSessionState {
  connect: () => Promise<void>
  selectInput: (inputId: string) => void
}

export function useMidiInput({
  enabled,
  onNoteOn,
  onNoteOff,
}: UseMidiInputOptions): MidiInputState {
  const requesterRef = useRef<RequestMidiAccess | null>(getMidiRequester())
  const [session, dispatch] = useReducer(
    reduceMidiSession,
    requesterRef.current !== null,
    createMidiSessionState,
  )
  const accessRef = useRef<MIDIAccess | null>(null)
  const activeVoicesRef = useRef(new Map<string, ActiveMidiVoice>())
  const enabledRef = useRef(enabled)
  const callbacksRef = useRef({ onNoteOn, onNoteOff })
  const requestRef = useRef<Promise<void> | null>(null)
  const disposedRef = useRef(false)
  enabledRef.current = enabled
  callbacksRef.current = { onNoteOn, onNoteOff }

  const releaseVoices = useCallback(
    (matches: (voice: ActiveMidiVoice) => boolean) => {
      for (const [voiceId, voice] of activeVoicesRef.current) {
        if (!matches(voice)) {
          continue
        }
        activeVoicesRef.current.delete(voiceId)
        callbacksRef.current.onNoteOff(voiceId)
      }
    },
    [],
  )

  const connect = useCallback(async () => {
    if (requestRef.current) {
      return requestRef.current
    }

    const requester = requesterRef.current
    if (!requester) {
      return
    }

    dispatch({ type: 'request' })
    const request = requester({ sysex: false })
      .then((access) => {
        if (disposedRef.current) {
          access.onstatechange = null
          return
        }
        accessRef.current = access
        const refreshInputs = () => {
          dispatch({
            type: 'inputsChanged',
            inputs: listMidiInputs(access),
          })
        }
        access.onstatechange = refreshInputs
        dispatch({ type: 'accessReady', inputs: listMidiInputs(access) })
      })
      .catch((error: unknown) => {
        if (!disposedRef.current) {
          dispatch({ type: 'failed', message: getMidiErrorMessage(error) })
        }
      })
      .finally(() => {
        requestRef.current = null
      })

    requestRef.current = request
    return request
  }, [])

  const selectInput = useCallback((inputId: string) => {
    dispatch({ type: 'selectInput', inputId })
  }, [])

  useEffect(() => {
    if (!enabled) {
      releaseVoices(() => true)
    }
  }, [enabled, releaseVoices])

  useEffect(() => {
    if (session.status !== 'connected' || !session.selectedInputId) {
      return
    }

    const input = accessRef.current?.inputs.get(session.selectedInputId)
    if (!input || input.state === 'disconnected') {
      return
    }

    const inputName = getMidiInputName(input, 0)
    input.onmidimessage = (message) => {
      if (!enabledRef.current || !message.data) {
        return
      }

      const event = parseMidiMessage(message.data, input.id)
      if (!event) {
        return
      }

      if (event.type === 'allNotesOff') {
        releaseVoices(
          (voice) =>
            voice.inputId === event.inputId &&
            voice.channel === event.channel,
        )
        return
      }

      if (event.type === 'noteOff') {
        if (activeVoicesRef.current.delete(event.voiceId)) {
          callbacksRef.current.onNoteOff(event.voiceId)
        }
        return
      }

      if (activeVoicesRef.current.has(event.voiceId)) {
        callbacksRef.current.onNoteOff(event.voiceId)
      }
      activeVoicesRef.current.set(event.voiceId, {
        inputId: event.inputId,
        channel: event.channel,
      })
      callbacksRef.current.onNoteOn(event, inputName)
    }

    return () => {
      input.onmidimessage = null
      releaseVoices((voice) => voice.inputId === input.id)
    }
  }, [releaseVoices, session.selectedInputId, session.status])

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      if (accessRef.current) {
        accessRef.current.onstatechange = null
      }
      releaseVoices(() => true)
    }
  }, [releaseVoices])

  return { ...session, connect, selectInput }
}

function getMidiRequester(): RequestMidiAccess | null {
  const requestMidiAccess = Reflect.get(navigator, 'requestMIDIAccess') as
    | RequestMidiAccess
    | undefined
  return requestMidiAccess?.bind(navigator) ?? null
}

function listMidiInputs(access: MIDIAccess): MidiInputDevice[] {
  return [...access.inputs.values()]
    .filter((input) => input.state !== 'disconnected')
    .map((input, index) => ({
      id: input.id,
      name: getMidiInputName(input, index),
    }))
}

function getMidiInputName(input: MIDIInput, index: number): string {
  const parts = [input.manufacturer, input.name].filter(
    (part): part is string => Boolean(part),
  )
  return parts.join(' · ') || 'MIDI 设备 ' + (index + 1)
}

function getMidiErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'MIDI 权限未授予，可点击重试。'
  }
  return 'MIDI 连接失败，请检查设备与浏览器权限。'
}
