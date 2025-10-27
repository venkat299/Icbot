// Declares frontend-facing interview session payload models.

export type SessionMessageRole = 'system' | 'directive' | 'interviewer' | 'candidate';

export interface SessionMessage {
  messageId: string;
  role: SessionMessageRole;
  text: string;
  expectCandidateReply: boolean;
  objective?: string | null;
  metadata?: Record<string, string>;
}

export type SessionStage = 'warmup' | 'competency' | 'wrapup' | 'completed';

export interface InterviewSessionResponse {
  sessionId: string;
  stage: SessionStage;
  messages: SessionMessage[];
  done: boolean;
  competencyId?: string | null;
}

export type SessionEventType = 'interviewer_message' | 'candidate_reply';

export interface SessionEventRequest {
  event: SessionEventType;
  text: string;
}

export interface SidebarCriteriaItem {
  name: string;
  level: string;
  maxLevel: number;
}

export interface SidebarSnapshot {
  overallScore: number;
  currentCompetency: string;
  interviewStyle: string;
  criteria: SidebarCriteriaItem[];
  scoreNotes: string;
  redFlags: string[];
}
