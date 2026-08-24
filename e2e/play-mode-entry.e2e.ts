import { expect, test } from '@playwright/test'

test('@p0 enters play mode from a completed click and waits for the next note', async ({
  page,
}) => {
  await page.goto('/')

  const target = page.locator('[data-fret-play-key="2-5"]')
  const dialog = page.getByRole('dialog', { name: '切换到弹奏模式？' })

  await target.dispatchEvent('pointerdown', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  })
  await expect(dialog).toHaveCount(0)

  await target.dispatchEvent('pointerup', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  })
  await target.click()
  await expect(dialog).toBeVisible()

  await dialog
    .getByRole('button', { name: '切换到弹奏模式' })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('等待弹奏', { exact: true })).toBeVisible()
  await expect(page.locator('.pitch-source')).toContainText('弹奏模式')

  await target.click()
  await expect(page.locator('.pitch-source')).toContainText('吉他 · 2 弦 5 品')
})
