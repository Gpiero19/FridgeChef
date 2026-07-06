"use client";

import { useEffect, useReducer, useState } from "react";
import ModeToggle from "../components/ModeToggle";
import IngredientTextInput from "../components/IngredientTextInput";
import PhotoUpload from "../components/PhotoUpload";
import IngredientConfirmation from "../components/IngredientConfirmation";
import RecipeList from "../components/RecipeList";
import RecipeCard from "../components/RecipeCard";
import RecipeLoadingSkeleton from "../components/RecipeLoadingSkeleton";
import { DEFAULT_SELECTED_STAPLES } from "../components/PantryStaples";
import type { Recipe } from "../lib/types";

type Step = "input" | "confirm" | "recipes";

const ALL_RECIPES_STORAGE_KEY = "fridgechef.allRecipes";

function dedupeByName(recipes: Recipe[]): Recipe[] {
  const seen = new Map<string, Recipe>();
  for (const recipe of recipes) seen.set(recipe.name, recipe);
  return [...seen.values()];
}

interface State {
  step: Step;
  ingredients: string[];
  pantryStaples: string[];
  recipes: Recipe[];
  allRecipes: Recipe[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "INGREDIENTS_CONFIRMED"; ingredients: string[] }
  | { type: "SET_INGREDIENTS"; ingredients: string[] }
  | { type: "SET_PANTRY_STAPLES"; pantryStaples: string[] }
  | { type: "GENERATE_START" }
  | { type: "GENERATE_SUCCESS"; recipes: Recipe[] }
  | { type: "GENERATE_ERROR"; error: string }
  | { type: "START_OVER" };

const initialState: State = {
  step: "input",
  ingredients: [],
  pantryStaples: DEFAULT_SELECTED_STAPLES,
  recipes: [],
  allRecipes: [],
  loading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INGREDIENTS_CONFIRMED":
      return { ...state, step: "confirm", ingredients: action.ingredients, error: null };
    case "SET_INGREDIENTS":
      return { ...state, ingredients: action.ingredients };
    case "SET_PANTRY_STAPLES":
      return { ...state, pantryStaples: action.pantryStaples };
    case "GENERATE_START":
      return { ...state, loading: true, error: null };
    case "GENERATE_SUCCESS":
      return {
        ...state,
        step: "recipes",
        loading: false,
        recipes: action.recipes,
        allRecipes: dedupeByName([...state.allRecipes, ...action.recipes]),
      };
    case "GENERATE_ERROR":
      // Stay on the current step — ingredients/staples are untouched so the
      // user can retry (from confirm) or regenerate (from recipes) without
      // losing anything.
      return { ...state, loading: false, error: action.error };
    case "START_OVER":
      return { ...initialState, allRecipes: state.allRecipes };
    default:
      return state;
  }
}

interface ErrorResponseBody {
  error: string;
  message?: string;
}

function isErrorResponseBody(value: unknown): value is ErrorResponseBody {
  return typeof value === "object" && value !== null && "error" in value;
}

export default function Home() {
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [showHistory, setShowHistory] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    if (typeof window === "undefined") return init;
    const stored = window.localStorage.getItem(ALL_RECIPES_STORAGE_KEY);
    if (!stored) return init;
    try {
      const allRecipes = JSON.parse(stored);
      if (Array.isArray(allRecipes)) return { ...init, allRecipes };
    } catch {
      // ignore malformed storage
    }
    return init;
  });

  useEffect(() => {
    window.localStorage.setItem(ALL_RECIPES_STORAGE_KEY, JSON.stringify(state.allRecipes));
  }, [state.allRecipes]);

  async function handleGenerate() {
    dispatch({ type: "GENERATE_START" });
    try {
      const response = await fetch("/api/suggest-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: state.ingredients,
          pantryStaples: state.pantryStaples,
          excludeRecipeNames: state.allRecipes.map((r) => r.name),
        }),
      });

      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          isErrorResponseBody(body) && body.message
            ? body.message
            : "Failed to generate recipes. Please try again.";
        dispatch({ type: "GENERATE_ERROR", error: message });
        return;
      }

      const recipes =
        typeof body === "object" && body !== null && Array.isArray((body as { recipes?: unknown }).recipes)
          ? (body as { recipes: Recipe[] }).recipes
          : [];
      dispatch({ type: "GENERATE_SUCCESS", recipes });
    } catch {
      dispatch({ type: "GENERATE_ERROR", error: "Something went wrong. Please try again." });
    }
  }

  const containerWidth =
    state.step === "recipes" || state.loading || showHistory ? "max-w-5xl" : "max-w-md";

  return (
    <main className={`mx-auto flex min-h-screen ${containerWidth} flex-col gap-6 p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-600" />
            FridgeChef
          </h2>
          <h1 className="mt-2 text-2xl font-bold">What&apos;s in your fridge?</h1>
          <p className="mt-1 text-fg-muted">
            Tell us what&apos;s in your fridge to get recipe ideas.
          </p>
        </div>
        {state.allRecipes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="shrink-0 rounded border border-border-soft px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg"
          >
            {showHistory ? "Back" : `All recipes (${state.allRecipes.length})`}
          </button>
        )}
      </div>

      {showHistory ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {state.allRecipes.map((recipe) => (
            <RecipeCard key={recipe.name} recipe={recipe} />
          ))}
        </div>
      ) : state.loading ? (
        <RecipeLoadingSkeleton />
      ) : (
        <>
          {state.step === "input" && (
            <>
              <ModeToggle mode={mode} onChange={setMode} />
              {mode === "text" ? (
                <IngredientTextInput
                  onSubmit={(ingredients) =>
                    dispatch({ type: "INGREDIENTS_CONFIRMED", ingredients })
                  }
                />
              ) : (
                <PhotoUpload
                  onSuccess={(ingredients) =>
                    dispatch({ type: "INGREDIENTS_CONFIRMED", ingredients })
                  }
                />
              )}
            </>
          )}

          {state.step === "confirm" && (
            <IngredientConfirmation
              ingredients={state.ingredients}
              pantryStaples={state.pantryStaples}
              error={state.error}
              onIngredientsChange={(ingredients) =>
                dispatch({ type: "SET_INGREDIENTS", ingredients })
              }
              onPantryStaplesChange={(pantryStaples) =>
                dispatch({ type: "SET_PANTRY_STAPLES", pantryStaples })
              }
              onSubmit={handleGenerate}
            />
          )}

          {state.step === "recipes" && (
            <RecipeList
              recipes={state.recipes}
              error={state.error}
              onRegenerate={handleGenerate}
              onStartOver={() => dispatch({ type: "START_OVER" })}
            />
          )}
        </>
      )}
    </main>
  );
}
