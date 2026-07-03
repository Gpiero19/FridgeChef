import Anthropic from "@anthropic-ai/sdk";

// ponytail: sole access point for ANTHROPIC_API_KEY and CLAUDE_MODEL per
// ARCHITECTURE.md §6 "Central config rule" — no other file reads these env vars.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 8000, // ADR-003: Vercel Hobby 10s function limit
});
