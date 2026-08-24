# Architecture

Fret & Key is a static browser application. It turns microphone, touch, and MIDI input into music-theory readings, then renders the same result across a guitar fretboard, piano keyboard, and staff notation. It has no account, server, or backend data authority.

## Runtime map

| Module | Responsibility | Does not contain |
| --- | --- | --- |
| `music` | Pitch naming, frequencies, chord candidates, standard-tuning fret positions, and notation transforms | React state, browser APIs, audio device access |
| `audio` | Microphone constraints, capture, monophonic analysis, polyphonic Worker inference, and persisted analysis settings | UI layout or note rendering |
| `learning` | Listen / play mode, displayed notes, and play-session policy | Device or audio implementation |
| `playback` | Web Audio voices, pointer glissando, and voice lifecycle | MIDI transport or music-theory rules |
| `midi` | Web MIDI input discovery and Note On / Note Off adaptation | Audio synthesis or UI state |
| `settings` | Display preference persistence and normalization | Audio capture or release lifecycle |
| `platform` | Local Edge update and diagnostics adapters | Service Worker implementation |
| `components` | React surfaces for the fretboard, piano, staff, input controls, and settings | Cross-surface policy or browser runtime ownership |
| `App.tsx` | Composition of module state, user-intent transitions, and props for the visible surface | Independent domain algorithms |

The pure `music` module is the lower dependency layer. Browser adapters and interaction policy may consume it; it must not import from React, DOM, storage, or host modules. Components may combine owned state for a visible surface, while `App.tsx` remains the only application-wide composition root.

## Input to display

### Listening

For monophonic listening, `audio/react/usePitchDetection.ts` captures microphone samples through the Web Audio API, estimates a frequency, and converts it to a `PitchReading` through `music`.

For experimental polyphonic listening, `audio/react/usePolyphonicPitchDetection.ts` captures PCM through the public AudioWorklet, maintains a bounded sample ring, and sends analysis work to a Worker. The Worker loads Basic Pitch and returns note candidates; `music/chordAnalysis.ts` turns a result into a displayable chord reading. The feature is intentionally not source separation or continuous-song transcription.

### Playing

Touch and pointer interaction creates a `PlayNoteRequest`. `learning/react/usePlaySession.ts` owns the visible and sounding-note session, while `playback/react/usePlayback.ts` owns Web Audio output. `midi/react/useMidiInput.ts` adapts MIDI device events into the same play-session path, so UI, touch, and MIDI do not create separate music models.

### Views

`App.tsx` selects one active reading and passes it to the fretboard, piano, and staff components. Each surface projects the same MIDI / pitch-class information for its own geometry; it does not reinterpret microphone or MIDI events.

## Release and offline model

The normal network document remains runnable without Local Edge. A build produces the application bundle, same-origin loader, Service Worker, static model and worklet assets, and a release descriptor. [`@fullstack-webapp/local-edge`](https://github.com/fullstack-webapp/fwa-kit/tree/main/packages/local-edge) verifies and commits a complete release before it becomes active, preserving the last known good release on failure.

Fret & Key keeps `fwa.config.json`, the application build entries, static assets, and the user-facing update / recovery policy. Local Edge provides release validation, cache lifecycle, and request interception. The application consumes only the package’s public Vite and client surfaces.

## Build and production boundary

`pnpm build` is the reproducible public build. It generates PWA images, copies Basic Pitch model assets, builds the application / loader / worker entries, publishes the Local Edge release descriptor, and checks PWA and site metadata.

GitHub Actions runs the public verification matrix without build configuration or Cloudflare credentials. A protected `pages-production` environment injects only the configuration needed for the production Analytics snippet and Cloudflare Pages deploy. Source code does not load local `.env` files, and a production build fails closed when the Analytics configuration is missing or malformed.

## Verification

- Unit tests cover music transforms, audio helpers, settings, MIDI adaptation, play-session policy, and Local Edge adapters.
- Local Edge browser tests cover installation, offline restart, network escape, diagnostics, and complete-release updates.
- `pnpm build` checks static assets, PWA metadata, host ownership, and the release descriptor.
- CI combines linting, type checking, unit tests, browser evidence, and the public build. The protected deployment workflow reruns it before publishing and then checks the production URL.
