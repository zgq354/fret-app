import { describe, expect, it } from 'vitest'
import { MiddleCStyle } from '../music/musicTheory'
import {
  DefaultDisplaySettings,
  DisplaySettingsStorageKey,
  loadDisplaySettings,
  normalizeDisplaySettings,
  saveDisplaySettings,
} from './displaySettings'

describe('display settings', () => {
  it('uses scientific pitch notation by default', () => {
    expect(DefaultDisplaySettings.middleCStyle).toBe(MiddleCStyle.Scientific)
  })

  it('normalizes unsupported middle C styles to the default', () => {
    expect(normalizeDisplaySettings({ middleCStyle: 'c6' })).toEqual(
      DefaultDisplaySettings,
    )
  })

  it('round-trips the selected middle C style through storage', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const settings = { middleCStyle: MiddleCStyle.FLStudio }

    saveDisplaySettings(settings, storage)

    expect(loadDisplaySettings(storage)).toEqual(settings)
    expect(values.has(DisplaySettingsStorageKey)).toBe(true)
  })
})
