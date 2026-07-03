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
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          selected
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-300 bg-white text-gray-600"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1.5 pl-3 pr-2 text-sm font-medium text-gray-700">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-800"
        >
          ×
        </button>
      )}
    </span>
  );
}
