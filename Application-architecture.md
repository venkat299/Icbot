# Application Flow Overview

- Rubric generation kicks off the flow: the rubric designer agent pulls configuration, queries the LLM via llm_gateway, and produces a calibrated rubric model shared with downstream stages.
- Warm-up stage runs a LangGraph state machine: the warm-up agent greets, scores readiness, logs transition metrics, and generates follow-ups through the shared warm-up route before handing off to competency stages.
- Competency stages run in sequence, one per competency: each agent instance uses the rubric slice for its focus area, requests tailored prompts and probes through the gateway, captures candidate responses, and logs structured evidence and provisional scores.
- Wrap-up stage synthesizes the interaction: the wrap-up agent confirms completion, collects final signals (e.g., self-reflection), and prepares a summary payload for evaluators.
- Evaluation closes the loop: the evaluator agent ingests transcripts, evidence, and rubric data, asks the LLM for scored assessments with justifications, validates against schemas, and outputs the final decision package for reporting
- Competency styles slot neatly into the competency stages: the flow can plug in behavioral, technical deep-dive, situational, or debugging styles as separate LangGraph nodes, each using the same rubric slice but switching question tone, evidence capture, and scoring prompts to match the style’s intent. This keeps stage scaffolding identical while letting the gateway-driven prompts adapt per style for consistent yet flexible assessments.

# Flow Architecture

Core state: flow_state module exposes a Pydantic FlowState (context, progress counters, transcript) plus StageSnapshot for warm-up, competencies, wrap-up. FlowState is the payload passed between LangGraph nodes so every stage stays pure and serializable.
Config: app_config.json (validated by config.py) has flow settings: ordered stage ids (["warmup","competency1","competency2",...]), per-stage LlmRoute references, competency_count bounds (3–5), and style bindings (competency_styles array). Changing stage counts or styles happens only here.
LLM gateway: llm_gateway.runnable(LlmRoute, Schema) centralizes JSON enforcement, retries, and response formatting; all agents receive injected gateway runnables so no module touches LLM internals.
Agent packages: each stage gets its own module with a one-line summary and pure interface:
warmup_agent: WarmupAgent.invoke(state: FlowState) -> FlowState uses LangChain prompt + gateway to fetch conversational openers and capture rapport signals.
competency_agent: parameterized by style_id, asks StyleRuntime.next_directive, then composes prompts and persona tweaks to gather competency evidence; stage configs determine 3–5 nodes in the graph.
wrapup_agent: synthesizes close-out questions, confirms next steps, and prepares evaluator hooks.
Style engine: styles package (base specs, registry, planner, runtime, schemas) converts config-defined styles into LangGraph node runnables. Competency nodes call StyleRuntime to fetch directives and persist style-local state in FlowState.context.
Tooling helpers: flow_manager/agents/toolkit.py offers reusable LangChain message builders, transcript filters, and text clamps so agents avoid duplicating I/O or formatting.
Orchestration: flow_manager/graph.py builds a LangGraph StateGraph. Node order is warmup → N competency nodes (N pulled from config) → wrapup. Competency nodes reuse the same module but inject different style ids. The graph stays declarative: each node function is pure, takes (state, settings) and returns updated FlowState.
Evaluation coupling: agents return structured FlowState; the evaluator module consumes the transcript, rubric trace, and criteria evidence via Pydantic models and runs its own LangGraph route for scoring—no direct cross-module calls.
Extensibility: adding a new stage means defining an agent module, its schemas, and a config entry; the orchestration layer reads the config and wires the node automatically. Changing competency count or styles is a config-only edit.

# Styles Architecture

Style contracts live in styles/base.py: define StyleSpec (one-line intent, stage list), StagePlan (inputs, outputs), and DirectiveSchema (LLM enforceable payload). Every stage function is pure, accepts FlowState + config, returns StagePlan, keeping microservice-friendly boundaries.
The common config (app_config.json) holds a styles section: map each style id to LlmRoute refs, stage templates, retry/timeouts, and any persona hooks. It also binds each module/function to its schema class so the gateway enforces JSON.
styles/registry.py loads the config into Pydantic models at startup and exposes get_style(style_id: str) -> StyleSpec. No module reaches across boundaries; consumers inject the spec.
styles/planner.py composes LangGraph StateGraph nodes per style: stage_sequence(style_spec) builds a graph where each node is a runnable combining ChatPromptTemplate, MessagesPlaceholder, and llm_gateway.runnable(route, schema). Node outputs are validated DirectiveSchema instances.
styles/runtime.py provides StyleRuntime with next_directive(state, style_id) returning the directive model plus updated style state (serialized back through Pydantic). It delegates JSON repair retries to the gateway.
Style definitions are data-first. Examples loaded from config:
behavioral: stage1 probe_past_events (targets teamwork/ownership criteria), stage2 reflective_verification; directives emphasize narrative extraction.
technical_deep_dive: stage1 layered_probe with escalating difficulty, stage2 architecture_verify, stage3 optional failure_analysis.
situational: stage1 scenario_walkthrough guided by hypothetical setups, stage2 decision_tradeoff, optional risk_followup.
debugging: stage1 triage_probe with quick signal checks, stage2 fault_isolation_task, stage3 repair_validation.
Shared helpers (flow_manager/agents/toolkit.py) convert transcripts into LangChain message dicts, apply clamping, and map directive models into downstream agent prompts—no style-specific branching.
To add a new style, drop a config entry with stage sequence and schemas, register parser classes under styles/schemas/, and the runtime automatically wires the graph with the configured LLM routes.

# Verification Flexibility

Expand the style schema so each stage2 entry lists task_catalog items with ids like knowledge_basic, code_micro, debug_one_liner, formula_term. Keep these in config so styles choose mixes without new code.
In styles/runtime, map each task id to a template injected into the LLM prompt (e.g., knowledge prompts request concise foundational explanations; code micro prompts ask for 5–10 line snippets; debug prompts describe a tiny faulty snippet; formula prompts require defining and contextualizing a metric).
Update style definitions to pick from this catalog: behavioral styles lean on knowledge_basic, technical deep-dive rotates code_micro and debug_one_liner, data-centric styles prioritize formula_term. The \_task_mix equivalent simply reads the catalog sequence per style.
Because the gateway enforces schemas, return directives with explicit task_id and task_brief, letting downstream agents render the right question format while keeping verification logic uniform across styles.

# Rubric Architecture

Intake & Defaults: identify_competencies builds a LangChain task—seeded with JD analysis, seniority band, and the style catalog—then calls llm_gateway.call with the CompetencyDefaultsPlan schema so the LLM returns competencies, seed criteria, and a style id per competency (validated before persistence).
Persistence Layer: rubric_store hides SQLite (or interchangeable storage), offering typed methods (save_competency_slate, record_evidence, save_assignment_rubrics) that serialize and reload only Pydantic models; competency-to-style selections ride along in competency_styles.
Style Catalog: app_config.json owns the style definitions (sample set: behavioral_foundation, coding_precision, system_design_scaling, data_insight, diagnostic_debug); config.py loads them into a registry shared by both rubric design and flow orchestration so LLM choices and runtime behavior stay aligned.
Evidence & Tasks: resume or hypothetical evidence packets are captured as CompetencyEvidence models. The rubric_engine composes each competency’s defaults, evidence, and chosen style into a RubricTask, invokes the gateway with the Rubric schema, and merges resume/hypothetical drafts when both exist.
Service Facade: rubric_service exposes identify_competencies and prepare_assignment_rubrics, returning only validated Pydantic payloads to callers; downstream agents inject these models without touching storage, prompts, or style internals.

# Sample Styles

behavioral_foundation: Stage1 probe_past_events (mode probe, probe_min=5, concept_min=3, task_catalog=["knowledge_basic"]), Stage2 reflective_verification (tasks=1, followups=1, task_catalog=["knowledge_basic","tradeoff_reasoning"]); emphasizes teamwork, ownership, retrospection.
coding_precision: Stage1 layered_probe (mode probe, probe_min=8, cycle=[1,2,3], task_catalog=["code_micro"]), Stage2 micro_implementation (tasks=2, task_catalog=["code_micro","debug_one_liner"]), optional Stage3 refactor_followup; targets implementation depth and code quality.
system_design_scaling: Stage1 scenario_walkthrough (mode scenario, scenario_structure=["context_setup","constraint_probe","tradeoff_choice","risk_scan"]), Stage2 architecture_verification (tasks=2, task_catalog=["tradeoff_reasoning","knowledge_basic"], followups=2); fits backend/platform interviews.
data_insight: Stage1 metric_probe (mode probe, probe_min=6, concept_min=4, task_catalog=["formula_term","knowledge_basic"]), Stage2 analysis_verification (tasks=2, task_catalog=["formula_term","tradeoff_reasoning"]), optional Stage3 experimentation_followup; suits analytics/ML roles.
diagnostic_debug: Stage1 triage_probe (triage_levels=[1,2,3], task_catalog=["debug_one_liner"]), Stage2 fault_isolation (tasks=2, task_catalog=["debug_one_liner","code_micro"], followups=2), optional Stage3 stability_wrap; covers troubleshooting and reliability checks.
Drop these into the styles config (stage list, task_catalog, task_counts) and the runtime builds LangGraph nodes with the right prompt templates and LLM routes for coverage across behavioral, coding, system design, data science, and debugging interviews.

# Evaluation Stack

evaluation/models.py: Pydantic DTOs for EvaluationInputs (transcript slices, rubric, evidence, metadata) plus EvaluationVerdict (scores, rationale, risk flags, audit trail); all downstream functions trade only these models.
evaluation/registry.py: loads app_config.json section llm_routes.evaluation.\*, binding each public function (rubric synthesis, scoring, calibration, QA) to an LlmRoute and output schema; exposes get_route("evaluation.scoring").
evaluation/prompts.py: holds LangChain ChatPromptTemplates and system hints for scoring, justification rewriting, calibration; templates accept only structured kwargs (e.g., rubric JSON, transcript digest) to keep callers declarative.
Gateway + LangGraph

llm_gateway already exposes call(task, schema, cfg) and runnable(cfg, schema); evaluation uses the runnable form so LangGraph nodes compose ChatPromptTemplate | MessagesPlaceholder | runnable.
evaluation/graph.py: builds a LangGraph StateGraph with pure nodes collect_evidence, score_competencies, calibrate, finalize_report; each node takes EvaluationState (Pydantic mirror of FlowState + evaluation config) and returns an updated copy.
Retry, JSON enforcement, and schema validation stay inside the gateway; nodes only handle domain transforms (e.g., mapping competency evidence to ScoreRequest).
Agent Layer

evaluation/agent.py: defines EvaluationAgent with invoke(state: EvaluationState) -> EvaluationState; wraps graph.run and injects toolkits (transcript helpers, message builders) from flow_manager/agents/toolkit.
Helper module evaluation/evidence.py provides pure utilities to summarize transcripts per competency, normalize timestamps, and dedupe evidence strings; shared across nodes.
Integration Points

Orchestrator appends evaluation_agent to the existing flow graph; when wrap-up completes it passes FlowState into EvaluationAgent after conversion via evaluation.adapters.from_flow_state.
app_config.json: new blocks evaluation: routes (per-node LLM configs), schemas (import paths for Pydantic classes), weights (competency weighting), reporting (channels, template ids); validated by config.py.
Outputs bubble back into FlowState.evaluation_snapshot, keeping the interview flow serializable/microservice-friendly.
Reporting + Persistence

evaluation/reporter.py: pure function build_report(verdict: EvaluationVerdict, cfg: ReportingConfig) -> EvaluationReport ready for storage or API return.
Storage/transport handled outside evaluation package (e.g., services/report_sink.py) to keep I/O separated; evaluation returns only data models.
