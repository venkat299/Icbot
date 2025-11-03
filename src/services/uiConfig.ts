// Provides frontend helpers for loading UI config defaults.
import { API_BASE_URL } from '../config'; // Provides API host.

export type ViewMode = 'interviewer' | 'candidate';

export interface CandidateLevelOption { // Defines candidate level options for selection UI.
  id: string;
  label: string;
  index: number;
}

export interface UiCandidateConfig { // Holds candidate level defaults and options.
  default_level: CandidateLevelOption['id'];
  levels: CandidateLevelOption[];
}

export interface UiClientConfig {
  default_view_mode: ViewMode;
  tts_enabled: boolean;
  auto_candidate_reply: boolean;
  candidate_levels: UiCandidateConfig;
}

// Requests UI config defaults from the backend.
export async function fetchUiConfig(): Promise<UiClientConfig> {
  const response = await fetch(`${API_BASE_URL}/api/config/ui`);
  if (!response.ok) {
    throw new Error(`UI config request failed with status ${response.status}`);
  }
  return (await response.json()) as UiClientConfig;
}
