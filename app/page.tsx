"use client";

import { useReducer, useState } from "react";
import ModeToggle from "../components/ModeToggle";
import IngredientTextInput from "../components/IngredientTextInput";
import PhotoUpload from "../components/PhotoUpload";
import IngredientConfirmation from "../components/IngredientConfirmation";
import { DEFAULT_SELECTED_STAPLES } from "../components/PantryStaples";
import type { Recipe } from "../lib/types";

type Step = "input" | "confirm" | "recipes";

interface State {
  step: Step;
  ingredients: string[];
  pantryStaples: string[];
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "INGREDIENTS_CONFIRMED"; ingredients: string[] }
  | { type: "SET_INGREDIENTS"; ingredients: string[] }
  | { type: "SET_PANTRY_STAPLES"; pantryStaples: string[] }
  | { type: "GENERATE_START" }
  | { type: "GENERATE_SUCCESS"; recipes: Recipe[] }
  | { type: "GENERATE_ERROR"; error: string };

const initialState: State = {
  step: "input",
  ingredients: [],
  pantryStaples: DEFAULT_SELECTED_STAPLES,
  recipes: [],
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
      return { ...state, step: "recipes", loading: false, recipes: action.recipes };
    case "GENERATE_ERROR":
      // Stay on the confirm step — ingredients/staples are untouched so the
      // user can retry without re-uploading anything.
      return { ...state, loading: false, error: action.error };
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
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleGenerate() {
    dispatch({ type: "GENERATE_START" });
    try {
      const response = await fetch("/api/suggest-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: state.ingredients,
          pantryStaples: state.pantryStaples,
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">FridgeChef</h1>
        <p className="mt-1 text-gray-600">
          Tell us what&apos;s in your fridge to get recipe ideas.
        </p>
      </div>

      {state.step === "input" && (
        <>
          <ModeToggle mode={mode} onChange={setMode} />
          {mode === "text" ? (
            <IngredientTextInput
              onSubmit={(ingredients) => dispatch({ type: "INGREDIENTS_CONFIRMED", ingredients })}
            />
          ) : (
            <PhotoUpload
              onSuccess={(ingredients) => dispatch({ type: "INGREDIENTS_CONFIRMED", ingredients })}
            />
          )}
        </>
      )}

      {state.step === "confirm" && (
        <IngredientConfirmation
          ingredients={state.ingredients}
          pantryStaples={state.pantryStaples}
          loading={state.loading}
          error={state.error}
          onIngredientsChange={(ingredients) => dispatch({ type: "SET_INGREDIENTS", ingredients })}
          onPantryStaplesChange={(pantryStaples) =>
            dispatch({ type: "SET_PANTRY_STAPLES", pantryStaples })
          }
          onSubmit={handleGenerate}
        />
      )}

      {state.step === "recipes" && (
        // ponytail: Task 6 owns the real recipe-cards UI; this just proves the
        // state machine's terminal transition is wired end to end.
        <p className="text-gray-700">
          Got {state.recipes.length} recipes — UI coming in Task 6.
        </p>
      )}
    </main>
  );
}
