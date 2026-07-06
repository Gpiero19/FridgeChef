"use client";

import type { Recipe } from "../lib/types";
import RecipeCard from "./RecipeCard";
import InlineNotice from "./InlineNotice";

interface RecipeListProps {
  recipes: Recipe[];
  error: string | null;
  onRegenerate: () => void;
  onStartOver: () => void;
}

export default function RecipeList({
  recipes,
  error,
  onRegenerate,
  onStartOver,
}: RecipeListProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      {error && <InlineNotice variant="error">{error}</InlineNotice>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.name} recipe={recipe} />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          className="flex-1 rounded bg-forest-600 py-3 text-base font-semibold text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-faint"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="text-sm font-medium text-fg-muted hover:text-fg"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
