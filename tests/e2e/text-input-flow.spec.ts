import { test, expect } from "@playwright/test";
import { MOCK_RECIPES } from "./fixtures/mock-recipes";

test("text input flow: type -> confirm -> staples -> generate -> 3 recipe cards", async ({
  page,
}) => {
  await page.route("**/api/suggest-recipes", async (route) => {
    await route.fulfill({ status: 200, json: MOCK_RECIPES });
  });

  await page.goto("/");

  await page.getByLabel("Ingredients").fill("eggs, milk, spinach");
  await page.getByRole("button", { name: "Find Recipes" }).click();

  await expect(page.getByText("Your ingredients")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove eggs" })).toBeVisible();

  await page.getByRole("button", { name: "Generate Recipes" }).click();

  await expect(page.getByText(MOCK_RECIPES.recipes[0].name)).toBeVisible();
  await expect(page.getByText(MOCK_RECIPES.recipes[1].name)).toBeVisible();
  await expect(page.getByText(MOCK_RECIPES.recipes[2].name)).toBeVisible();

  const cards = page.locator("h3");
  await expect(cards).toHaveCount(3);

  // Missing ingredients render, empty missing section is simply absent (Pancakes).
  await expect(page.getByText("⚠ feta")).toBeVisible();
  await expect(page.getByText("✓ eggs").first()).toBeVisible();

  // Steps collapsed by default, expand inline.
  await expect(page.getByText("Whisk eggs.")).not.toBeVisible();
  await page.getByRole("button", { name: "Show steps" }).first().click();
  await expect(page.getByText("Whisk eggs.")).toBeVisible();

  // Start over returns to input and clears state.
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByLabel("Ingredients")).toBeVisible();
  await expect(page.getByLabel("Ingredients")).toHaveValue("");
});
