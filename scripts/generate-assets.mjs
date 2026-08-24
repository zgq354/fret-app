import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public/favicon.svg')
const assetsDirectory = join(root, 'public/assets')
const iconsDirectory = join(root, 'public/icons')
const splashDirectory = join(root, 'public/splash')
const socialPreview = join(assetsDirectory, 'social-preview.png')
const background = '#0b0d10'

const devices = [
  { name: 'iphone-16-pro-max', cssWidth: 440, cssHeight: 956, dpr: 3 },
  { name: 'iphone-16-pro', cssWidth: 402, cssHeight: 874, dpr: 3 },
  { name: 'iphone-air-2025', cssWidth: 420, cssHeight: 912, dpr: 3 },
  { name: 'iphone-15-pro-max', cssWidth: 430, cssHeight: 932, dpr: 3 },
  { name: 'iphone-15-pro', cssWidth: 393, cssHeight: 852, dpr: 3 },
  { name: 'iphone-14-pro-max', cssWidth: 428, cssHeight: 926, dpr: 3 },
  { name: 'iphone-14', cssWidth: 390, cssHeight: 844, dpr: 3 },
  { name: 'iphone-13-mini', cssWidth: 375, cssHeight: 812, dpr: 3 },
  { name: 'iphone-11-pro-max', cssWidth: 414, cssHeight: 896, dpr: 3 },
  { name: 'iphone-11', cssWidth: 414, cssHeight: 896, dpr: 2 },
  { name: 'iphone-8-plus', cssWidth: 414, cssHeight: 736, dpr: 3 },
  { name: 'iphone-se-2-8', cssWidth: 375, cssHeight: 667, dpr: 2 },
  { name: 'iphone-se-1', cssWidth: 320, cssHeight: 568, dpr: 2 },
  { name: 'ipad-pro-13-m4', cssWidth: 1032, cssHeight: 1376, dpr: 2 },
  { name: 'ipad-pro-12-9', cssWidth: 1024, cssHeight: 1366, dpr: 2 },
  { name: 'ipad-pro-11', cssWidth: 834, cssHeight: 1194, dpr: 2 },
  { name: 'ipad-air-11-m2', cssWidth: 820, cssHeight: 1180, dpr: 2 },
  { name: 'ipad-10-2', cssWidth: 810, cssHeight: 1080, dpr: 2 },
  { name: 'ipad-pro-10-5', cssWidth: 834, cssHeight: 1112, dpr: 2 },
  { name: 'ipad-mini-6', cssWidth: 744, cssHeight: 1133, dpr: 2 },
  { name: 'ipad-9-7', cssWidth: 768, cssHeight: 1024, dpr: 2 },
]

async function renderSource(size) {
  return sharp(source, { density: 512 }).resize(size, size).png().toBuffer()
}

async function renderOnBackground(size, innerSize = size) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: await renderSource(innerSize), gravity: 'center' }])
    .png()
    .toBuffer()
}

async function generateIcons() {
  await rm(iconsDirectory, { recursive: true, force: true })
  await mkdir(iconsDirectory, { recursive: true })

  for (const size of [192, 512]) {
    await writeFile(join(iconsDirectory, `icon-${size}.png`), await renderSource(size))
    await writeFile(
      join(iconsDirectory, `icon-maskable-${size}.png`),
      await renderOnBackground(size, Math.round(size * 0.8)),
    )
  }

  await writeFile(
    join(iconsDirectory, 'apple-touch-icon-180.png'),
    await renderOnBackground(180),
  )
}

async function renderSplash(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.2)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  })
    .composite([{ input: await renderSource(iconSize), gravity: 'center' }])
    .png()
    .toBuffer()
}

async function generateSplash() {
  await rm(splashDirectory, { recursive: true, force: true })
  await mkdir(splashDirectory, { recursive: true })
  const links = {}

  for (const device of devices) {
    const portraitWidth = device.cssWidth * device.dpr
    const portraitHeight = device.cssHeight * device.dpr

    for (const orientation of ['portrait', 'landscape']) {
      const file = `splash-${device.name}-${orientation}.png`
      const isPortrait = orientation === 'portrait'
      const width = isPortrait ? portraitWidth : portraitHeight
      const height = isPortrait ? portraitHeight : portraitWidth
      await writeFile(join(splashDirectory, file), await renderSplash(width, height))
      links[file] =
        `screen and (device-width: ${device.cssWidth}px) and ` +
        `(device-height: ${device.cssHeight}px) and ` +
        `(-webkit-device-pixel-ratio: ${device.dpr}) and ` +
        `(orientation: ${orientation})`
    }
  }

  await writeFile(
    join(splashDirectory, '_links.json'),
    JSON.stringify(links, null, 2),
  )
}

async function generateSocialPreview() {
  await mkdir(assetsDirectory, { recursive: true })
  const artwork = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="warm" cx="0" cy="0" r="1" gradientTransform="translate(140 80) rotate(32) scale(520 400)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffb454" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#ffb454" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="cool" cx="0" cy="0" r="1" gradientTransform="translate(1120 500) rotate(-145) scale(500 360)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#66d7d1" stop-opacity="0.14"/>
          <stop offset="1" stop-color="#66d7d1" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" rx="32" fill="${background}"/>
      <rect width="1200" height="630" rx="32" fill="url(#warm)"/>
      <rect width="1200" height="630" rx="32" fill="url(#cool)"/>
      <path d="M338 174H1052" stroke="#ffffff" stroke-opacity="0.1"/>
      <text x="338" y="286" fill="#f4f0e7" font-family="sans-serif" font-size="64" font-weight="700">弦音地图</text>
      <text x="342" y="338" fill="#ffb454" font-family="sans-serif" font-size="23" font-weight="700" letter-spacing="6">FRET &amp; KEY</text>
      <text x="342" y="416" fill="#b8c0ca" font-family="sans-serif" font-size="20">识别音符在吉他指板、钢琴键盘和五线谱上的位置</text>
      <text x="1052" y="526" fill="#8d97a6" font-family="sans-serif" font-size="16" text-anchor="end" letter-spacing="2">fret-app.zgq.me</text>
    </svg>
  `)

  await sharp(artwork)
    .composite([{ input: await renderSource(156), left: 118, top: 232 }])
    .png()
    .toFile(socialPreview)
}

await generateIcons()
await generateSplash()
await generateSocialPreview()
console.log(
  `Generated 5 icons, ${devices.length * 2} startup images, and 1 social preview.`,
)
