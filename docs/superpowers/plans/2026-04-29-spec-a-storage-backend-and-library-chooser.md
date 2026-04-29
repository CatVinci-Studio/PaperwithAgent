# Spec A — Implementation Plan

> Implementation plan for `docs/superpowers/specs/2026-04-29-spec-a-storage-backend-and-library-chooser-design.md`. Phases are committed independently.

**Goal:** Refactor `Library` onto a `StorageBackend` interface, add an S3 backend, and replace launch-time auto-create with a first-run library chooser.

**Architecture:** New `paperdb/backend.ts` interface; `LocalBackend` and `S3Backend` implementations; `Library` constructor now takes a backend. New `libraries/registry.ts` (JSON in `userData`) and `libraries/credentials.ts` (`safeStorage`). `LibraryManager` orchestrates registry → backend → `Library`. `main/index.ts` no longer auto-creates; renderer shows a `WelcomeScreen` when the registry is empty.

**Tech Stack:** Existing stack + `@aws-sdk/client-s3` for S3 backend.

---

## Phase 1 — Backend interface + LocalBackend

- Add `src/main/paperdb/backend.ts` with `StorageBackend` interface and typed errors.
- Add `src/main/paperdb/backendLocal.ts` (wraps `fs/promises`).
- Add unit tests for `LocalBackend` against `mkdtemp`.
- Commit.

## Phase 2 — Library refactor onto backend

- Replace constructor `Library.open(root)` with `Library.open(backend)`.
- Route every `fs`/`path` call in `store.ts`, `csv.ts`, `schema.ts`, `import.ts` through the backend.
- `import.ts:importPdf` still reads the source PDF from a real fs path (input is outside the library) but writes via the backend.
- Existing `library.integration.test.ts` updated to construct via `LocalBackend`.
- All existing 39 tests must pass unchanged in behavior.
- Commit.

## Phase 3 — S3Backend

- Add `@aws-sdk/client-s3` dep.
- Add `src/main/paperdb/backendS3.ts` implementing `StorageBackend` against an S3-compatible API.
- Unit tests are skipped unless `S3_TEST_ENDPOINT` env var is set; the contract is identical to local.
- Commit.

## Phase 4 — Library registry + credential store

- Add `src/main/libraries/registry.ts` (libraries.json in `userData`).
- Add `src/main/libraries/credentials.ts` (safeStorage; plaintext fallback when unavailable).
- Unit tests for both modules with mocked `app.getPath` and `safeStorage`.
- Commit.

## Phase 5 — LibraryManager + IPC rewrite

- Rewrite `paperdb/manager.ts` to orchestrate registry + credentials + backend factories.
- Update `shared/types.ts` `IpcChannels`: replace old `libraries:*` shape with new entry-based API; add `library:probe`, `library:probeS3`, `library:pickFolder`, `library:none` event.
- Rewrite `ipc/libraries.ts` to expose new handlers.
- Update preload `index.ts` and renderer `lib/ipc.ts` (+ web stub) to match.
- Add migration: if `libraries.json` absent but old electron-store config exists with at least one library, seed registry from it on first launch.
- Update `main/index.ts` to not auto-create; emit `library:none` to renderer when registry empty.
- All existing tests still pass.
- Commit.

## Phase 6 — Renderer welcome screen + settings

- New `src/renderer/src/features/onboarding/WelcomeScreen.tsx` with the three-action flow (Open existing, Create new local, Connect S3).
- New `src/renderer/src/features/onboarding/S3ConnectForm.tsx` (provider preset dropdown + endpoint/region/bucket/creds).
- `App.tsx` mounts `WelcomeScreen` when `useLibrary().status === 'none'`.
- `features/settings/tabs/LibraryTab.tsx` updated to show the new entry list and add-library button.
- Add EN + ZH strings to `locales/en.json` + `locales/zh.json`.
- Commit.

## Phase 7 — Polish + final verification

- `npm run typecheck`, `npm run lint`, `npm test` all green.
- Smoke-test mental walkthrough of the three onboarding paths.
- Commit any final fixups.
