"use client";

import { useState } from "react";
import type { Recipe } from "../lib/types";
import DifficultyBadge from "./DifficultyBadge";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{recipe.name}</h3>
          <p className="text-sm text-gray-600">{recipe.cuisine}</p>
        </div>
        <DifficultyBadge difficulty={recipe.difficulty} />
      </div>

      <p className="text-sm text-gray-600">{recipe.cookTimeMinutes} min</p>

      {recipe.usedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.usedIngredients.map((ingredient) => (
            <span
              key={ingredient}
              className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800"
            >
              ✓ {ingredient}
            </span>
          ))}
        </div>
      )}

      {recipe.missingIngredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.missingIngredients.map((ingredient) => (
            <span
              key={ingredient}
              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
            >
              ⚠ {ingredient}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowSteps((prev) => !prev)}
        className="self-start text-sm font-medium text-blue-600"
      >
        {showSteps ? "Hide steps" : "Show steps"}
      </button>

      {showSteps && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
          {recipe.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
