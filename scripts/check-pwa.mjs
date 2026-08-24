import { access, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const outputDirectory = resolve(process.argv[2] ?? 'dist')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function read(relativePath) {
  return readFile(join(outputDirectory, relativePath), 'utf8')
}

async function assertFile(relativePath) {
  await access(join(outputDirectory, relativePath))
}

async function fileExists(relativePath) {
  try {
    await access(join(outputDirectory, relativePath))
    return true
  } catch {
    return false
  }
}

const manifest = JSON.parse(await read('manifest.webmanifest'))
assert(manifest.name === '弦音地图', 'manifest name is out of sync')
assert(manifest.short_name === '弦音地图', 'manifest short name is out of sync')
assert(manifest.display === 'standalone', 'manifest display must be standalone')
assert(manifest.start_url === '/', 'manifest start_url must be /')
assert(manifest.scope === '/', 'manifest scope must be /')
assert(manifest.theme_color === '#0b0d10', 'manifest theme color is out of sync')

const supplementalAssetPaths = [
  'assets/polyphonicInference.worker.js',
  'audio/pcm-capture-worklet.js',
  'favicon.svg',
  'icons/apple-touch-icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'manifest.webmanifest',
  'models/basic-pitch/group1-shard1of1.bin',
  'models/basic-pitch/model.json',
]
await Promise.all(supplementalAssetPaths.map(assertFile))

for (const artifact of [
  '.vite/fwa.config.json',
  '__fwa/loader.js',
  '__fwa/release.json',
  '__fwa-sw.js',
  '_headers',
  '404.html',
]) {
  await assertFile(artifact)
}
assert(!(await fileExists('sw.js')), 'legacy /sw.js must not be published')

const indexHtml = await read('index.html')
for (const marker of [
  'rel="manifest"',
  'maximum-scale=1.0',
  'user-scalable=no',
  'viewport-fit=cover',
  'apple-mobile-web-app-capable',
  'apple-mobile-web-app-title',
  'content="弦音地图"',
  '<title>弦音地图 · Fret &amp; Key</title>',
  'rel="apple-touch-icon"',
  'rel="apple-touch-startup-image"',
  '<script defer src="/__fwa/loader.js"></script>',
]) {
  assert(indexHtml.includes(marker), `index.html is missing ${marker}`)
}
assert(
  !indexHtml.includes('serviceWorker.register'),
  'host HTML must not keep a second Service Worker registration owner',
)
assert(
  indexHtml.indexOf('/__fwa/loader.js') < indexHtml.indexOf('type="module"'),
  'FWA loader must run before the application module',
)

const descriptor = JSON.parse(await read('__fwa/release.json'))
assert(descriptor.schemaVersion === 2, 'FWA descriptor schema must be v2')
assert(
  descriptor.appId === 'guitar-theory-visualizer',
  'FWA descriptor appId is out of sync',
)
assert(descriptor.localEdgeEnabled === true, 'Local Edge must be enabled')
assert(descriptor.appEntry === '/', 'FWA app entry must be /')
assert(
  Array.isArray(descriptor.assets) &&
    descriptor.assets.length > supplementalAssetPaths.length,
  'FWA descriptor is missing the Vite graph closure',
)

const releasePaths = new Set(descriptor.assets.map((asset) => asset.path))
for (const asset of [
  '/',
  '/__fwa/loader.js',
  ...supplementalAssetPaths.map((path) => `/${path}`),
]) {
  assert(releasePaths.has(asset), `FWA release is missing ${asset}`)
}
assert(
  releasePaths.has('/assets/polyphonicInference.worker.js'),
  'FWA release is missing the polyphonic inference Worker',
)
assert(
  ![...releasePaths].some((path) => path.startsWith('/splash/')),
  'startup splash images must not block the atomic release',
)
for (const excludedPath of ['/assets/social-preview.png', '/robots.txt', '/sitemap.xml']) {
  assert(
    !releasePaths.has(excludedPath),
    `${excludedPath} must stay outside the Local Edge release`,
  )
}

for (const asset of descriptor.assets) {
  const relativePath = asset.path === '/' ? 'index.html' : asset.path.slice(1)
  await assertFile(relativePath)
}

const buildConfig = JSON.parse(await read('.vite/fwa.config.json'))
assert(
  buildConfig.navigation?.notFound?.strategy === 'network',
  'unknown navigation must preserve host network semantics',
)
assert(
  JSON.stringify(buildConfig.supplementalAssetPaths) ===
    JSON.stringify(supplementalAssetPaths.map((path) => `/${path}`).sort()),
  'FWA supplementalAssetPaths are out of sync with the PWA check',
)
assert(
  JSON.stringify(buildConfig.releaseAssetPrefixes) ===
    JSON.stringify(['/assets/']),
  'FWA releaseAssetPrefixes are out of sync with the PWA check',
)

const headers = await read('_headers')
for (const marker of ['/__fwa/release.json', '/__fwa/loader.js', '/__fwa-sw.js']) {
  assert(headers.includes(marker), `_headers is missing ${marker}`)
}

const notFoundHtml = await read('404.html')
assert(notFoundHtml.includes('<title>页面不存在 · 弦音地图</title>'), '404 page title is missing')
assert(!notFoundHtml.includes('/__fwa/loader.js'), '404 page must stay outside the app runtime')
assert(!notFoundHtml.includes('type="module"'), '404 page must not start the React app')

console.log(
  `PWA Local Edge check passed (${descriptor.assets.length} assets, release ${descriptor.releaseId}).`,
)
