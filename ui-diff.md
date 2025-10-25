# UI Diff Log

> Codex reminder: every time you modify any UI asset under `./src`, append the relevant summary here before finishing the task.

- **Baseline (Figma auto-sync)**: `77802800d28e3c6d903ab4a1a6d1fc9dc5b71688`
- **Current delta owner**: Codex agent
- **Scope**: `src/components/SetupPage.tsx`, `src/App.tsx`, `src/components/ScheduledInterviews.tsx`

## Summary Of Deviations
1. Reintroduced backend-powered competency + rubric flow (API calls, schema-safe helpers, clipboard, scoring guidance).
2. Restored preset pickers from `../test` plus deterministic ID defaults so manual edits stay in sync.
3. Tightened gating for schedule CTA (requires generated rubric + styled competencies) and added user-facing errors/resets.
4. Wired scheduled interviews view to backend persistence with loading/retry UX and camel/snake case adapters.

## Detailed Notes

### src/components/SetupPage.tsx
- Imports shared presets and `API_BASE_URL`, adds inline module comment per style guide.
- Extends `Competency`/`InterviewDetails` plus new DTOs (`LlmCompetency`, `RubricPayload`, etc.) to align with backend schemas; converts rubric map to reusable helper.
- Initializes selector defaults (`custom`/`empty`) and tracks competency/rubric error + copy status flags.
- Adds `resetCompetencyState` and `resetRubricState` helpers; updates job/resume text setters to call them for consistent UX.
- Replaces mock timeouts with real `fetch` calls to `/api/competencies/generate` and `/api/rubrics/generate`, including validation, retry messaging, and rationale propagation.
- Rubric dialog now shows backend role/level metadata, per-criterion scoring-level guidance, and offers JSON copy control; success badges/errors reflect fetch status.
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
