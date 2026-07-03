"use client";

type Mode = "text" | "photo";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex w-full rounded-lg border border-gray-300 p-1" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "text"}
        onClick={() => onChange("text")}
        className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
          mode === "text" ? "bg-blue-600 text-white" : "text-gray-600"
        }`}
      >
        Type ingredients
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "photo"}
        onClick={() => onChange("photo")}
        className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
          mode === "photo" ? "bg-blue-600 text-white" : "text-gray-600"
        }`}
      >
        Upload photo
      </button>
    </div>
  );
}
