import { z } from "zod";

// Pure schemas — no React/Next imports. Mirrors lib/types.ts exactly and is
// the single source of truth for validating LLM output (ARCHITECTURE.md §3).

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const recipeSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().min(1),
  usedIngredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  cookTimeMinutes: z.number().positive(),
  difficulty: difficultySchema,
  steps: z.array(z.string().min(1)).min(1),
});

export const recipeArraySchema = z.array(recipeSchema).length(3);

// Request body for POST /api/suggest-recipes
export const suggestRecipesRequestSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1),
  pantryStaples: z.array(z.string()),
});

export type SuggestRecipesRequest = z.infer<typeof suggestRecipesRequestSchema>;
