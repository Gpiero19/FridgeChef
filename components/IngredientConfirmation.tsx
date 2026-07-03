"use client";

import { useState } from "react";
import IngredientChip from "./IngredientChip";
import PantryStaples from "./PantryStaples";

interface IngredientConfirmationProps {
  ingredients: string[];
  pantryStaples: string[];
  loading: boolean;
  error: string | null;
  onIngredientsChange: (ingredients: string[]) => void;
  onPantryStaplesChange: (pantryStaples: string[]) => void;
  onSubmit: () => void;
}

export default function IngredientConfirmation({
  ingredients,
  pantryStaples,
  loading,
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
        <p className="text-sm font-medium text-gray-700">Your ingredients</p>
        <div className="flex flex-wrap gap-2">
          {ingredients.length === 0 && (
            <p className="text-sm text-gray-500">No ingredients yet — add one below.</p>
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
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>

      <PantryStaples selected={pantryStaples} onChange={onPantryStaplesChange} />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading || ingredients.length === 0}
        onClick={onSubmit}
        className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {loading ? "Generating recipes…" : "Generate Recipes"}
      </button>
    </div>
  );
}
