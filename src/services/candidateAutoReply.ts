import { CANDIDATE_API_BASE_URL } from '../config'; // Imports candidate service host.

export type CandidateLevelId = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'; // Enumerates candidate proficiency levels.

export interface CandidateConversationEntry {
  role: 'interviewer' | 'candidate';
  text: string;
}

export interface CandidatePersonaPayload {
  name?: string | null;
  title?: string | null;
  specialties?: string[];
  tone?: string | null;
}

export interface CandidateReplyPayload {
  question: string;
  conversation: CandidateConversationEntry[];
  persona?: CandidatePersonaPayload;
  level: CandidateLevelId;
}

export interface CandidateReplyResponse {
  reply: string;
  tone: string;
  confidence: number;
}

export async function fetchCandidateReply(payload: CandidateReplyPayload): Promise<CandidateReplyResponse> {
  const response = await fetch(`${CANDIDATE_API_BASE_URL}/api/candidate/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Candidate reply request failed with status ${response.status}`);
  }

  return (await response.json()) as CandidateReplyResponse;
}
