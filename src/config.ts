const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000'; // Backend API fallback host.
const DEFAULT_CANDIDATE_URL = 'http://127.0.0.1:8100'; // Candidate service fallback host.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BACKEND_URL; // Resolves backend API host.
export const CANDIDATE_API_BASE_URL =
  import.meta.env.VITE_CANDIDATE_API_BASE_URL ?? DEFAULT_CANDIDATE_URL; // Resolves candidate service host.
