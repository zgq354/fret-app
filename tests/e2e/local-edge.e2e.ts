import { expect, test } from '@playwright/test'

const remoteBaseUrl = process.env.E2E_BASE_URL

test('@p0 installs one complete release and restarts offline', async ({
  context,
  page,
}) => {
  await page.goto('/?__fwa_debug=1')
  await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toBeVisible()

  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => {
            const response = await fetch('/__fwa/state')
            return response.ok ? response.json() : null
          })
        } catch {
          return null
        }
      },
      { timeout: 30_000 },
    )
    .toMatchObject({
      localEdgeEnabled: true,
      mode: 'active',
    })

  const installed = await page.evaluate(async () => {
    const descriptor = await fetch('/__fwa/release.json').then(
      async (response) =>
        (await response.json()) as {
          assets: Array<{ path: string }>
          releaseId: string
        },
    )
    const cachedPaths = (
      await Promise.all(
        (await caches.keys())
          .filter((cacheName) => cacheName.startsWith('fwa-local-edge:'))
          .map(async (cacheName) => {
            const cache = await caches.open(cacheName)
            return (await cache.keys()).map((request) => new URL(request.url).pathname)
          }),
      )
    ).flat()

    return {
      assetCount: descriptor.assets.length,
      cachedPathCount: new Set(cachedPaths).size,
      controlledByFwa:
        new URL(navigator.serviceWorker.controller?.scriptURL ?? location.href)
          .pathname === '/__fwa-sw.js',
      hasModel: cachedPaths.includes('/models/basic-pitch/model.json'),
      hasModelWeights: cachedPaths.includes(
        '/models/basic-pitch/group1-shard1of1.bin',
      ),
      hasWorklet: cachedPaths.includes('/audio/pcm-capture-worklet.js'),
      releaseId: descriptor.releaseId,
    }
  })

  expect(installed).toMatchObject({
    controlledByFwa: true,
    hasModel: true,
    hasModelWeights: true,
    hasWorklet: true,
  })
  expect(installed.cachedPathCount).toBe(installed.assetCount)
  expect(installed.releaseId).toMatch(/^[a-f0-9]{16}$/)

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test('@p0 keeps network-only as a normal escape path', async ({ page }) => {
  await page.goto('/?__fwa=network&__fwa_debug=1')
  await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Open FWA diagnostics/ }),
  ).toBeVisible()

  expect(
    await page.evaluate(async () => ({
      controlled: navigator.serviceWorker.controller !== null,
      registrations: (await navigator.serviceWorker.getRegistrations()).length,
      localEdgeCaches: (await caches.keys()).filter((cacheName) =>
        cacheName.startsWith('fwa-local-edge:'),
      ).length,
    })),
  ).toEqual({
    controlled: false,
    registrations: 0,
    localEdgeCaches: 0,
  })

  await page.getByRole('button', { name: /Open FWA diagnostics/ }).click()
  await page
    .getByRole('dialog', { name: 'FWA diagnostics' })
    .getByRole('button', { name: 'Use Local Edge' })
    .click()
  await expect.poll(() => new URL(page.url()).searchParams.get('__fwa')).toBeNull()
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => {
            const response = await fetch('/__fwa/state')
            return response.ok ? response.json() : null
          })
        } catch {
          return null
        }
      },
      { timeout: 30_000 },
    )
    .toMatchObject({ mode: 'active' })
})

test('@p0 toggles FWA diagnostics from app settings', async ({ page }) => {
  await page.goto('/?__fwa_debug=0')
  await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toBeVisible()
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          try {
            return (await fetch('/__fwa/state')).ok
          } catch {
            return false
          }
        }),
      { timeout: 30_000 },
    )
    .toBe(true)

  const settingsTrigger = page.getByRole('button', { name: '设置' })
  await settingsTrigger.click()
  const debugToggle = page.getByRole('checkbox', { name: 'FWA 调试工具' })
  await expect(debugToggle).not.toBeChecked()
  const initialNavigationCount = await page.evaluate(() => {
    ;(
      window as typeof window & {
        __fwaSettingsSessionMarker?: string
      }
    ).__fwaSettingsSessionMarker = 'alive'
    return performance.getEntriesByType('navigation').length
  })

  await debugToggle.click()
  await expect(debugToggle).toBeChecked()

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => localStorage.getItem('__fwa_debug'))
      } catch {
        return null
      }
    })
    .toBe('1')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('__fwa_debug'))
    .toBeNull()
  await expect(
    page.getByRole('button', { name: /Open FWA diagnostics/ }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => ({
      marker: (
        window as typeof window & {
          __fwaSettingsSessionMarker?: string
        }
      ).__fwaSettingsSessionMarker,
      navigationCount: performance.getEntriesByType('navigation').length,
    })),
  ).toEqual({ marker: 'alive', navigationCount: initialNavigationCount })

  await debugToggle.click()
  await expect(debugToggle).not.toBeChecked()

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => localStorage.getItem('__fwa_debug'))
      } catch {
        return 'navigation-pending'
      }
    })
    .toBeNull()
  await expect(
    page.getByRole('button', { name: /Open FWA diagnostics/ }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(() => ({
      marker: (
        window as typeof window & {
          __fwaSettingsSessionMarker?: string
        }
      ).__fwaSettingsSessionMarker,
      navigationCount: performance.getEntriesByType('navigation').length,
    })),
  ).toEqual({ marker: 'alive', navigationCount: initialNavigationCount })
})

test('@p0 exposes a ready release without interrupting the session', async ({
  page,
}) => {
  await page.route('**/__fwa/loader.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        (() => {
          const state = {
            phase: 'ready',
            controlled: true,
            releaseId: '1111111111111111',
            availableReleaseId: '2222222222222222',
            updateAvailable: true,
            revalidating: false,
            message: 'A complete release is ready.',
          };
          window.__fwa = {
            q: [],
            version: 'test',
            localEdge: {
              debug: {
                getState: () => ({ enabled: false }),
                subscribe: (listener) => {
                  listener({ enabled: false });
                  return () => undefined;
                },
                setEnabled: () => undefined,
              },
              getState: () => state,
              subscribe: (listener) => {
                listener(state);
                return () => undefined;
              },
              applyUpdate: () => {
                sessionStorage.setItem('__fwa-test-apply-update', '1');
                return true;
              },
            },
          };
          window.dispatchEvent(new CustomEvent('__fwa:ready'));
        })();
      `,
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toBeVisible()
  await expect(page.locator('.settings-update-dot')).toBeVisible()

  await page.getByRole('button', { name: '设置' }).click()
  await expect(page.getByText('11111111', { exact: true })).toBeVisible()
  await expect(page.getByText('新版本 22222222 已就绪')).toBeVisible()

  await page.getByRole('button', { name: '更新并刷新' }).click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem('__fwa-test-apply-update'),
      ),
    )
    .toBe('1')
})

test('@p1 leaves unknown navigation to the Pages host', async ({ page }) => {
  test.skip(!remoteBaseUrl, 'Cloudflare Pages owns this hosting boundary')

  const response = await page.goto('/__fwa-consumer-not-found')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '识别音符所在位置' })).toHaveCount(0)
})
