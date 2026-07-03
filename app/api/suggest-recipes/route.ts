import { NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL } from "../../../lib/claude";
import { recipeArraySchema, suggestRecipesRequestSchema } from "../../../lib/schemas";

// ADR-003: Vercel Hobby plan 10s function limit.
export const maxDuration = 10;

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

function log(status: number, requestId: string, durationMs: number) {
  // ponytail: no ingredient/recipe content in the log line (ARCHITECTURE.md §10 PII rule).
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      event: "suggest_recipes",
      requestId,
      status,
      durationMs,
    }),
  );
}

function buildPrompt(ingredients: string[], pantryStaples: string[]): string {
  return `You are a recipe generator. Given the ingredients a user has on hand and a list of pantry staples they always have available, suggest exactly 3 distinct recipes.

Ingredients on hand: ${JSON.stringify(ingredients)}
Pantry staples (assume always available, do NOT list these in missingIngredients): ${JSON.stringify(pantryStaples)}

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
  const { ingredients, pantryStaples } = parsedBody.data;

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(ingredients, pantryStaples) }],
    });
    const firstBlock = message.content[0];
    rawText = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
  } catch {
    // Never surface raw Claude/SDK errors to the client.
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    // ADR-003: no retry on bad JSON — return the error immediately.
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  const parsedRecipes = recipeArraySchema.safeParse(json);
  if (!parsedRecipes.success) {
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to generate recipes. Please try again.");
  }

  log(200, requestId, Date.now() - startedAt);
  return NextResponse.json(
    { recipes: parsedRecipes.data },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
