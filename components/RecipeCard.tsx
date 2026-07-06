"use client";

import { useState } from "react";
import type { Recipe } from "../lib/types";
import DifficultyBadge from "./DifficultyBadge";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-fg">{recipe.name}</h3>
          <p className="text-sm text-fg-muted">{recipe.cuisine}</p>
        </div>
        <DifficultyBadge difficulty={recipe.difficulty} />
      </div>

      <p className="text-sm text-fg-muted">{recipe.cookTimeMinutes} min</p>

      {recipe.usedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.usedIngredients.map((ingredient) => (
            <span
              key={ingredient}
              className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-700"
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
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
            >
              ⚠ {ingredient}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowSteps((prev) => !prev)}
        aria-expanded={showSteps}
        className="flex items-center gap-1.5 self-start text-sm font-semibold text-forest-700"
      >
        {showSteps ? "Hide steps" : "Show steps"}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={`h-3 w-3 transition-transform ${showSteps ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          showSteps ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <ol className="min-h-0 list-decimal space-y-1 overflow-hidden pl-5 text-sm text-fg-muted">
          {recipe.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
