# Architecture

Fret & Key is a static browser application. It turns microphone, touch, and MIDI input into music-theory readings, then renders the same result across a guitar fretboard, piano keyboard, and staff notation. It has no account, server, or backend data authority.

## Runtime map

| Module | Responsibility | Does not contain |
| --- | --- | --- |
| `modules/music` | Pitch naming, frequencies, chord candidates, standard-tuning fret positions, and notation transforms | React state, browser APIs, audio device access |
| `modules/audio` | Microphone constraints, capture, monophonic analysis, polyphonic Worker inference, and persisted analysis settings | UI layout or note rendering |
| `modules/learning-surface` | Listen / play coordination, shared display projection, and the fretboard, piano, and staff learning surface | Device-specific audio or MIDI implementation |
| `modules/playback` | Web Audio voices, pointer glissando, and voice lifecycle | MIDI transport or music-theory rules |
| `modules/midi` | Web MIDI input discovery and Note On / Note Off adaptation | Audio synthesis or UI state |
| `modules/settings` | Display preference persistence and normalization | Audio capture or release lifecycle |
| `platform` | Local Edge update and diagnostics adapters | Service Worker implementation |
| `App.tsx` | Composition of module public entries | Product state, runtime lifecycle, or independent domain algorithms |

The pure `modules/music` capability is the lower dependency layer. Browser adapters and interaction policy may consume it; it must not import from React, DOM, storage, or host modules. `modules/learning-surface/learning-surface.tsx` is the product module’s public entry: its `model/` is framework-neutral, its `hooks/` coordinate React lifecycles, and its `components/` render the visible surface. `App.tsx` remains the application-wide composition root and imports only that public entry.

## Input to display

### Listening

For monophonic listening, `modules/audio/react/usePitchDetection.ts` captures microphone samples through the Web Audio API, estimates a frequency, and converts it to a `PitchReading` through `modules/music`.

For experimental polyphonic listening, `modules/audio/react/usePolyphonicPitchDetection.ts` captures PCM through the public AudioWorklet, maintains a bounded sample ring, and sends analysis work to a Worker. The Worker loads Basic Pitch and returns note candidates; `modules/music/chordAnalysis.ts` turns a result into a displayable chord reading. The feature is intentionally not source separation or continuous-song transcription.

### Playing

Touch and pointer interaction creates a `PlayNoteRequest`. `modules/learning-surface/hooks/usePlaySession.ts` owns the visible and sounding-note session, while `modules/playback/react/usePlayback.ts` owns Web Audio output. `modules/midi/react/useMidiInput.ts` adapts MIDI device events into the same play-session path, so UI, touch, and MIDI do not create separate music models.

### Views

`modules/learning-surface/model/learning-surface-display.ts` selects one active reading and produces the common MIDI, chord, source-label, and playback projection. The fretboard, piano, and staff components consume that result for their own geometry; they do not reinterpret microphone or MIDI events.

## Release and offline model

The normal network document remains runnable without Local Edge. A build produces the application bundle, same-origin loader, Service Worker, static model and worklet assets, and a release descriptor. [`@fullstack-webapp/local-edge`](https://github.com/fullstack-webapp/fwa-kit/tree/main/packages/local-edge) verifies and commits a complete release before it becomes active, preserving the last known good release on failure.

Fret & Key keeps `fwa.config.json`, the application build entries, static assets, and the user-facing update / recovery policy. Local Edge provides release validation, cache lifecycle, and request interception. The application consumes only the package’s public Vite and client surfaces.

## Build and production boundary

`pnpm build` is the reproducible public build. It generates PWA images, copies Basic Pitch model assets, builds the application / loader / worker entries, publishes the Local Edge release descriptor, and checks PWA and site metadata.

GitHub Actions runs the public verification matrix without build configuration or Cloudflare credentials. A protected `pages-production` environment injects only the configuration needed for the production Analytics snippet and Cloudflare Pages deploy. Source code does not load local `.env` files, and a production build fails closed when the Analytics configuration is missing or malformed.

## Verification

- Unit tests cover music transforms, audio helpers, settings, MIDI adaptation, playSession policy, and Local Edge adapters.
- Local Edge browser tests cover installation, offline restart, network escape, diagnostics, and complete-release updates.
- `pnpm build` checks static assets, PWA metadata, host ownership, and the release descriptor.
- CI combines linting, type checking, unit tests, browser evidence, and the public build. The protected deployment workflow reruns it before publishing and then checks the production URL.
