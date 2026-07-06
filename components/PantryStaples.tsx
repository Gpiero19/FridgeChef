"use client";

import { useState } from "react";
import IngredientChip from "./IngredientChip";

// SPEC decision 2 / ARCHITECTURE.md §5: Salt, Pepper, Olive oil pre-selected;
// Butter, Garlic, Common spices off by default.
export const DEFAULT_STAPLES = ["Salt", "Pepper", "Olive oil", "Butter", "Garlic", "Common spices"];
export const DEFAULT_SELECTED_STAPLES = ["Salt", "Pepper", "Olive oil"];

interface PantryStaplesProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function PantryStaples({ selected, onChange }: PantryStaplesProps) {
  // Custom staples the user typed in, merged into the toggle-chip list.
  const [customStaples, setCustomStaples] = useState<string[]>(
    selected.filter((staple) => !DEFAULT_STAPLES.includes(staple)),
  );
  const [text, setText] = useState("");

  const allStaples = [...DEFAULT_STAPLES, ...customStaples];

  function toggle(staple: string) {
    if (selected.includes(staple)) {
      onChange(selected.filter((item) => item !== staple));
    } else {
      onChange([...selected, staple]);
    }
  }

  function addCustomStaple() {
    const trimmed = text.trim();
    setText("");
    if (trimmed.length === 0 || allStaples.includes(trimmed)) return;
    setCustomStaples((prev) => [...prev, trimmed]);
    onChange([...selected, trimmed]);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCustomStaple();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-fg-muted">Pantry staples (always on hand)</p>
      <div className="flex flex-wrap gap-2">
        {allStaples.map((staple) => (
          <IngredientChip
            key={staple}
            label={staple}
            selected={selected.includes(staple)}
            onToggle={() => toggle(staple)}
          />
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addCustomStaple}
        placeholder="Add another staple…"
        aria-label="Add a pantry staple"
        className="w-full rounded border border-border p-2 text-sm"
      />
    </div>
  );
}
