export type MidiSessionStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'waiting'
  | 'connected'
  | 'error'

export interface MidiInputDevice {
  id: string
  name: string
}

export interface MidiSessionState {
  status: MidiSessionStatus
  inputs: readonly MidiInputDevice[]
  selectedInputId: string | null
  errorMessage: string | null
}

export type MidiSessionAction =
  | { type: 'request' }
  | { type: 'accessReady'; inputs: readonly MidiInputDevice[] }
  | { type: 'inputsChanged'; inputs: readonly MidiInputDevice[] }
  | { type: 'selectInput'; inputId: string }
  | { type: 'failed'; message: string }

export function createMidiSessionState(
  supported: boolean,
): MidiSessionState {
  return {
    status: supported ? 'idle' : 'unsupported',
    inputs: [],
    selectedInputId: null,
    errorMessage: null,
  }
}

export function reduceMidiSession(
  state: MidiSessionState,
  action: MidiSessionAction,
): MidiSessionState {
  if (action.type === 'request') {
    if (state.status !== 'idle' && state.status !== 'error') {
      return state
    }
    return { ...state, status: 'requesting', errorMessage: null }
  }

  if (action.type === 'failed') {
    if (state.status !== 'requesting') {
      return state
    }
    return {
      ...state,
      status: 'error',
      inputs: [],
      selectedInputId: null,
      errorMessage: action.message,
    }
  }

  if (action.type === 'selectInput') {
    return state.status === 'connected' &&
      state.inputs.some((input) => input.id === action.inputId)
      ? { ...state, selectedInputId: action.inputId }
      : state
  }

  if (action.type === 'accessReady') {
    return state.status === 'requesting'
      ? withInputs(state, action.inputs)
      : state
  }

  return state.status === 'waiting' || state.status === 'connected'
    ? withInputs(state, action.inputs)
    : state
}

function withInputs(
  state: MidiSessionState,
  inputs: readonly MidiInputDevice[],
): MidiSessionState {
  const selectedInputId = inputs.some(
    (input) => input.id === state.selectedInputId,
  )
    ? state.selectedInputId
    : inputs[0]?.id ?? null

  return {
    status: inputs.length > 0 ? 'connected' : 'waiting',
    inputs: [...inputs],
    selectedInputId,
    errorMessage: null,
  }
}
