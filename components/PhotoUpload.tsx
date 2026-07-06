"use client";

import { useState } from "react";
import InlineNotice from "./InlineNotice";

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

    setLoading(true);
    try {
      // Dynamically imported only when a photo is actually selected (ARCHITECTURE.md §12).
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1024,
        maxSizeMB: 2,
        useWebWorker: true,
      });

      // Size gate runs post-compression: phone-camera originals routinely exceed
      // 5MB but compress well under it, so checking here (not on `file`) avoids
      // rejecting photos that compression would have handled fine.
      if (compressed.size > MAX_FILE_BYTES) {
        setError("Image must be 5 MB or smaller.");
        return;
      }

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
      <label
        className={`flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border p-8 text-center transition-colors hover:border-forest-300 hover:bg-forest-50 ${
          loading ? "animate-pulse" : ""
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[26px] w-[26px] text-forest-600"
          aria-hidden="true"
        >
          <path
            d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-sm font-medium text-fg">
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
      {error && <InlineNotice variant="error">{error}</InlineNotice>}
    </div>
  );
}
