# Fret & Key · 弦音地图

[Try it](https://fret-app.zgq.me/) · [Source](https://github.com/zgq354/fret-app) · [中文](README.md)

Fret & Key is a guitar and piano note map that runs in the browser. Notes from a microphone, touch, or MIDI input appear together on a guitar fretboard, piano keyboard, and staff notation, making it easier to connect what you hear, play, and see.

It is suitable for music beginners who are starting to learn the guitar fretboard, using sound and touch to connect note names, strings, and frets.

No account is required. Use it directly in a desktop browser, install it as a PWA on desktop or Android, or add it to the Home Screen from Safari on iOS or iPadOS as a WebClip. Open the [live app](https://fret-app.zgq.me/) in a browser with microphone support to get started.

## What you can do

- **Listen and find positions**: Play a guitar or another monophonic instrument to see the note name and every matching position on a standard-tuned guitar fretboard.
- **Compare views**: See the same pitch on the fretboard, piano keyboard, and staff notation at once.
- **Play directly**: Click or touch the fretboard and piano keyboard to hear locally synthesized sounds and see their relationships.
- **Connect MIDI**: Use a MIDI keyboard or another input device in desktop Chrome.
- **Try experimental polyphonic detection**: A short analysis window for a single instrument, piano, or vocal harmony shows note sets and chord candidates.

## Getting started

1. Open the app on an HTTPS page from a desktop browser or mobile device. Browsers only grant microphone access over HTTPS or on localhost.
2. Allow microphone access and start with a clean single note; polyphonic mode is experimental.
3. Install the PWA from a desktop browser or Android browser menu. On iPhone or iPad, choose “Add to Home Screen” in Safari to use it as a WebClip.

After the first online visit, the app prepares a complete offline release in the background. It can then start and use monophonic or polyphonic detection while temporarily offline. Microphone permission remains managed by the browser and operating system for each site.

## Current boundaries

- Standard tuning and a 20-fret guitar fretboard by default; alternate tunings are not supported.
- A monophonic microphone input cannot determine which physical string produced a pitch, so all matching positions remain visible.
- Polyphonic mode is not multi-instrument source separation and is not intended for continuous-song transcription.
- Playing and microphone listening cannot run at the same time. There are currently no accounts, cloud saves, or backend service.
- Middle C labels can follow scientific pitch notation, Yamaha / Logic, or FL Studio. This changes labels only, never the pitch itself.

## Technology and verification

Fret & Key is a static web app built with React, TypeScript, the Web Audio API, and data-driven SVG. Polyphonic transcription uses Spotify’s browser implementation of [Basic Pitch](https://github.com/spotify/basic-pitch-ts), and chord candidates use [Tonal](https://github.com/tonaljs/tonal). Offline releases use [`@fullstack-webapp/local-edge`](https://www.npmjs.com/package/@fullstack-webapp/local-edge) for browser-side atomic updates and recovery boundaries. See the [architecture](docs/architecture.md) for module ownership, input-to-display flow, and the production release boundary.

The public CI runs linting, type checking, unit tests, Local Edge browser tests, and a production build:

```sh
pnpm run ci
```

GitHub Actions publishes the default branch. Public CI does not read build configuration or Cloudflare credentials; only the protected `pages-production` environment can inject the configuration required for the production build and Cloudflare Pages, then verify the [live app](https://fret-app.zgq.me/) after deployment.

## Run locally

Node.js 24 and pnpm 11 are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Common checks:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` generates PWA icons, iPhone and iPad startup images, the Local Edge loader, Service Worker, and release descriptor. It also checks generated assets, the manifest, iOS metadata, and the offline release. Generated `public/icons/` and `public/splash/` directories are not committed.

## Feedback and issues

External contributions are not open yet. Questions, bug reports, and feedback are welcome through [GitHub Issues](https://github.com/zgq354/fret-app/issues). Please open an issue before investing in a pull request; external PRs are currently outside the maintenance scope and are not guaranteed review or acceptance.

## License

This repository’s original code is licensed under [MIT](LICENSE). Third-party dependencies and the Basic Pitch models copied at build time remain under their respective licenses: `@spotify/basic-pitch` and `@tensorflow/tfjs` are Apache-2.0; Tonal, React, and React DOM are MIT.
