"use client";

import type { Recipe } from "../lib/types";
import RecipeCard from "./RecipeCard";

interface RecipeListProps {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
  onStartOver: () => void;
}

export default function RecipeList({
  recipes,
  loading,
  error,
  onRegenerate,
  onStartOver,
}: RecipeListProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.name} recipe={recipe} />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onRegenerate}
          className="flex-1 rounded-lg bg-blue-600 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {loading ? "Regenerating…" : "Regenerate"}
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-base font-semibold text-gray-700"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
