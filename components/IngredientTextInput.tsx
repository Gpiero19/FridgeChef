"use client";

import { useState } from "react";

interface IngredientTextInputProps {
  onSubmit: (ingredients: string[]) => void;
}

// ponytail: parses comma- or newline-separated text into a trimmed, non-empty
// string array. Task 5 owns real validation/dedup as part of the confirm step.
function parseIngredients(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function IngredientTextInput({ onSubmit }: IngredientTextInputProps) {
  const [text, setText] = useState("");

  const isEmpty = parseIngredients(text).length === 0;

  return (
    <div className="flex w-full flex-col gap-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="e.g. eggs, milk, spinach&#10;or one ingredient per line"
        rows={5}
        className="w-full rounded-lg border border-gray-300 p-3 text-base"
        aria-label="Ingredients"
      />
      <button
        type="button"
        disabled={isEmpty}
        onClick={() => onSubmit(parseIngredients(text))}
        className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Find Recipes
      </button>
    </div>
  );
}
