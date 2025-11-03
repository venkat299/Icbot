import type { InteractiveQuestionData } from './interactiveQuestion'; // Declares frontend-facing interview session payload models.

export type SessionMessageRole = 'system' | 'directive' | 'interviewer' | 'candidate';

export interface SessionMessage {
  messageId: string;
  role: SessionMessageRole;
  text: string;
  expectCandidateReply: boolean;
  objective?: string | null;
  metadata?: Record<string, string>;
  interactiveQuestion?: InteractiveQuestionData | null;
}

export type SessionStage = 'warmup' | 'competency' | 'wrapup' | 'completed';

export interface InterviewSessionResponse {
  sessionId: string;
  stage: SessionStage;
  messages: SessionMessage[];
  done: boolean;
  competencyId?: string | null;
  sidebar?: SidebarSnapshot | null;
}

export type SessionEventType = 'interviewer_message' | 'candidate_reply';

export interface SessionEventRequest {
  event: SessionEventType;
  text: string;
}

export interface SidebarCriteriaItem {
  name: string;
  level?: number | null;
  confidence?: number | null;
  status?: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  maxLevel: number;
}

export interface SidebarSnapshot {
  overallScore: number | null;
  currentCompetency: string;
  currentCriterion?: string | null;
  interviewStyle: string;
  criteria: SidebarCriteriaItem[];
  scoreNotes: string;
  redFlags: string[];
  directiveObjective?: string | null;
  scoringLevels?: Record<string, string>;
  evaluationStatus?: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  proficiencyLevel?: number | null;
  confidence?: number | null;
}
