import path from "node:path";
import { test, expect } from "@playwright/test";
import { MOCK_RECIPES } from "./fixtures/mock-recipes";

test("image upload flow: upload fixture -> confirm -> generate -> 3 recipe cards", async ({
  page,
}) => {
  await page.route("**/api/extract-ingredients", async (route) => {
    await route.fulfill({
      status: 200,
      json: { ingredients: ["eggs", "milk", "spinach"] },
    });
  });
  await page.route("**/api/suggest-recipes", async (route) => {
    await route.fulfill({ status: 200, json: MOCK_RECIPES });
  });

  await page.goto("/");

  await page.getByRole("tab", { name: "Upload photo" }).click();
  await page
    .getByLabel("Upload a photo of your fridge")
    .setInputFiles(path.join(__dirname, "fixtures", "fridge.png"));

  await expect(page.getByText("Your ingredients")).toBeVisible();

  await page.getByRole("button", { name: "Generate Recipes" }).click();

  const cards = page.locator("h3");
  await expect(cards).toHaveCount(3);
  await expect(page.getByText(MOCK_RECIPES.recipes[0].name)).toBeVisible();
});
