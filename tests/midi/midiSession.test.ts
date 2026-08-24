import { describe, expect, it } from 'vitest'
import {
  createMidiSessionState,
  reduceMidiSession,
  type MidiInputDevice,
} from '../../src/midi/midiSession'

const keyboard: MidiInputDevice = { id: 'keyboard', name: 'Keyboard' }
const pads: MidiInputDevice = { id: 'pads', name: 'Pads' }

describe('reduceMidiSession', () => {
  it('keeps unsupported browsers outside the permission flow', () => {
    const state = createMidiSessionState(false)
    expect(reduceMidiSession(state, { type: 'request' })).toBe(state)
  })

  it('moves through permission, waiting and connected states', () => {
    const initial = createMidiSessionState(true)
    const requesting = reduceMidiSession(initial, { type: 'request' })
    const waiting = reduceMidiSession(requesting, {
      type: 'accessReady',
      inputs: [],
    })
    const connected = reduceMidiSession(waiting, {
      type: 'inputsChanged',
      inputs: [keyboard, pads],
    })

    expect(requesting.status).toBe('requesting')
    expect(waiting.status).toBe('waiting')
    expect(connected).toMatchObject({
      status: 'connected',
      selectedInputId: 'keyboard',
    })
  })

  it('preserves an available selection and falls back after disconnect', () => {
    const requesting = reduceMidiSession(createMidiSessionState(true), {
      type: 'request',
    })
    const connected = reduceMidiSession(requesting, {
      type: 'accessReady',
      inputs: [keyboard, pads],
    })
    const selectedPads = reduceMidiSession(connected, {
      type: 'selectInput',
      inputId: 'pads',
    })
    const reordered = reduceMidiSession(selectedPads, {
      type: 'inputsChanged',
      inputs: [pads, keyboard],
    })
    const disconnected = reduceMidiSession(reordered, {
      type: 'inputsChanged',
      inputs: [keyboard],
    })

    expect(reordered.selectedInputId).toBe('pads')
    expect(disconnected.selectedInputId).toBe('keyboard')
  })

  it('exposes a retryable error state', () => {
    const requesting = reduceMidiSession(createMidiSessionState(true), {
      type: 'request',
    })
    const failed = reduceMidiSession(requesting, {
      type: 'failed',
      message: 'Permission denied',
    })
    const retrying = reduceMidiSession(failed, { type: 'request' })

    expect(failed).toMatchObject({
      status: 'error',
      errorMessage: 'Permission denied',
    })
    expect(retrying).toMatchObject({
      status: 'requesting',
      errorMessage: null,
    })
  })

  it('ignores events that are invalid for the current state', () => {
    const idle = createMidiSessionState(true)
    const unsupported = createMidiSessionState(false)

    expect(
      reduceMidiSession(idle, {
        type: 'inputsChanged',
        inputs: [keyboard],
      }),
    ).toBe(idle)
    expect(
      reduceMidiSession(unsupported, {
        type: 'accessReady',
        inputs: [keyboard],
      }),
    ).toBe(unsupported)
  })
})
