import { expect, test } from '@playwright/test'

test('@p0 settings stay inside the viewport and dismiss from the mask', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto('/?__fwa=network')

  const trigger = page.getByRole('button', { name: '设置' })
  const pageHeightBeforeOpen = await page.evaluate(
    () => document.documentElement.scrollHeight,
  )

  await trigger.click()

  const dialog = page.getByRole('dialog', { name: '设置' })
  const panel = dialog.locator('.technical-settings-panel')
  await expect(dialog).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const panelMetrics = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      top: rect.top,
    }
  })

  expect(panelMetrics.top).toBeGreaterThanOrEqual(8)
  expect(panelMetrics.bottom).toBeLessThanOrEqual(643)
  expect(panelMetrics.overflowY).toBe('auto')
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    pageHeightBeforeOpen,
  )

  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)

  await page.setViewportSize({ width: 844, height: 390 })
  await expect
    .poll(() =>
      panel.evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeLessThanOrEqual(366)
  expect(
    await panel.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(8)

  await page.mouse.click(4, 4)
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
