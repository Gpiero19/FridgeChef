"use client";

import { useState } from "react";
import ModeToggle from "../components/ModeToggle";
import IngredientTextInput from "../components/IngredientTextInput";
import PhotoUpload from "../components/PhotoUpload";

type Mode = "text" | "photo";

export default function Home() {
  const [mode, setMode] = useState<Mode>("text");
  // ponytail: local preview state only — Task 5 replaces this with the real
  // confirmation UI and the reducer-based state machine (ARCHITECTURE.md §5).
  const [ingredients, setIngredients] = useState<string[] | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">FridgeChef</h1>
        <p className="mt-1 text-gray-600">
          Tell us what&apos;s in your fridge to get recipe ideas.
        </p>
      </div>

      <ModeToggle mode={mode} onChange={setMode} />

      {mode === "text" ? (
        <IngredientTextInput onSubmit={setIngredients} />
      ) : (
        <PhotoUpload onSuccess={setIngredients} />
      )}

      {ingredients && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Ingredients:</p>
          <p className="mt-1 text-sm text-gray-600">
            {ingredients.length > 0 ? ingredients.join(", ") : "None detected."}
          </p>
        </div>
      )}
    </main>
  );
}
