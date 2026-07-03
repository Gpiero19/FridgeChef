import { describe, expect, it, vi } from "vitest";

function mockCreate(text: string) {
  return vi.fn().mockResolvedValue({
    content: [{ type: "text", text }],
  });
}

vi.mock("../../lib/claude", () => ({
  anthropic: { messages: { create: vi.fn() } },
  CLAUDE_MODEL: "claude-haiku-4-5-20251001",
}));

import { anthropic } from "../../lib/claude";
import { POST } from "../../app/api/extract-ingredients/route";

function makeImageFile(sizeBytes: number, type: string, name = "fridge.jpg") {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

function makeRequest(file: File | null) {
  const formData = new FormData();
  if (file) formData.set("image", file);
  return new Request("http://localhost/api/extract-ingredients", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/extract-ingredients", () => {
  it("returns 200 with an ingredients array for a valid image", async () => {
    (anthropic.messages.create as ReturnType<typeof vi.fn>).mockImplementation(
      mockCreate(JSON.stringify(["carrot", "milk", "eggs"])),
    );

    const res = await POST(makeRequest(makeImageFile(1024, "image/jpeg")));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.ingredients).toEqual(["carrot", "milk", "eggs"]);
  });

  it("returns 413 file_too_large when image exceeds 5 MB", async () => {
    const res = await POST(makeRequest(makeImageFile(5 * 1024 * 1024 + 1, "image/jpeg")));

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe("file_too_large");
  });

  it("returns 415 unsupported_media_type for a non-image MIME type", async () => {
    const res = await POST(makeRequest(makeImageFile(1024, "application/pdf", "doc.pdf")));

    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json.error).toBe("unsupported_media_type");
  });

  it("returns 400 invalid_request when the file is missing", async () => {
    const res = await POST(makeRequest(null));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 502 llm_error when Claude returns malformed JSON", async () => {
    (anthropic.messages.create as ReturnType<typeof vi.fn>).mockImplementation(
      mockCreate("not valid json{{{"),
    );

    const res = await POST(makeRequest(makeImageFile(1024, "image/jpeg")));

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({
      error: "llm_error",
      message: expect.any(String),
    });
  });
});
