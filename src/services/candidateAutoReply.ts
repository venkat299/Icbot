import { API_BASE_URL, CANDIDATE_API_BASE_URL } from '../config'; // Imports API hosts.

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
}

export interface CandidateReplyResponse {
  reply: string;
  tone: string;
  confidence: number;
}

export interface FeatureFlagsResponse {
  auto_candidate_reply: boolean;
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

export async function fetchFeatureFlags(): Promise<FeatureFlagsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/config/features`);

  if (!response.ok) {
    throw new Error(`Feature flag request failed with status ${response.status}`);
  }

  return (await response.json()) as FeatureFlagsResponse;
}
