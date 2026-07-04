import { NextResponse } from "next/server";
import { createPartFromBase64 } from "@google/genai";
import { genAI, AI_MODEL } from "../../../lib/claude";
import { IngredientsArraySchema } from "../../../lib/schemas";

// ADR-003: Vercel Hobby plan 10s function limit.
export const maxDuration = 10;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type AllowedMimeType = "image/jpeg" | "image/png" | "image/webp";

function errorResponse(
  status: number,
  error: "invalid_request" | "file_too_large" | "unsupported_media_type" | "llm_error",
  message: string,
) {
  return NextResponse.json(
    { error, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function log(status: number, requestId: string, durationMs: number) {
  // ponytail: no image/ingredient content in the log line (ARCHITECTURE.md §10 PII rule).
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      event: "extract_ingredients",
      requestId,
      status,
      durationMs,
    }),
  );
}

const PROMPT = `Identify every distinct food ingredient visible in this image.

Respond with ONLY a JSON array of ingredient name strings, no prose, no markdown code fences. Example: ["carrot", "milk", "eggs"]`;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    log(400, requestId, Date.now() - startedAt);
    return errorResponse(400, "invalid_request", "Request must be multipart/form-data.");
  }

  const file = formData.get("image");
  // ponytail: duck-type instead of `instanceof File` — the File/Blob global from
  // request.formData() can be a different realm (undici) than the ambient one,
  // so instanceof checks are unreliable across runtimes.
  const isFileLike =
    typeof file === "object" &&
    file !== null &&
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    typeof (file as { size?: unknown }).size === "number" &&
    typeof (file as { type?: unknown }).type === "string";

  if (!isFileLike) {
    log(400, requestId, Date.now() - startedAt);
    return errorResponse(400, "invalid_request", "Request must include an `image` file field.");
  }
  const image = file as File;

  if (image.size > MAX_FILE_BYTES) {
    log(413, requestId, Date.now() - startedAt);
    return errorResponse(413, "file_too_large", "Image must be 5 MB or smaller.");
  }

  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    log(415, requestId, Date.now() - startedAt);
    return errorResponse(
      415,
      "unsupported_media_type",
      "Image must be JPEG, PNG, or WebP.",
    );
  }
  const mediaType = image.type as AllowedMimeType;

  // ponytail: image kept as an in-memory Buffer only — never written to disk or logged.
  const buffer = Buffer.from(await image.arrayBuffer());
  const base64Data = buffer.toString("base64");

  let rawText: string;
  try {
    const imagePart = createPartFromBase64(base64Data, mediaType);
    const response = await genAI.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: "user", parts: [{ text: PROMPT }, imagePart] }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024,
      },
    });
    rawText = response.text ?? "";
  } catch {
    // Never surface raw Gemini/SDK errors to the client.
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to extract ingredients. Please try again.");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    // ADR-003: no retry on bad JSON — return the error immediately.
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to extract ingredients. Please try again.");
  }

  const parsedIngredients = IngredientsArraySchema.safeParse(json);
  if (!parsedIngredients.success) {
    log(502, requestId, Date.now() - startedAt);
    return errorResponse(502, "llm_error", "Failed to extract ingredients. Please try again.");
  }

  log(200, requestId, Date.now() - startedAt);
  return NextResponse.json(
    { ingredients: parsedIngredients.data },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
