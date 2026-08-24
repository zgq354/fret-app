import {
  forwardRef,
  useId,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  areDefaultAudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  type AnalysisFftSize,
  type AudioSettings,
  type PreferredChannelCount,
  type PreferredSampleRate,
} from '../../modules/audio/audioSettings'
import { sensitivityToSilenceThreshold } from '../../modules/audio/detectPitch'
import type { PolyphonicModelState } from '../../modules/audio/polyphonicInferenceMessages'
import { MiddleCStyle } from '../../modules/music/musicTheory'
import {
  areDefaultDisplaySettings,
  DefaultDisplaySettings,
  type DisplaySettings,
} from '../../modules/settings/displaySettings'
import {
  formatFwaReleaseId,
  type FwaUpdateState,
} from '../../platform/fwa-update/fwa-update'

export interface TechnicalSettingsProps {
  settings: AudioSettings
  displaySettings: DisplaySettings
  fwaDebugAvailable: boolean
  fwaDebugEnabled: boolean
  fwaUpdate: FwaUpdateState
  trackSettings: MediaTrackSettings | null
  analysisSampleRate: number | null
  polyphonicRuntime: {
    modelState: PolyphonicModelState
    workerBackend: string | null
    modelLoadMs: number | null
    inferenceMs: number | null
  }
  onChange: (patch: Partial<AudioSettings>) => void
  onDisplayChange: (patch: Partial<DisplaySettings>) => void
  onFwaDebugChange: (enabled: boolean) => void
  onApplyFwaUpdate: () => boolean
  onReset: () => void
}

interface TechnicalSettingsComponentProps extends TechnicalSettingsProps {
  style?: CSSProperties
}

export const TechnicalSettings = forwardRef<
  HTMLDivElement,
  TechnicalSettingsComponentProps
>(function TechnicalSettings({
  style,
  settings,
  displaySettings,
  fwaDebugAvailable,
  fwaDebugEnabled,
  fwaUpdate,
  trackSettings,
  analysisSampleRate,
  polyphonicRuntime,
  onChange,
  onDisplayChange,
  onFwaDebugChange,
  onApplyFwaUpdate,
  onReset,
}: TechnicalSettingsComponentProps, ref) {
  return (
    <div ref={ref} className="technical-settings-panel" style={style}>
      <div className="settings-panel-heading">
        <div>
          <span className="control-label">Settings</span>
          <strong>显示与识别设置</strong>
        </div>
        <span className="settings-saved">已保存到本机</span>
      </div>

      <SettingsSection title="音名与记谱">
        <SelectSetting
          label="中央 C 编号"
          value={displaySettings.middleCStyle}
          defaultValue={DefaultDisplaySettings.middleCStyle}
          onChange={(middleCStyle) => onDisplayChange({ middleCStyle })}
          options={[
            [MiddleCStyle.Scientific, 'C4 · 科学音高'],
            [MiddleCStyle.Yamaha, 'C3 · Yamaha / Logic'],
            [MiddleCStyle.FLStudio, 'C5 · FL Studio'],
          ]}
        />
        <p className="settings-inline-note">
          只改变音名编号，不改变频率、MIDI、指板位置或发声。吉他是实际发音比谱面低八度的移调乐器；吉他谱模式使用高音谱号下方 8 明示该关系。
          <span className="settings-reference-links">
            依据：
            <a
              href="https://support.apple.com/guide/logicpro/general-settings-lgcp9793a910/mac"
              target="_blank"
              rel="noreferrer"
            >
              Apple Logic
            </a>
            <a
              href="https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_scripting_api.htm"
              target="_blank"
              rel="noreferrer"
            >
              FL Studio
            </a>
            <a
              href="https://lilypond.org/doc/v2.23/Documentation/notation/common-notation-for-fretted-strings.html"
              target="_blank"
              rel="noreferrer"
            >
              LilyPond
            </a>
            <a
              href="https://www.w3.org/2021/06/musicxml40/tutorial/notation-basics/"
              target="_blank"
              rel="noreferrer"
            >
              MusicXML
            </a>
          </span>
        </p>
      </SettingsSection>

      <SettingsSection title="输入与音域">
        <RangeSetting
          label="输入灵敏度"
          value={settings.sensitivity}
          defaultValue={DEFAULT_AUDIO_SETTINGS.sensitivity}
          output={String(settings.sensitivity)}
          min={0}
          max={100}
          step={5}
          onChange={(sensitivity) => onChange({ sensitivity })}
        />
        <p className="settings-inline-note">
          RMS 门限{' '}
          {sensitivityToSilenceThreshold(settings.sensitivity).toFixed(4)}；数值越高，弱音越容易进入检测。
        </p>
        <div className="settings-pair">
          <RangeSetting
            label="最低频率"
            value={settings.minFrequency}
            defaultValue={DEFAULT_AUDIO_SETTINGS.minFrequency}
            output={settings.minFrequency + ' Hz'}
            min={40}
            max={200}
            step={5}
            onChange={(minFrequency) => onChange({ minFrequency })}
          />
          <RangeSetting
            label="最高频率"
            value={settings.maxFrequency}
            defaultValue={DEFAULT_AUDIO_SETTINGS.maxFrequency}
            output={settings.maxFrequency + ' Hz'}
            min={200}
            max={2_000}
            step={50}
            onChange={(maxFrequency) => onChange({ maxFrequency })}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="判定与稳定">
        <RangeSetting
          label="最低置信度"
          value={settings.minConfidence}
          defaultValue={DEFAULT_AUDIO_SETTINGS.minConfidence}
          output={Math.round(settings.minConfidence * 100) + '%'}
          min={0.4}
          max={0.95}
          step={0.01}
          onChange={(minConfidence) => onChange({ minConfidence })}
        />
        <div className="settings-pair">
          <RangeSetting
            label="周期匹配阈值"
            value={settings.pitchThreshold}
            defaultValue={DEFAULT_AUDIO_SETTINGS.pitchThreshold}
            output={settings.pitchThreshold.toFixed(2)}
            min={0.05}
            max={0.3}
            step={0.01}
            onChange={(pitchThreshold) => onChange({ pitchThreshold })}
          />
          <RangeSetting
            label="兜底阈值"
            value={settings.fallbackThreshold}
            defaultValue={DEFAULT_AUDIO_SETTINGS.fallbackThreshold}
            output={settings.fallbackThreshold.toFixed(2)}
            min={0.1}
            max={0.5}
            step={0.01}
            onChange={(fallbackThreshold) =>
              onChange({ fallbackThreshold })
            }
          />
        </div>
        <RangeSetting
          label="稳定窗口"
          value={settings.historySize}
          defaultValue={DEFAULT_AUDIO_SETTINGS.historySize}
          output={settings.historySize + ' 帧'}
          min={1}
          max={9}
          step={1}
          onChange={(historySize) => onChange({ historySize })}
        />
      </SettingsSection>

      <SettingsSection title="多音识别 · 实验">
        <div className="settings-pair">
          <RangeSetting
            label="起音阈值"
            value={settings.polyphonicOnsetThreshold}
            defaultValue={DEFAULT_AUDIO_SETTINGS.polyphonicOnsetThreshold}
            output={settings.polyphonicOnsetThreshold.toFixed(2)}
            min={0.2}
            max={0.7}
            step={0.05}
            onChange={(polyphonicOnsetThreshold) =>
              onChange({ polyphonicOnsetThreshold })
            }
          />
          <RangeSetting
            label="持续帧阈值"
            value={settings.polyphonicFrameThreshold}
            defaultValue={DEFAULT_AUDIO_SETTINGS.polyphonicFrameThreshold}
            output={settings.polyphonicFrameThreshold.toFixed(2)}
            min={0.15}
            max={0.6}
            step={0.05}
            onChange={(polyphonicFrameThreshold) =>
              onChange({ polyphonicFrameThreshold })
            }
          />
          <RangeSetting
            label="结果激活门限"
            value={settings.polyphonicMinActivation}
            defaultValue={DEFAULT_AUDIO_SETTINGS.polyphonicMinActivation}
            output={settings.polyphonicMinActivation.toFixed(2)}
            min={0.2}
            max={0.7}
            step={0.05}
            onChange={(polyphonicMinActivation) =>
              onChange({ polyphonicMinActivation })
            }
          />
          <RangeSetting
            label="最多音符"
            value={settings.polyphonicMaxNotes}
            defaultValue={DEFAULT_AUDIO_SETTINGS.polyphonicMaxNotes}
            output={settings.polyphonicMaxNotes + ' 音'}
            min={2}
            max={10}
            step={1}
            onChange={(polyphonicMaxNotes) =>
              onChange({ polyphonicMaxNotes })
            }
          />
        </div>
        <RangeSetting
          label="多音刷新间隔"
          value={settings.polyphonicAnalysisIntervalMs}
          defaultValue={DEFAULT_AUDIO_SETTINGS.polyphonicAnalysisIntervalMs}
          output={settings.polyphonicAnalysisIntervalMs + ' ms'}
          min={500}
          max={2_000}
          step={50}
          onChange={(polyphonicAnalysisIntervalMs) =>
            onChange({ polyphonicAnalysisIntervalMs })
          }
        />
        <div className="settings-reported">
          <span>和弦 Worker</span>
          <strong>{formatPolyphonicRuntime(polyphonicRuntime)}</strong>
        </div>
        <p className="settings-inline-note">
          多音模式使用约 2 秒滚动窗口；阈值越高越保守，可减少泛音误报，但也可能漏掉较弱音符。
          <span className="settings-reference-links">
            上游：
            <a
              href="https://github.com/spotify/basic-pitch-ts"
              target="_blank"
              rel="noreferrer"
            >
              Basic Pitch TS
            </a>
            <a
              href="https://arxiv.org/abs/2203.09893"
              target="_blank"
              rel="noreferrer"
            >
              Basic Pitch 论文
            </a>
          </span>
        </p>
      </SettingsSection>

      <SettingsSection title="响应时序">
        <div className="settings-pair">
          <RangeSetting
            label="无音保留"
            value={settings.readingHoldMs}
            defaultValue={DEFAULT_AUDIO_SETTINGS.readingHoldMs}
            output={settings.readingHoldMs + ' ms'}
            min={0}
            max={1_500}
            step={60}
            onChange={(readingHoldMs) => onChange({ readingHoldMs })}
          />
          <RangeSetting
            label="分析间隔"
            value={settings.analysisIntervalMs}
            defaultValue={DEFAULT_AUDIO_SETTINGS.analysisIntervalMs}
            output={settings.analysisIntervalMs + ' ms'}
            min={24}
            max={192}
            step={12}
            onChange={(analysisIntervalMs) =>
              onChange({ analysisIntervalMs })
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="采集格式 · 下次启用生效">
        <div className="settings-select-grid">
          <SelectSetting
            label="缓冲区"
            value={settings.fftSize}
            defaultValue={DEFAULT_AUDIO_SETTINGS.fftSize}
            onChange={(value) =>
              onChange({ fftSize: value as AnalysisFftSize })
            }
            options={[
              [2_048, '2048 · 更快'],
              [4_096, '4096 · 默认'],
              [8_192, '8192 · 低音更稳'],
            ]}
          />
          <SelectSetting
            label="首选采样率"
            value={settings.preferredSampleRate}
            defaultValue={DEFAULT_AUDIO_SETTINGS.preferredSampleRate}
            onChange={(value) =>
              onChange({ preferredSampleRate: value as PreferredSampleRate })
            }
            options={[
              [0, '自动'],
              [44_100, '44.1 kHz'],
              [48_000, '48 kHz'],
            ]}
          />
          <SelectSetting
            label="首选声道"
            value={settings.preferredChannelCount}
            defaultValue={DEFAULT_AUDIO_SETTINGS.preferredChannelCount}
            onChange={(value) =>
              onChange({
                preferredChannelCount: value as PreferredChannelCount,
              })
            }
            options={[
              [0, '自动'],
              [1, '单声道'],
              [2, '双声道'],
            ]}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="浏览器音频处理 · 下次启用生效">
        <div className="settings-toggle-grid">
          <ToggleSetting
            label="自动增益"
            checked={settings.autoGainControl}
            defaultChecked={DEFAULT_AUDIO_SETTINGS.autoGainControl}
            onChange={(autoGainControl) => onChange({ autoGainControl })}
          />
          <ToggleSetting
            label="降噪"
            checked={settings.noiseSuppression}
            defaultChecked={DEFAULT_AUDIO_SETTINGS.noiseSuppression}
            onChange={(noiseSuppression) => onChange({ noiseSuppression })}
          />
          <ToggleSetting
            label="回声消除"
            checked={settings.echoCancellation}
            defaultChecked={DEFAULT_AUDIO_SETTINGS.echoCancellation}
            onChange={(echoCancellation) => onChange({ echoCancellation })}
          />
        </div>
        <p className="settings-inline-note">
          浏览器可以忽略不支持的约束；下方仅显示音轨实际报告的值。
        </p>
        <div className="settings-reported">
          <span>浏览器报告</span>
          <strong>
            {trackSettings
              ? formatTrackSettings(trackSettings, analysisSampleRate)
              : '启用麦克风后显示'}
          </strong>
        </div>
      </SettingsSection>

      <SettingsSection title="Local Edge">
        <div className="settings-release" aria-live="polite">
          <div className="settings-release-copy">
            <span>离线版本</span>
            <strong>{formatFwaReleaseId(fwaUpdate.currentReleaseId)}</strong>
          </div>
          {fwaUpdate.updateAvailable ? (
            <div className="settings-release-update">
              <span className="settings-release-status">
                <span className="settings-release-dot" aria-hidden="true" />
                新版本 {formatFwaReleaseId(fwaUpdate.availableReleaseId)} 已就绪
              </span>
              <button
                type="button"
                className="settings-update-action"
                onClick={onApplyFwaUpdate}
              >
                更新并刷新
              </button>
            </div>
          ) : (
            <span className="settings-release-status">
              {formatFwaReleaseStatus(fwaUpdate)}
            </span>
          )}
        </div>
        <div className="settings-toggle-grid settings-toggle-grid-single">
          <ToggleSetting
            label="FWA 调试工具"
            checked={fwaDebugEnabled}
            defaultChecked={false}
            disabled={!fwaDebugAvailable}
            onChange={onFwaDebugChange}
          />
        </div>
        <p className="settings-inline-note">
          {fwaDebugAvailable
            ? '当前会话会立即显示或隐藏可拖动的 FWA diagnostics 入口，并保存到本机；缓存与离线能力不受影响。'
            : '当前页面未提供 Local Edge 调试能力，连接完成后可切换。'}
        </p>
      </SettingsSection>

      <div className="settings-footer">
        <span>监听中可实时调整未标注“下次启用”的项目。</span>
        <button
          type="button"
          className="settings-reset"
          disabled={
            areDefaultAudioSettings(settings) &&
            areDefaultDisplaySettings(displaySettings)
          }
          onClick={onReset}
        >
          全部恢复默认
        </button>
      </div>
      <div className="settings-attribution" aria-label="版权信息">
        <span>© {new Date().getFullYear()}</span>
        <span aria-hidden="true">·</span>
        <a href="https://zgq.me" target="_blank" rel="noreferrer">
          zgq.me
        </a>
      </div>
    </div>
  )
})

function formatPolyphonicRuntime({
  modelState,
  workerBackend,
  modelLoadMs,
  inferenceMs,
}: TechnicalSettingsProps['polyphonicRuntime']): string {
  if (modelState === 'uninitialized') {
    return '启用和弦麦克风后显示'
  }
  if (modelState === 'loading') {
    return '正在后台加载模型'
  }
  if (modelState === 'unsupported') {
    return 'Worker WebGL 不可用'
  }
  if (modelState === 'error') {
    return '运行失败'
  }

  const details = [workerBackend?.toUpperCase() ?? '未知后端']
  if (modelLoadMs !== null) {
    details.push('模型 ' + formatDuration(modelLoadMs))
  }
  if (inferenceMs !== null) {
    details.push('推理 ' + formatDuration(inferenceMs))
  }
  return details.join(' · ')
}

function formatFwaReleaseStatus(state: FwaUpdateState): string {
  if (state.phase === 'network-only') {
    return '当前使用网络直连'
  }
  if (state.phase === 'unsupported') {
    return '当前浏览器不支持离线内核'
  }
  if (state.phase === 'error') {
    return 'Local Edge 状态不可用'
  }
  if (!state.currentReleaseId) {
    return '正在连接 Local Edge'
  }
  if (state.phase === 'ready') {
    return '后台自动检查更新'
  }
  return '正在检查离线版本'
}

function formatDuration(durationMs: number): string {
  return durationMs >= 1_000
    ? (durationMs / 1_000).toFixed(1) + ' s'
    : Math.round(durationMs) + ' ms'
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function RangeSetting({
  label,
  value,
  defaultValue,
  output,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  defaultValue: number
  output: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const inputId = useId()

  return (
    <div className="settings-range">
      <div className="settings-control-heading">
        <label htmlFor={inputId}>{label}</label>
        <span className="settings-control-value">
          <output>{output}</output>
          <ResetSettingButton
            label={label}
            disabled={value === defaultValue}
            onReset={() => onChange(defaultValue)}
          />
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  )
}

function SelectSetting<T extends string | number>({
  label,
  value,
  defaultValue,
  options,
  onChange,
}: {
  label: string
  value: T
  defaultValue: T
  options: readonly (readonly [T, string])[]
  onChange: (value: T) => void
}) {
  const inputId = useId()

  return (
    <div className="settings-select">
      <div className="settings-control-heading">
        <label htmlFor={inputId}>{label}</label>
        <ResetSettingButton
          label={label}
          disabled={value === defaultValue}
          onReset={() => onChange(defaultValue)}
        />
      </div>
      <select
        id={inputId}
        value={value}
        onChange={(event) => {
          const option = options.find(
            ([optionValue]) => String(optionValue) === event.currentTarget.value,
          )
          if (option) {
            onChange(option[0])
          }
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleSetting({
  label,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
}: {
  label: string
  checked: boolean
  defaultChecked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="settings-toggle-item">
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>{label}</span>
      </label>
      <ResetSettingButton
        label={label}
        disabled={disabled || checked === defaultChecked}
        onReset={() => onChange(defaultChecked)}
      />
    </div>
  )
}

function ResetSettingButton({
  label,
  disabled,
  onReset,
}: {
  label: string
  disabled: boolean
  onReset: () => void
}) {
  return (
    <button
      type="button"
      className="setting-reset-button"
      aria-label={'恢复' + label + '默认值'}
      title={'恢复' + label + '默认值'}
      disabled={disabled}
      onClick={onReset}
    >
      ↺
    </button>
  )
}

function formatTrackSettings(
  settings: MediaTrackSettings,
  analysisSampleRate: number | null,
): string {
  return [
    settings.sampleRate ? settings.sampleRate + ' Hz 输入' : null,
    analysisSampleRate ? analysisSampleRate + ' Hz 分析' : null,
    settings.channelCount ? settings.channelCount + ' 声道' : null,
    formatReportedBoolean('AGC', settings.autoGainControl),
    formatReportedBoolean('降噪', settings.noiseSuppression),
    formatReportedBoolean('回声', settings.echoCancellation),
  ]
    .filter(Boolean)
    .join(' · ')
}

function formatReportedBoolean(
  label: string,
  value: boolean | string | undefined,
): string | null {
  if (value === undefined) {
    return null
  }

  return label + (typeof value === 'boolean' ? (value ? '开' : '关') : value)
}
