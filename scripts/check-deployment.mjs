const argumentsList = process.argv.slice(2)
const withoutAnalytics = argumentsList.includes('--without-analytics')
const baseUrlArgument = argumentsList.find(
  (argument) => argument !== '--' && !argument.startsWith('--'),
)
const baseUrl = new URL(baseUrlArgument ?? 'https://fret-app.zgq.me/')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchAsset(pathname, expectedContentType) {
  const url = new URL(pathname, baseUrl)
  const response = await fetch(url, { redirect: 'error' })
  const contentType = response.headers.get('content-type') ?? ''

  assert(response.ok, `${url} returned HTTP ${response.status}`)
  assert(
    contentType.startsWith(expectedContentType),
    `${url} returned ${contentType || 'no Content-Type'} instead of ${expectedContentType}`,
  )

  return response
}

const pageResponse = await fetchAsset('/', 'text/html')
const page = await pageResponse.text()
for (const marker of [
  '<title>弦音地图 · Fret &amp; Key</title>',
  'rel="canonical" href="https://fret-app.zgq.me/"',
]) {
  assert(page.includes(marker), `${baseUrl} is missing ${marker}`)
}
const beaconCount = page.match(
  /static\.cloudflareinsights\.com\/beacon\.min\.js/g,
)?.length ?? 0
assert(
  beaconCount === (withoutAnalytics ? 0 : 1),
  withoutAnalytics
    ? `${baseUrl} unexpectedly includes ${beaconCount} Web Analytics beacon(s)`
    : `${baseUrl} includes ${beaconCount} Web Analytics beacon(s) instead of one; use Cloudflare's manual JS Snippet installation mode`,
)
if (!withoutAnalytics) {
  assert(page.includes('data-cf-beacon'), `${baseUrl} is missing data-cf-beacon`)
}

const socialPreviewResponse = await fetchAsset(
  '/assets/social-preview.png',
  'image/png',
)
assert(
  Number(socialPreviewResponse.headers.get('content-length') ?? 0) > 0,
  'assets/social-preview.png has no content',
)

const legacySocialPreview = await fetch(new URL('/social-preview.png', baseUrl), {
  redirect: 'manual',
})
assert(
  legacySocialPreview.status === 301,
  `/social-preview.png returned HTTP ${legacySocialPreview.status} instead of 301`,
)
assert(
  legacySocialPreview.headers.get('location') === '/assets/social-preview.png',
  '/social-preview.png does not redirect to the canonical asset path',
)

const robotsResponse = await fetchAsset('/robots.txt', 'text/plain')
const robots = await robotsResponse.text()
assert(
  robots.includes('Sitemap: https://fret-app.zgq.me/sitemap.xml'),
  'robots.txt is missing the production sitemap URL',
)

await fetchAsset('/sitemap.xml', 'application/xml')

for (const pathname of ['/sw.js', '/__fwa-consumer-not-found']) {
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect: 'error',
  })
  const body = await response.text()
  assert(
    response.status === 404,
    `${pathname} returned HTTP ${response.status} instead of 404`,
  )
  assert(
    body.includes('<title>页面不存在 · 弦音地图</title>'),
    `${pathname} did not return the host 404 page`,
  )
  assert(
    !body.includes('/__fwa/loader.js'),
    `${pathname} must not start the Local Edge runtime`,
  )
}

await new Promise((resolve) => {
  process.stdout.write(`Deployment check passed for ${baseUrl}\n`, resolve)
})
process.exit(0)
