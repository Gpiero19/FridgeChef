import { describe, expect, it, vi } from "vitest";

const validRecipe = {
  name: "Garlic Butter Pasta",
  cuisine: "Italian",
  usedIngredients: ["pasta", "garlic"],
  missingIngredients: ["parmesan"],
  cookTimeMinutes: 20,
  difficulty: "easy",
  steps: ["Boil pasta.", "Saute garlic in butter.", "Combine and serve."],
};

function mockCreate(text: string) {
  return vi.fn().mockResolvedValue({ text });
}

vi.mock("../../lib/claude", () => ({
  genAI: { models: { generateContent: vi.fn() } },
  AI_MODEL: "gemini-2.5-flash",
}));

import { genAI } from "../../lib/claude";
import { POST } from "../../app/api/suggest-recipes/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/suggest-recipes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/suggest-recipes", () => {
  it("returns 200 with 3 validated recipes for a valid body", async () => {
    (genAI.models.generateContent as ReturnType<typeof vi.fn>).mockImplementation(
      mockCreate(JSON.stringify([validRecipe, validRecipe, validRecipe])),
    );

    const res = await POST(
      makeRequest({ ingredients: ["pasta", "garlic"], pantryStaples: ["salt", "pepper"] }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.recipes).toHaveLength(3);
    expect(json.recipes[0].name).toBe("Garlic Butter Pasta");
  });

  it("returns 502 llm_error when Claude returns malformed JSON", async () => {
    (genAI.models.generateContent as ReturnType<typeof vi.fn>).mockImplementation(
      mockCreate("not valid json{{{"),
    );

    const res = await POST(
      makeRequest({ ingredients: ["pasta"], pantryStaples: [] }),
    );

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({
      error: "llm_error",
      message: expect.any(String),
    });
  });

  it("returns 400 invalid_request when body is missing", async () => {
    const req = new Request("http://localhost/api/suggest-recipes", {
      method: "POST",
      body: "",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 400 invalid_request for an empty ingredients array", async () => {
    const res = await POST(makeRequest({ ingredients: [], pantryStaples: [] }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });
});
