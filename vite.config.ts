import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { localEdge } from './fwa.config.ts'

function pwaAssets(): Plugin {
  return {
    name: 'pwa-assets',
    apply: 'build',
    transformIndexHtml() {
      const linksPath = path.resolve(
        import.meta.dirname,
        'public/splash/_links.json',
      )
      const links = JSON.parse(
        readFileSync(linksPath, 'utf8'),
      ) as Record<string, string>
      const tags: HtmlTagDescriptor[] = []

      for (const [file, media] of Object.entries(links)) {
        tags.push({
          tag: 'link',
          injectTo: 'head',
          attrs: {
            rel: 'apple-touch-startup-image',
            media,
            href: `/splash/${file}`,
          },
        })
      }

      return tags
    },
  }
}

function webAnalytics(token: string | undefined, required: boolean): Plugin {
  if (required && !token) {
    throw new Error(
      'CF_WEB_ANALYTICS_TOKEN is required for a production build.',
    )
  }
  if (token && !/^[a-zA-Z0-9_-]{16,128}$/.test(token)) {
    throw new Error('CF_WEB_ANALYTICS_TOKEN has an invalid format.')
  }

  return {
    name: 'cloudflare-web-analytics',
    apply: 'build',
    transformIndexHtml() {
      if (!token) return []

      return [
        {
          tag: 'script',
          injectTo: 'body',
          attrs: {
            type: 'module',
            defer: true,
            src: 'https://static.cloudflareinsights.com/beacon.min.js',
            'data-cf-beacon': JSON.stringify({ token }),
          },
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const analyticsToken = process.env.CF_WEB_ANALYTICS_TOKEN?.trim()
  const requireAnalytics = process.env.FRET_REQUIRE_WEB_ANALYTICS === '1'

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@spotify/basic-pitch/model/*',
            dest: 'models/basic-pitch',
            rename: { stripBase: true },
          },
        ],
      }),
      pwaAssets(),
      webAnalytics(analyticsToken, requireAnalytics),
      localEdge.appPlugin(),
    ],
    worker: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
        },
      },
    },
  }
})
