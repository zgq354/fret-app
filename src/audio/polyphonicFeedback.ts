import type {
  PolyphonicAnalysisState,
  PolyphonicModelState,
} from './polyphonicInferenceMessages'

export type PolyphonicFeedbackAppearance =
  | 'idle'
  | 'busy'
  | 'no-result'
  | 'result'

export interface PolyphonicFeedback {
  label: string
  title: string
  hint: string
  shortLabel: string
  appearance: PolyphonicFeedbackAppearance
  isBusy: boolean
}

interface PolyphonicFeedbackInput {
  modelState: PolyphonicModelState
  analysisState: PolyphonicAnalysisState
  visibleChord: {
    chordLabel: string | null
    noteCount: number
  } | null
  hasLiveChord: boolean
}

export function resolvePolyphonicFeedback({
  modelState,
  analysisState,
  visibleChord,
  hasLiveChord,
}: PolyphonicFeedbackInput): PolyphonicFeedback {
  if (modelState === 'loading') {
    return {
      label: '正在加载浏览器内多音模型',
      title: '准备识别',
      hint: '麦克风已连接；模型在后台 Worker 中加载',
      shortLabel: '加载模型',
      appearance: 'busy',
      isBusy: true,
    }
  }

  if (analysisState === 'analyzing') {
    return {
      label: visibleChord
        ? '正在分析新和声 · 当前保留上次结果'
        : '正在分析这一段和声',
      title: visibleChord?.chordLabel ?? '分析中…',
      hint: '推理在后台 Worker 中运行，页面仍可操作',
      shortLabel: visibleChord?.chordLabel ?? '分析中',
      appearance: 'busy',
      isBusy: true,
    }
  }

  if (analysisState === 'no-result') {
    if (visibleChord) {
      return {
        label: '本轮未识别 · 保留上次和声',
        title: visibleChord.chordLabel ?? '音符集合',
        hint: '确认输入电平后，将和弦保持约 2 秒',
        shortLabel: visibleChord.chordLabel ?? '上次和声',
        appearance: 'no-result',
        isBusy: false,
      }
    }

    return {
      label: '已完成一轮分析',
      title: '未识别到和弦',
      hint: '确认输入电平后，将和弦保持约 2 秒',
      shortLabel: '未识别到和弦',
      appearance: 'no-result',
      isBusy: false,
    }
  }

  if (visibleChord) {
    return {
      label: hasLiveChord
        ? `已识别 · ${visibleChord.noteCount} 个同时音符`
        : '保留上次和声 · 正在继续收音',
      title: visibleChord.chordLabel ?? '音符集合',
      hint: hasLiveChord
        ? '新结果会在下一轮分析完成后更新'
        : '确认输入电平后，将和弦保持约 2 秒',
      shortLabel: visibleChord.chordLabel ?? '音符集合',
      appearance: 'result',
      isBusy: false,
    }
  }

  return {
    label: '正在收集声音 · 分析窗口约 2 秒',
    title: '请持续弹奏和弦',
    hint: '输入电平有变化时，下一轮会自动分析',
    shortLabel: '正在收音',
    appearance: 'idle',
    isBusy: false,
  }
}
