import { NextResponse } from "next/server";
import { ApiError } from "@google/genai";
import { genAI, AI_MODEL } from "../../../lib/claude";
import { recipeArraySchema, suggestRecipesRequestSchema } from "../../../lib/schemas";

// ADR-003: Vercel Hobby supports maxDuration up to 60s. 20s gives 5s of headroom
// beyond the Gemini client's 15s SDK timeout for JSON parsing and validation.
export const maxDuration = 20;

function errorResponse(
  status: number,
  error: "invalid_request" | "llm_error" | "internal_error",
  message: string,
) {
  return NextResponse.json(
    { error, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function log(status: number, requestId: string, durationMs: number, errorDetail?: string) {
  // ponytail: no ingredient/recipe content in the log line (ARCHITECTURE.md §10 PII rule).
  // errorDetail is operational diagnostics only (SDK error message, parse/validation summary).
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      event: "suggest_recipes",
      requestId,
      status,
      durationMs,
      ...(errorDetail ? { errorDetail } : {}),
    }),
  );
}

function buildPrompt(
  ingredients: string[],
  pantryStaples: string[],
  excludeRecipeNames: string[],
): string {
  return `You are a recipe generator. Given the ingredients a user has on hand and a list of pantry staples they always have available, suggest exactly 3 distinct recipes.

Ingredients on hand: ${JSON.stringify(ingredients)}
Pantry staples (assume always available, do NOT list these in missingIngredients): ${JSON.stringify(pantryStaples)}
${excludeRecipeNames.length > 0 ? `\nDo NOT suggest any of these recipes again, they were already shown to the user: ${JSON.stringify(excludeRecipeNames)}\n` : ""}
Respond with ONLY a JSON array of exactly 3 recipe objects, no prose, no markdown code fences. Each object must have exactly these fields:
{
  "name": string,
  "cuisine": string,
  "usedIngredients": string[],
  "missingIngredients": string[],
  "cookTimeMinutes": number,
  "difficulty": "easy" | "medium" | "hard",
  "steps": string[]
}

Rules:
- "missingIngredients" must NEVER include any item from the pantry staples list.
- "usedIngredients" should draw from the ingredients on hand.
- Return raw JSON only.`;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    log(400, requestId, Date.now() - startedAt);
    return errorResponse(400, "invalid_request", "Request body must be valid JSON.");
  }

  const parsedBody = suggestRecipesRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    log(400, requestId, Date.now() - startedAt);
    return errorResponse(
      400,
      "invalid_request",
      "Request body must include a non-empty `ingredients` array and a `pantryStaples` array.",
    );
  }
  const { ingredients, pantryStaples, excludeRecipeNames = [] } = parsedBody.data;

  let rawText: string;
  try {
    const response = await genAI.models.generateContent({
      model: AI_MODEL,
      contents: buildPrompt(ingredients, pantryStaples, excludeRecipeNames),
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        // gemini-2.5-flash spends output-token budget on internal reasoning by default,
        // which can silently truncate structured output; disabled since this task needs
        // plain JSON generation, not reasoning.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    rawText = response.text ?? "";
  } catch (err) {
    // Never surface raw Gemini/SDK errors to the client — but do log the reason server-side.
    const errorDetail =
      err instanceof ApiError
        ? `ApiError(status=${err.status}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "unknown error";
    log(502, requestId, Date.now() - startedAt, errorDetail);
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    // ADR-003: no retry on bad JSON — return the error immediately.
    log(
      502,
      requestId,
      Date.now() - startedAt,
      `JSON.parse failed, rawText length=${rawText.length}`,
    );
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  const parsedRecipes = recipeArraySchema.safeParse(json);
  if (!parsedRecipes.success) {
    // ponytail: path+code only, never issue.message — Zod's enum-mismatch message
    // echoes the received value (recipe content), which ARCHITECTURE.md §10 forbids logging.
    const issuesSummary = parsedRecipes.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
      .join("; ");
    log(502, requestId, Date.now() - startedAt, issuesSummary);
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  log(200, requestId, Date.now() - startedAt);
  return NextResponse.json(
    { recipes: parsedRecipes.data },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
