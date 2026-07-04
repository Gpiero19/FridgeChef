import { GoogleGenAI } from "@google/genai";

// ponytail: sole access point for GEMINI_API_KEY and GEMINI_MODEL per
// ARCHITECTURE.md §6 "Central config rule" — no other file reads these env vars.
export const AI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: 8000 }, // ADR-003: Vercel Hobby 10s function limit
});

// --- Previous provider: Anthropic Claude (commented out, not deleted) ---
// Uncomment this block and the corresponding provider-specific call logic in
// app/api/suggest-recipes/route.ts and app/api/extract-ingredients/route.ts
// to switch back. Set ANTHROPIC_API_KEY in .env.local.
//
// import Anthropic from "@anthropic-ai/sdk";
// export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";
// export const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
//   timeout: 8000,
// });
