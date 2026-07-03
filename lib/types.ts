// Pure domain types — no React/Next imports (ARCHITECTURE.md module layout rule,
// so SPEC-02's DB layer can consume these unchanged).

export type Difficulty = "easy" | "medium" | "hard";

// ADR-010: named alias, not an object wrapper. SPEC-02 may widen this later.
export type Ingredient = string;

export interface Recipe {
  name: string;
  cuisine: string;
  usedIngredients: string[];
  missingIngredients: string[]; // never contains a pantryStaples entry
  cookTimeMinutes: number;
  difficulty: Difficulty;
  steps: string[];
}
