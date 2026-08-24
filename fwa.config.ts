import { createFwaViteIntegration } from '@fullstack-webapp/local-edge/vite'

export const localEdge = createFwaViteIntegration({
  appId: 'guitar-theory-visualizer',
  localEdgeEnabled: true,
  scopePath: '/',
  workerPath: '/__fwa-sw.js',
  descriptorPath: '/__fwa/release.json',
  controlPrefix: '/__fwa',
  appEntry: '/',
  appRequestPrefixes: [],
  releaseAssetPrefixes: ['/assets/'],
  supplementalAssetPaths: [
    '/assets/polyphonicInference.worker.js',
    '/audio/pcm-capture-worklet.js',
    '/favicon.svg',
    '/icons/apple-touch-icon-180.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png',
    '/manifest.webmanifest',
    '/models/basic-pitch/group1-shard1of1.bin',
    '/models/basic-pitch/model.json',
  ].sort(),
  navigation: {
    appPaths: ['/'],
    appPathPrefixes: [],
    notFound: { strategy: 'network' },
  },
})
