import type { InstrumentId } from '../../modules/playback/instrument'
import type { MidiSessionState } from '../../modules/midi/midiSession'
import './MidiInputControl.css'

interface MidiInputControlProps {
  midi: MidiSessionState
  instrumentId: InstrumentId
  onConnect: () => void
  onSelectInput: (inputId: string) => void
  onInstrumentChange: (instrumentId: InstrumentId) => void
}

export function MidiInputControl({
  midi,
  instrumentId,
  onConnect,
  onSelectInput,
  onInstrumentChange,
}: MidiInputControlProps) {
  return (
    <div className="pitch-control-group midi-input-control">
      <div className="midi-control-row">
        <span className="control-label">MIDI 输入</span>
        <MidiConnectionControl
          midi={midi}
          onConnect={onConnect}
          onSelectInput={onSelectInput}
        />
      </div>
      {midi.status === 'unsupported' ? null : (
        <div className="midi-control-row">
          <span className="control-label">音色</span>
          <div className="midi-instrument-switch" aria-label="MIDI 音色">
            <button
              type="button"
              className={instrumentId === 'guitar' ? 'is-selected' : ''}
              aria-pressed={instrumentId === 'guitar'}
              onClick={() => onInstrumentChange('guitar')}
            >
              吉他
            </button>
            <button
              type="button"
              className={instrumentId === 'piano' ? 'is-selected' : ''}
              aria-pressed={instrumentId === 'piano'}
              onClick={() => onInstrumentChange('piano')}
            >
              钢琴
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MidiConnectionControl({
  midi,
  onConnect,
  onSelectInput,
}: Pick<
  MidiInputControlProps,
  'midi' | 'onConnect' | 'onSelectInput'
>) {
  if (midi.status === 'connected') {
    return (
      <select
        className="midi-device-select"
        name="midi-input-device"
        aria-label="MIDI 输入设备"
        value={midi.selectedInputId ?? ''}
        title={
          midi.inputs.find((input) => input.id === midi.selectedInputId)?.name
        }
        onChange={(event) => onSelectInput(event.currentTarget.value)}
      >
        {midi.inputs.map((input) => (
          <option key={input.id} value={input.id}>
            {input.name}
          </option>
        ))}
      </select>
    )
  }

  if (midi.status === 'waiting') {
    return <span className="midi-connection-status">等待设备</span>
  }

  if (midi.status === 'unsupported') {
    return (
      <span className="midi-connection-status is-unsupported">
        需桌面 Chrome
      </span>
    )
  }

  const isRequesting = midi.status === 'requesting'
  return (
    <button
      type="button"
      className="midi-connect-button"
      disabled={isRequesting}
      title={midi.errorMessage ?? '连接桌面 MIDI 输入设备'}
      onClick={onConnect}
    >
      {isRequesting
        ? '正在授权'
        : midi.status === 'error'
          ? '重试 MIDI'
          : '连接 MIDI'}
    </button>
  )
}
