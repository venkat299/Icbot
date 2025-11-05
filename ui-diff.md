# UI Diff Log

> Codex reminder: every time you modify any UI asset under `./src`, append the relevant summary here before finishing the task.

- **Baseline (Figma auto-sync)**: `77802800d28e3c6d903ab4a1a6d1fc9dc5b71688`
- **Current delta owner**: Codex agent
- **Scope**: `src/components/SetupPage.tsx`, `src/App.tsx`, `src/components/ScheduledInterviews.tsx`, `src/components/Chatbot.tsx`, `src/components/InterviewReport.tsx`, `src/components/ReportPage.tsx`

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
10. Added an opt-in candidate auto-reply pipeline that pulls feature flags, calls the dedicated microservice, and falls back to demo copy when disabled or unavailable.
11. Competency stages now auto-kick off after warm-up, pulling style directives from the backend and surfacing them in the chat timeline.
12. Stabilized the chat auto-reply loop by reordering callbacks so post-reply sequencing no longer references functions before they initialize.
13. Prevented repeated warm-up fetch loops by memoizing the competency focus helper.
14. Stopped the competency auto-retry loop by keeping the kickoff flag latched after a failed fetch.
15. Surfaced backend error details for competency directives to simplify debugging.
16. Guarded competency launches against missing styles to prevent invalid API calls.
17. Added console telemetry for interview stage transitions and directive flow.
18. Chatbot now drives the flow through new session endpoints, removing client-side stage orchestration and demo controls.
19. Sidebar metrics derive from session directives with safe fallbacks, preventing undefined criteria errors.
20. Setup style selector now hydrates from the backend style catalog so dropdown options always reflect `styles_config.json`.
21. Scheduled interviews list now exposes a delete action per card tied to the backend endpoint.
22. Scheduled interview cards include a Criterion Directives dialog that previews concept-primer prompts derived from each rubric criterion.
23. Completed interview cards expose transcript and evaluation buttons (with current placeholder messaging) so reviewers know where archived data will appear once scoring persistence lands.
24. Added a Resume dialog to scheduled interview cards so reviewers can read the candidate’s resume without leaving the dashboard.
25. “End Interview” now finalizes the session server-side, persisting transcripts, criterion scores, and wrap-up summaries so the scheduled interview cards can surface the latest evaluation data.
26. Aligned transcript/evaluation dialogs with redo/start/delete actions so all completion controls sit together beside the score details button.
27. Moved start/redo/delete controls into the score cluster and stripped duplicate action markup so the scheduled card header presents a single, well-formed control group.
28. Transcript and evaluation dialogs now lock their headers while the body scrolls using native overflow containers so long content shows a visible scrollbar on all platforms.
29. Default landing view switched to the scheduled interviews dashboard; setup flow is now reached via the existing “Schedule New Interview” CTA.
30. Moved back navigation from the scheduled view to the setup header so users return via the create flow instead of the schedule list toolbar.
31. Added entry-level Python backend, data analyst, and data scientist presets (job descriptions and resumes) to the setup dropdowns for quicker demo scheduling.
32. Introduced an interviewer sidebar toggle for auto candidate responses so facilitators can switch to manual typing on demand.
33. Loosened concept primer directives to encourage varied question openers and richer rationale prompts in competency interviews.
34. Wrapped the auto-reply toggle in a bordered, shadowed container to make the control pop within the interviewer sidebar.
35. Report pages display a scrollable full transcript sourced from the shared transcript turn model.
36. Retired the modern report theme so the viewer always renders the classic layout.
22. Auto candidate reply watcher now keys solely on reply expectation so competency directives trigger auto responses even when rendered as interviewer turns.
35. Relocated the interview progress indicator into the interviewer sidebar so facilitators track flow alongside evaluation context.
36. Defaulted auto-reply control to off so interviewers opt-in before the assistant speaks for candidates.
37. Styled the auto-reply toggle with a gray border to match the sidebar’s control affordances.
38. Added a dedicated report view from scheduled interviews with full PDF-ready summary data.
39. Interview report now renders highlights, attachments, and LLM metadata for transparency.
40. Enabled PDF export for reports with backend streaming endpoint and frontend download controls.
41. Interviewer sidebar now streams live evaluation status, directive objectives, scoring levels, and manual replies even with auto-reply disabled.
42. Wrap-up messaging is now LLM-generated, thanking the candidate and inviting feedback, while the flow offers supportive hints when the candidate asks for help.

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
- Fetches interview styles from `/api/styles`, sorts them for display, and disables selection when none are available so the dropdown stays in sync with backend configuration.
- Adds per-interview delete control that calls the new backend route and visually nests it with score badges.

### src/App.tsx
- Imports shared API config and introduces DTO adapters for interview persistence.
- Fetches scheduled interviews from `/api/interviews` on load with retry wiring and shares loading/error flags.
- Posts new interviews via `/api/interviews`, transforms payloads between camel/snake case, and updates local state on success.
- Loads the backend `ui` config to pick the default view mode and pass TTS/auto-reply defaults into the chat experience.

### src/components/ScheduledInterviews.tsx
- Accepts loading/error/retry props, displaying skeleton or error card before rendering schedules.
- Adds spinner-driven loading state plus retry button aligned with backend fetch.
- Extends competency display to carry optional rationales for parity with setup view.
- Rubric modal now mirrors the setup view including rounded weights, scoring-level guidance, and the reminder note for consistent QA styling.
- Consolidated card action cluster by tucking start/redo/delete next to the score tile and removing the duplicated button block that previously broke JSX compilation.

### app_config.json
- Consolidates UI behavior under the `ui` block (TTS default off per request) and removes the redundant `features` object so there is a single source of truth for auto-reply toggles.
- Registers `wrapup.closing` so the wrap-up agent can generate LLM-driven farewell messages.

### icbot_backend/config.py
- Drops the unused `FeatureFlags` model and surfaces the UI defaults exclusively through `UiConfig`, keeping the runtime schema aligned with `app_config.json`.

### src/components/Chatbot.tsx
- Replaces seeded warm-up transcript with an async fetch to `/api/warmup/opening`, rendering greeting/objective/question from the backend.
- Persists the returned follow-up so the first assistant reply mirrors the warm-up plan and pipes through TTS when enabled.
- Clears/rewinds chat state when no interview is selected and derives competency counts from scheduled interview data.
- Sends the candidate's warm-up response to `/api/warmup/followup`, renders the adaptive follow-up, and surfaces a warm-up availability notice instead of fabricating guidance when the request fails.
- Persists the warm-up session state returned by the backend so every follow-up request includes conversation history, readiness flags, and context.
- Respects the updated backend responses by surfacing readiness-closing messages, rearming pending state only when another warm-up prompt is expected, and preventing duplicate TTS playback on state-only updates.
- Drops the static warm-up fallback plan and follow-up phrasing; on failure the assistant now emits an availability notice without fabricating questions.
- Respects injected UI config for view mode, TTS, and auto-reply settings so environments can centrally control those behaviors without touching the code.
- Tags interviewer prompts with `expectCandidateReply`, mirrors conversation roles through a shared mapper, and introduces an auto-reply loop that watches the latest AI prompt, pulls persona/context, and submits a generated candidate response via `fetchCandidateReply` without synthesizing placeholder dialog.
- Removes the canned fallback utterances so every bot reply either comes from `/api/candidate/reply` or emits a clear availability notice when the service/feature is disabled.
- Routes auto-generated answers through the same warm-up follow-up pipeline as real candidate replies so the backend receives proper `candidate_response` submissions before issuing the next prompt.
- Detects warm-up completion, streams competency style directives via the new `/api/competency/stage` endpoint, and loops directives across competencies using shared style state snapshots.
- Reordered the post-reply callback definitions so the competency advance helper is initialized before dependency arrays consume it, eliminating the runtime ReferenceError.
- Memoized the competency focus selector so the warm-up bootstrap effect runs just once per interview instead of re-firing on every render.
- Sends candidate-typed responses to the backend when the UI operates in candidate mode, keeping manual interviews functional.
- Detects pending prompts and routes typed text as candidate replies even while remaining in interviewer view when auto-reply is disabled.
- Hydrates the interviewer sidebar with backend-provided snapshots so evaluation metrics update in real time.
- Removed the failure-side reset of the competency-start flag so the bootstrap effect no longer hammers `/api/competency/stage` when the first fetch returns 400.
- Included backend error details in the competency directive client so console logs show the precise failure reason when the service rejects a request.
- Added a client-side guard that skips stage requests for competencies lacking an interview style, emitting a directive message prompting the scheduler to assign one.
- Rebuilt the component to consume the backend-managed interview session API, trimming local warm-up/competency orchestration, demo question controls, and competency state tracking.
- Derives sidebar snapshots from returned directives and falls back to schedule metadata so interviewer view stays stable when flow data is sparse.
- Hides the progress banner when the interviewer sidebar is visible, delegating the indicator to the facilitator-only panel.
- Defaults auto-reply to disabled until UI config loads so the toggle starts in the off position.
- Tracks the candidate proficiency level, forwards it with auto-reply requests, and hands options to the interviewer sidebar dropdown.

### src/components/InterviewerSidebar.tsx
- Renders an evaluation snapshot card with directive objective, status badge, proficiency level, and confidence.
- Shows scoring levels and criterion status badges, including confidence readouts for each rubric item.
- Hosts the interview progress component with stage counts and retains the auto-reply toggle styling.
- Accepts optional props with sensible defaults so empty snapshots no longer raise runtime errors.
- Adds a compact select next to the auto-reply switch for choosing candidate level 0-5 with config-driven labels.

### src/services/interviewSession.ts
- Maps backend sidebar snapshots into camelCase structures and retains directive parsing as a fallback.
- Keeps centralized error handling for session endpoints.

### src/types/interviewSession.ts
- Extends sidebar snapshot contracts with evaluation status, directive objective, scoring levels, and confidence metrics.
- Instrumented the chat experience with `console.info` hooks so warm-up completion, stage launches, directive responses, and manual progressions are traceable during debugging.

### src/services/candidateAutoReply.ts
- Focuses solely on candidate reply submissions while UI config duties move into a dedicated helper.
- Includes the L0-L5 level identifier in request payloads so the backend can pick the correct prompt.

### src/services/uiConfig.ts
- Adds a shared fetcher for the backend-driven UI config so multiple components can reuse the same defaults.
- Surfaces candidate level defaults and ordered options from the backend so the UI can populate the dropdown.

### icbot_backend/api/server.py
- Removes the legacy `/api/config/features` route; clients now retrieve all UI toggles via `/api/config/ui`.
- Adds a shared fetcher for the backend-driven UI config so multiple components can reuse the same defaults.

### src/config.ts
- Centralizes backend and candidate default hosts, setting the candidate service fallback to `http://127.0.0.1:8100` so browsers can reach the responder via a routable loopback URL even without env overrides.

### src/components/ui/button.tsx
- Wraps the button component with `forwardRef` so Radix dialog triggers can attach refs without runtime warnings.

### icbot_backend/interview_sessions/models.py
- Introduces sidebar snapshot and criterion snapshot schemas attached to session responses.

### icbot_backend/interview_sessions/manager.py
- Computes sidebar snapshots from live session state and includes them on every response.
- Detects candidate uncertainty and injects supportive guidance prompts before re-scoring.
- Uses the wrap-up LLM closing prompt to deliver the thank-you/feedback message instead of a hardcoded string.
- Validates rubric/competency alignment during session start, logs precise mismatches, and logs every advance request to trace rejected events; blocks session launch when directives are missing.
- Emits an explicit error log when an advance arrives for a missing session, including the event type and payload size, so repeated 404s can be diagnosed quickly.

### icbot_backend/agents/wrapup_agent.py
- Adds a closing-message chain that reuses the configured LLM route and produces JSON-formatted farewells.

### icbot_backend/prompts/wrapup.py
- Adds dedicated closing message prompts that instruct the LLM to thank the candidate and invite feedback.

### src/components/ScheduledInterviews.tsx
- Adds a View Report button beside Evaluation, triggering the backend report fetch for the selected interview.
- Criterion directives preview now renders stored directive text without injecting templated phrasing.
- Reuses the shared transcript turn type so schedule cards and reports stay aligned.

### src/App.tsx
- Wires the report view to `/api/interviews/{id}/report`, manages loading/error state, and drops the mock data helper.
- Threaded the candidate level defaults/options from UI config into the live interview view so the chatbot can render the new dropdown.
- Removes the modern report toggle so report navigation always displays the classic layout.

### src/components/InterviewReport.tsx
- Expands the report UI to surface resume highlights, attachments, stage flow, and LLM metadata.
- Removes the Recommended Next Step card and tightens the evaluation metric grid.
- Adds a full transcript card with scrollable turns and shared styling with transcript highlights.

### src/components/ReportPage.tsx
- Adds loading/error handling with retry support around the report renderer and wires export controls.
- Simplifies styling/export hooks now that only the classic report is rendered.

### src/components/ModernInterviewReport.tsx
- Removed; the report view now relies solely on the classic layout.

### icbot_backend/api/server.py
- Exposes `GET /api/interviews/{interview_id}/report` returning structured JSON and `GET /api/interviews/{interview_id}/report.pdf` streaming PDF exports.
- Accepts a `variant` query toggle so the PDF exporter can render the new modern theme.

### icbot_backend/schemas/report.py
- Defines typed interview report models covering candidate, position, session, evaluation, and LLM metadata sections.
- Removes the `recommended_next_step` field from overall evaluation so downstream surfaces can omit it cleanly.

### icbot_backend/reporting/builder.py
- Builds the interview report from stored interview data, deriving summaries, evaluations, and attachments.
- Stops deriving recommended next steps, leaving overall evaluation to communicate status, score, and confidence only.

### icbot_backend/reporting/pdf.py
- Replaces the bespoke FPDF renderer with a WeasyPrint HTML pipeline and themed markup.
- Drops the printed next-step line to match the streamlined evaluation payload.
- Applies the glassmorphism-inspired palette with styled headings, accent cards, and success/warning fills so the PDF matches the UI theme.
- Adds a modern pastel renderer and routes variant selection through a shared helper.

### src/components/InteractiveQuestion.tsx
- Switches to shared interactive question types and submits structured answers back to the chat flow.

### src/components/ChatMessage.tsx
- Injects interactive question widgets using the new shared types while preserving submission state styling.

### src/components/Chatbot.tsx
- Ensures the preparation overlay always opens on session load so every user sees the staged warmup before entering chat.
- Clears the session id when the backend marks a session `done` so the UI stops sending advance events after completion.
- Maps interactive question payloads from the session API, surfaces them in the timeline, and routes submissions through the existing reply handler.
- Reordered reply handler hooks so interactive submissions call initialized callbacks without runtime reference errors.
- Detects expired interview sessions, shows a friendly notice, and automatically reboots the flow so 404s from the backend recover without manual refresh.

### src/services/interviewSession.ts
- Normalizes interactive question payloads from the backend into camel-cased data for the chat UI.
- Attaches HTTP status metadata to thrown errors and provides clearer messaging for expired sessions.

### src/types/interactiveQuestion.ts
- Centralizes interactive question and answer type definitions for reuse across UI modules.

### src/types/transcript.ts
- Introduces a shared transcript turn interface consumed by scheduling and reporting views.

### src/components/ui/dialog.tsx
- Wraps dialog overlay and content in `forwardRef` to keep Radix slot refs working without console warnings.

### src/components/InterviewPrepOverlay.tsx
- Adds animated prep stages, progress bar, and glassmorphism refinements plus a ready-state system check panel and enhanced start CTA.
- Tweaks the prep overlay styling so the loading phase carries a blue gradient backdrop and the start button uses the richer blue gradient treatment.
- Aligns the start button with the reference by applying the provided OKLCH gradient inline and matching the blue icon styling.

### src/index.css
- Adds explicit blue gradient utility overrides and color tokens so gradient classes resolve to the expected blue tones.
