"use client";

import { useState } from "react";

interface PhotoUploadProps {
  onSuccess: (ingredients: string[]) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ErrorResponseBody {
  error: string;
  message?: string;
}

// ponytail: narrow, no `any` — this is the only shape we read off the error response.
function isErrorResponseBody(value: unknown): value is ErrorResponseBody {
  return typeof value === "object" && value !== null && "error" in value;
}

export default function PhotoUpload({ onSuccess }: PhotoUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setLoading(true);
    try {
      // Dynamically imported only when a photo is actually selected (ARCHITECTURE.md §12).
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("image", compressed, file.name);

      const response = await fetch("/api/extract-ingredients", {
        method: "POST",
        body: formData,
      });

      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          isErrorResponseBody(body) && body.message
            ? body.message
            : "Failed to extract ingredients. Please try again.";
        setError(message);
        return;
      }

      const ingredients =
        typeof body === "object" && body !== null && Array.isArray((body as { ingredients?: unknown }).ingredients)
          ? ((body as { ingredients: string[] }).ingredients)
          : [];
      onSuccess(ingredients);
    } catch {
      setError("Something went wrong processing that photo. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
        <span className="text-base font-medium text-gray-700">
          {loading ? "Analyzing photo…" : "Tap to take or choose a photo"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
          aria-label="Upload a photo of your fridge"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
