// Provider Gemini singleton + routing model (plan 06 P1.1.1 / DEPENDENCIES.md §8).
// SATU-SATUNYA tempat nama model ditulis. Counter call dipakai test persist-once.
import { google } from '@ai-sdk/google';

export const MODEL_EXPLAIN = 'gemini-flash-lite-latest';
export const MODEL_CHAT = 'gemini-flash-latest';
export const MODEL_SEARCH = 'gemini-flash-lite-latest';
export const MODEL_EMBED = 'gemini-embedding-001';

export const aiProvider = google;

let llmCallCount = 0;
/** Panggil tepat sebelum setiap generate/stream — instrumentasi kuota */
export function countLlmCall(model: string) {
  llmCallCount++;
  console.log(`[ai] call #${llmCallCount} → ${model}`);
}
export function getLlmCallCount() {
  return llmCallCount;
}
