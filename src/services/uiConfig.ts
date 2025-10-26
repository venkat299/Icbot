// Provides frontend helpers for loading UI config defaults.
import { API_BASE_URL } from '../config'; // Provides API host.

export type ViewMode = 'interviewer' | 'candidate';

export interface UiClientConfig {
  default_view_mode: ViewMode;
  tts_enabled: boolean;
  auto_candidate_reply: boolean;
}

// Requests UI config defaults from the backend.
export async function fetchUiConfig(): Promise<UiClientConfig> {
  const response = await fetch(`${API_BASE_URL}/api/config/ui`);
  if (!response.ok) {
    throw new Error(`UI config request failed with status ${response.status}`);
  }
  return (await response.json()) as UiClientConfig;
}
