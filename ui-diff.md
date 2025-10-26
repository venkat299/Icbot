# UI Diff Log

> Codex reminder: every time you modify any UI asset under `./src`, append the relevant summary here before finishing the task.

- **Baseline (Figma auto-sync)**: `77802800d28e3c6d903ab4a1a6d1fc9dc5b71688`
- **Current delta owner**: Codex agent
- **Scope**: `src/components/SetupPage.tsx`, `src/App.tsx`, `src/components/ScheduledInterviews.tsx`, `src/components/Chatbot.tsx`

## Summary Of Deviations
1. Reintroduced backend-powered competency + rubric flow (API calls, schema-safe helpers, clipboard, scoring guidance).
2. Restored preset pickers from `../test` plus deterministic ID defaults so manual edits stay in sync.
3. Tightened gating for schedule CTA (requires generated rubric + styled competencies) and added user-facing errors/resets.
4. Wired scheduled interviews view to backend persistence with loading/retry UX and camel/snake case adapters.
5. Harmonized rubric scoring level typography with the shared text scale so level guidance matches surrounding copy.
6. Synced the scheduled-interviews rubric dialog with the setup dialog so typography, weights, scoring levels, and notes match exactly.
7. Chat view now requests the warm-up plan from the backend, replacing seeded copy with live interview context and follow-up prompts.
8. Warm-up follow-ups are generated on demand from the backend using the candidate's reply instead of static placeholders.
9. Removed the legacy hardcoded warm-up fallback so UI surfaces a transient availability notice when the backend call fails.

## Detailed Notes

### src/components/SetupPage.tsx
- Imports shared presets and `API_BASE_URL`, adds inline module comment per style guide.
- Extends `Competency`/`InterviewDetails` plus new DTOs (`LlmCompetency`, `RubricPayload`, etc.) to align with backend schemas; converts rubric map to reusable helper.
- Initializes selector defaults (`custom`/`empty`) and tracks competency/rubric error + copy status flags.
- Adds `resetCompetencyState` and `resetRubricState` helpers; updates job/resume text setters to call them for consistent UX.
- Replaces mock timeouts with real `fetch` calls to `/api/competencies/generate` and `/api/rubrics/generate`, including validation, retry messaging, and rationale propagation.
- Rubric dialog now shows backend role/level metadata, per-criterion scoring-level guidance, and offers JSON copy control; success badges/errors reflect fetch status.
- Scoring-level headers and entries now reuse the standard `text-xs` styling to eliminate the mismatched font sizing called out in design QA.
- Schedule button now emits normalized rubric via `mapRubricForInterview`, ensuring downstream components receive the latest structured rubric.
- Adds async scheduling handler with spinner/error messaging so failures don't clear state prematurely.

### src/App.tsx
- Imports shared API config and introduces DTO adapters for interview persistence.
- Fetches scheduled interviews from `/api/interviews` on load with retry wiring and shares loading/error flags.
- Posts new interviews via `/api/interviews`, transforms payloads between camel/snake case, and updates local state on success.

### src/components/ScheduledInterviews.tsx
- Accepts loading/error/retry props, displaying skeleton or error card before rendering schedules.
- Adds spinner-driven loading state plus retry button aligned with backend fetch.
- Extends competency display to carry optional rationales for parity with setup view.
- Rubric modal now mirrors the setup view including rounded weights, scoring-level guidance, and the reminder note for consistent QA styling.

### src/components/Chatbot.tsx
- Replaces seeded warm-up transcript with an async fetch to `/api/warmup/opening`, rendering greeting/objective/question from the backend.
- Persists the returned follow-up so the first assistant reply mirrors the warm-up plan and pipes through TTS when enabled.
- Clears/rewinds chat state when no interview is selected and derives competency counts from scheduled interview data.
- Sends the candidate's warm-up response to `/api/warmup/followup`, renders the adaptive follow-up, and surfaces a warm-up availability notice instead of fabricating guidance when the request fails.
- Persists the warm-up session state returned by the backend so every follow-up request includes conversation history, readiness flags, and context.
- Respects the updated backend responses by surfacing readiness-closing messages, rearming pending state only when another warm-up prompt is expected, and preventing duplicate TTS playback on state-only updates.
- Drops the static warm-up fallback plan and follow-up phrasing; on failure the assistant now emits an availability notice without fabricating questions.
