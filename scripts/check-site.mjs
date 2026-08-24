import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

const outputDirectory = resolve(process.argv[2] ?? 'dist')
const canonicalUrl = 'https://fret-app.zgq.me/'
const socialPreviewUrl = `${canonicalUrl}assets/social-preview.png`

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function read(relativePath) {
  return readFile(join(outputDirectory, relativePath), 'utf8')
}

const indexHtml = await read('index.html')
for (const marker of [
  '<title>弦音地图 · Fret &amp; Key</title>',
  `rel="canonical" href="${canonicalUrl}"`,
  'name="robots" content="index, follow, max-image-preview:large"',
  'property="og:type" content="website"',
  'property="og:title" content="弦音地图 · Fret &amp; Key"',
  `property="og:url" content="${canonicalUrl}"`,
  `content="${socialPreviewUrl}"`,
  'name="twitter:card" content="summary_large_image"',
  'type="application/ld+json"',
]) {
  assert(indexHtml.includes(marker), `index.html is missing ${marker}`)
}

const structuredDataMatch = indexHtml.match(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
)
assert(structuredDataMatch, 'index.html is missing JSON-LD structured data')
const structuredData = JSON.parse(structuredDataMatch[1])
assert(
  structuredData['@type'] === 'WebApplication',
  'JSON-LD must describe a WebApplication',
)
assert(structuredData.url === canonicalUrl, 'JSON-LD URL is not canonical')
assert(
  structuredData.isAccessibleForFree === true,
  'JSON-LD must reflect that the application is free to access',
)

const robots = await read('robots.txt')
assert(robots.includes('User-agent: *'), 'robots.txt is missing the default user agent')
assert(
  robots.includes(`Sitemap: ${canonicalUrl}sitemap.xml`),
  'robots.txt is missing the canonical sitemap URL',
)

const sitemap = await read('sitemap.xml')
assert(
  sitemap.includes(`<loc>${canonicalUrl}</loc>`),
  'sitemap.xml is missing the canonical application URL',
)

const socialPreview = await sharp(
  join(outputDirectory, 'assets/social-preview.png'),
).metadata()
assert(
  socialPreview.width === 1200 && socialPreview.height === 630,
  'social-preview.png must be 1200x630',
)

console.log('SEO and site metadata check passed.')
