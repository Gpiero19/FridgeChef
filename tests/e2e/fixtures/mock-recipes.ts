// Shared mocked /api/suggest-recipes response body for E2E specs.
export const MOCK_RECIPES = {
  recipes: [
    {
      name: "Spinach Scramble",
      cuisine: "American",
      usedIngredients: ["eggs", "spinach"],
      missingIngredients: ["feta"],
      cookTimeMinutes: 10,
      difficulty: "easy",
      steps: ["Whisk eggs.", "Add spinach.", "Cook until set."],
    },
    {
      name: "Milk Pancakes",
      cuisine: "American",
      usedIngredients: ["milk", "eggs"],
      missingIngredients: [],
      cookTimeMinutes: 20,
      difficulty: "medium",
      steps: ["Mix batter.", "Cook on griddle."],
    },
    {
      name: "Fridge Stir Fry",
      cuisine: "Asian",
      usedIngredients: ["spinach", "milk"],
      missingIngredients: ["soy sauce", "ginger"],
      cookTimeMinutes: 30,
      difficulty: "hard",
      steps: ["Heat wok.", "Stir fry vegetables.", "Season and serve."],
    },
  ],
};
