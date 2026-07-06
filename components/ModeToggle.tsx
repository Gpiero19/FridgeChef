"use client";

type Mode = "text" | "photo";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      className="flex w-full gap-[3px] rounded border border-border-soft bg-surface-sunken p-[3px]"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "text"}
        onClick={() => onChange("text")}
        className={`flex-1 rounded-[6px] py-2 text-[13.5px] font-medium transition-colors ${
          mode === "text" ? "bg-surface text-forest-700 shadow-sm" : "text-fg-muted"
        }`}
      >
        Type ingredients
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "photo"}
        onClick={() => onChange("photo")}
        className={`flex-1 rounded-[6px] py-2 text-[13.5px] font-medium transition-colors ${
          mode === "photo" ? "bg-surface text-forest-700 shadow-sm" : "text-fg-muted"
        }`}
      >
        Upload photo
      </button>
    </div>
  );
}
