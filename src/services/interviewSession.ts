// Provides client helpers for interview session orchestration endpoints.
import { API_BASE_URL } from '../config';
import type {
  InterviewSessionResponse,
  SessionEventRequest,
  SessionMessage,
  SidebarSnapshot,
} from '../types/interviewSession';

interface ApiSessionMessage {
  message_id: string;
  role: 'system' | 'directive' | 'interviewer' | 'candidate';
  text: string;
  expect_candidate_reply: boolean;
  objective?: string | null;
  metadata?: Record<string, string> | null;
}

interface ApiSidebarCriterion {
  name: string;
  level: number | null;
  confidence: number | null;
  status: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  max_level: number;
}

interface ApiSidebarSnapshot {
  stage: 'warmup' | 'competency' | 'wrapup' | 'completed';
  current_competency?: string | null;
  current_criterion?: string | null;
  interview_style?: string | null;
  directive_objective?: string | null;
  evaluation_status?: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  proficiency_level?: number | null;
  confidence?: number | null;
  scoring_levels?: Record<string, string> | null;
  criteria?: ApiSidebarCriterion[] | null;
  score_notes?: string | null;
  overall_score?: number | null;
  red_flags?: string[] | null;
}

interface ApiSessionResponse {
  session_id: string;
  stage: 'warmup' | 'competency' | 'wrapup' | 'completed';
  messages: ApiSessionMessage[];
  done: boolean;
  competency_id?: string | null;
  sidebar?: ApiSidebarSnapshot | null;
}

const mapSessionMessage = (payload: ApiSessionMessage): SessionMessage => ({ // Normalizes API message payload.
  messageId: payload.message_id,
  role: payload.role,
  text: payload.text,
  expectCandidateReply: payload.expect_candidate_reply,
  objective: payload.objective ?? null,
  metadata: payload.metadata ?? undefined,
});

const mapSessionResponse = (payload: ApiSessionResponse): InterviewSessionResponse => ({ // Converts API response to frontend model.
  sessionId: payload.session_id,
  stage: payload.stage,
  messages: payload.messages.map(mapSessionMessage),
  done: payload.done,
  competencyId: payload.competency_id ?? null,
  sidebar: mapSidebarSnapshot(payload.sidebar ?? null),
});

const handleError = async (response: Response, fallback: string) => { // Parses API errors with detail support.
  try {
    const body = await response.json();
    if (body?.detail) {
      throw new Error(`${fallback}: ${body.detail}`);
    }
  } catch {
    throw new Error(`${fallback} (${response.status})`);
  }
  throw new Error(`${fallback} (${response.status})`);
};

export async function startInterviewSession(interviewId: string): Promise<InterviewSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    await handleError(response, 'Failed to start interview session');
  }
  const payload: ApiSessionResponse = await response.json();
  return mapSessionResponse(payload);
} // Creates a new interview session and returns initial step.

export async function advanceInterviewSession(sessionId: string, request: SessionEventRequest): Promise<InterviewSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interview_sessions/${sessionId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    await handleError(response, 'Failed to advance interview session');
  }
  const payload: ApiSessionResponse = await response.json();
  return mapSessionResponse(payload);
} // Applies an event to the active interview session.

export async function completeInterviewSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/interview_sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.status === 404) {
    return;
  }
  if (!response.ok) {
    await handleError(response, 'Failed to complete interview session');
  }
} // Finalizes the interview session and persists results.

export const extractSidebarSnapshot = (session: InterviewSessionResponse): SidebarSnapshot | null => {
  if (session.sidebar) {
    return session.sidebar;
  }
  if (session.stage !== 'competency') {
    return null;
  }
  const directive = [...session.messages].reverse().find(message => message.role === 'directive');
  if (!directive) {
    return null;
  }
  const lines = directive.text.split('\n').map(line => line.trim());
  const competencyLine = lines.find(line => line.startsWith('Competency:'));
  const competencyName = competencyLine ? competencyLine.replace('Competency:', '').trim() : session.competencyId ?? 'Competency';
  const styleMatch = directive.text.match(/Style:\s([^|]+)(?:\||$)/);
  const interviewStyle = styleMatch ? styleMatch[1].trim() : (directive.metadata?.stage_id ?? 'Style');
  const bulletMatches = directive.text.match(/•\s([^\n]+)/g) ?? [];
  const criteria = bulletMatches.map(entry => entry.replace(/^•\s/, '')).map(name => ({
    name,
    level: null,
    confidence: null,
    status: 'pending' as const,
    maxLevel: 5,
  }));
  return {
    overallScore: null,
    currentCompetency: competencyName,
    currentCriterion: null,
    interviewStyle,
    criteria,
    scoreNotes: directive.objective ?? 'Awaiting evaluation notes.',
    redFlags: [],
    directiveObjective: directive.objective ?? null,
    scoringLevels: {},
    evaluationStatus: 'pending',
    proficiencyLevel: null,
    confidence: null,
  };
}; // Produces sidebar snapshot fallback data from session response.

const mapSidebarSnapshot = (payload: ApiSidebarSnapshot | null): SidebarSnapshot | null => {
  if (!payload) {
    return null;
  }
  return {
    overallScore: payload.overall_score ?? null,
    currentCompetency: payload.current_competency ?? 'Competency',
    currentCriterion: payload.current_criterion ?? null,
    interviewStyle: payload.interview_style ?? 'Style',
    criteria: (payload.criteria ?? []).map(mapSidebarCriterion),
    scoreNotes: payload.score_notes ?? 'Awaiting evaluation notes.',
    redFlags: payload.red_flags ?? [],
    directiveObjective: payload.directive_objective ?? null,
    scoringLevels: payload.scoring_levels ?? {},
    evaluationStatus: payload.evaluation_status ?? 'pending',
    proficiencyLevel: payload.proficiency_level ?? null,
    confidence: payload.confidence ?? null,
  };
};

const mapSidebarCriterion = (payload: ApiSidebarCriterion): SidebarSnapshot['criteria'][number] => ({
  name: payload.name,
  level: payload.level ?? null,
  confidence: payload.confidence ?? null,
  status: payload.status,
  maxLevel: payload.max_level,
});
