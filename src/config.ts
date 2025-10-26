export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'; // Resolves backend API host.
export const CANDIDATE_API_BASE_URL =
  import.meta.env.VITE_CANDIDATE_API_BASE_URL ?? API_BASE_URL; // Resolves candidate service host.
