# Fret & Key · Agent Guide

Fret & Key is a static browser application for learning the relationship between a guitar fretboard, piano keyboard, staff notation, and played pitches. The public README is the product entry; this file is the engineering entry for maintainers and coding agents.

## Start here

- Product, local setup, support boundary, and verification entry: [`README.md`](README.md)
- Technical runtime, ownership, build, and release model: [`docs/architecture.md`](docs/architecture.md)
- Local Edge package contracts: [`@fullstack-webapp/local-edge`](https://github.com/fullstack-webapp/fwa-kit/tree/main/packages/local-edge/docs)

## Module map

| Path | Scope |
| --- | --- |
| `src/App.tsx` | Application composition root. It selects module public entries without owning product state or runtime policy. |
| `src/modules/learning-surface/` | Public learning experience: listen / play coordination, display projection, page panels, and module-local React state. |
| `src/modules/music/` | Pure music theory, chord analysis, fretboard geometry, and staff-note transforms. Keep browser APIs and React out. |
| `src/modules/audio/` | Microphone capture, monophonic and polyphonic analysis, worklet / Worker clients, and audio settings. |
| `src/modules/playback/` | Web Audio output and pointer / voice lifecycle. |
| `src/modules/midi/` | Web MIDI input adapter and session lifecycle. |
| `src/modules/settings/` | Persisted display preferences and normalization. |
| `src/platform/` | Browser-host adapters for Local Edge diagnostics and release updates. |
| `public/` | Static assets, PWA metadata, the PCM worklet, and host routing artifacts. |
| `tests/` | Unit and browser evidence, grouped by runtime module; `tests/e2e/` covers public behavior and Local Edge releases. |

## Boundary rules

- Keep `src/modules/music/` deterministic and independent of React, DOM, Web Audio, browser storage, and network APIs.
- Keep capture and inference in `src/modules/audio/`; learning-surface components receive state and callbacks rather than owning microphone or Worker lifecycle.
- Keep browser-host differences in `src/platform/`, `src/modules/midi/`, `src/modules/playback/`, or `src/modules/audio/` adapters. Do not spread feature detection through views.
- Keep headless owner files independent of React. Hooks that adapt `audio`, `midi`, `playback`, `settings`, or `platform` state to React live under that owner's `react/` subtree.
- `src/modules/learning-surface/learning-surface.tsx` is the module public entry. App-level composition must not deep-import its components, hooks, or model.
- Framework-neutral learning projection and transition policy stay under `learning-surface/model/`; module-local React lifecycle stays under `learning-surface/hooks/`.
- Local Edge owns offline release and request interception. This application owns its `fwa.config.json`, product UI, and release policy; it must not deep-import Local Edge internals.
- Production credentials remain GitHub Environment secrets. Do not add `.env` loading, credentials, or deployment tokens to source, tests, or public documentation.

## Validation

Use Node.js 24 and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm run ci
```

For a focused change, start with the owning test or check, then run the relevant broader command before handoff:

- Pure music, settings, playback, MIDI, or audio logic: `pnpm test` and `pnpm typecheck`.
- React interaction or browser lifecycle: `pnpm e2e:local-edge`.
- Build, assets, Local Edge, host ownership, or metadata: `pnpm build`.
- Public-source changes: `pnpm run ci`.

`pnpm build:production` intentionally fails without CI-injected Analytics configuration. It is not a local substitute for public CI. Do not deploy production manually; `main` deploys through the protected `pages-production` environment.

## Documentation

Keep the README product-oriented and bilingual with [`README.en.md`](README.en.md). Put durable technical boundaries in `docs/`; do not turn `AGENTS.md` into a second architecture document. The repository is not accepting external contributions yet; issues are the current feedback channel.
