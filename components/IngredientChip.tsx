"use client";

interface IngredientChipProps {
  label: string;
  // Removable chip (ingredients list): shows an "x" and calls onRemove.
  onRemove?: () => void;
  // Toggle chip (pantry staples): shows selected/unselected styling and calls onToggle.
  onToggle?: () => void;
  selected?: boolean;
}

export default function IngredientChip({ label, onRemove, onToggle, selected }: IngredientChipProps) {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected ?? false}
        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          selected
            ? "border-forest-300 bg-forest-50 text-forest-700"
            : "border-border bg-surface text-fg-muted"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken py-1.5 pl-3 pr-2 text-sm font-medium text-fg">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-4 w-4 items-center justify-center rounded-full text-fg-faint hover:bg-border hover:text-fg"
        >
          ×
        </button>
      )}
    </span>
  );
}
