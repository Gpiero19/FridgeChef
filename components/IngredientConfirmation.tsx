"use client";

import { useState } from "react";
import IngredientChip from "./IngredientChip";
import PantryStaples from "./PantryStaples";
import InlineNotice from "./InlineNotice";

interface IngredientConfirmationProps {
  ingredients: string[];
  pantryStaples: string[];
  error: string | null;
  onIngredientsChange: (ingredients: string[]) => void;
  onPantryStaplesChange: (pantryStaples: string[]) => void;
  onSubmit: () => void;
}

export default function IngredientConfirmation({
  ingredients,
  pantryStaples,
  error,
  onIngredientsChange,
  onPantryStaplesChange,
  onSubmit,
}: IngredientConfirmationProps) {
  const [newIngredient, setNewIngredient] = useState("");

  function removeIngredient(target: string) {
    onIngredientsChange(ingredients.filter((item) => item !== target));
  }

  function addIngredient() {
    const trimmed = newIngredient.trim();
    setNewIngredient("");
    if (trimmed.length === 0 || ingredients.includes(trimmed)) return;
    onIngredientsChange([...ingredients, trimmed]);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addIngredient();
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-fg-muted">Your ingredients</p>
        <div className="flex flex-wrap gap-2">
          {ingredients.length === 0 && (
            <InlineNotice variant="neutral">No ingredients yet — add one below.</InlineNotice>
          )}
          {ingredients.map((ingredient) => (
            <IngredientChip
              key={ingredient}
              label={ingredient}
              onRemove={() => removeIngredient(ingredient)}
            />
          ))}
        </div>
        <input
          type="text"
          value={newIngredient}
          onChange={(event) => setNewIngredient(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addIngredient}
          placeholder="Add an ingredient…"
          aria-label="Add an ingredient"
          className="w-full rounded border border-border p-2 text-sm"
        />
      </div>

      <PantryStaples selected={pantryStaples} onChange={onPantryStaplesChange} />

      {error && <InlineNotice variant="error">{error}</InlineNotice>}

      <button
        type="button"
        disabled={ingredients.length === 0}
        onClick={onSubmit}
        className="w-full rounded bg-forest-600 py-3 font-semibold text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-faint"
      >
        Generate Recipes
      </button>
    </div>
  );
}
