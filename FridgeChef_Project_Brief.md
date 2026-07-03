# FridgeChef — Project Brief

## Concept
A web application that eliminates the "what do I cook tonight?" problem by turning your fridge leftovers into recipe suggestions — reducing food waste and saving money. The user describes or photographs what's left in their fridge, and the app returns curated recipe ideas that use those specific ingredients, with full cooking steps.

---

## Problem it solves
The average household wastes 30-40% of food purchased. The core reason: people don't know what to cook with random leftover ingredients before they spoil. FridgeChef bridges that gap with a simple, fast, AI-powered interaction.

---

## Core features

### Input — two modes
1. **Text input** — type a list of ingredients ("tomato, heavy cream, spinach, garlic, pasta")
2. **Image input** — take or upload a photo of your fridge/ingredients; vision model extracts what it sees and confirms with the user before proceeding

### Output — recipe suggestions
- 3 recipe suggestions per query
- For each recipe:
  - Name and cuisine type
  - Which of your ingredients it uses (highlighted)
  - Missing ingredients (kept minimal — ideally 0-2 pantry staples)
  - Estimated cook time
  - Step-by-step cooking instructions
  - Difficulty level

### UX flow
1. User opens app → greeted with simple input screen
2. User types ingredients OR uploads fridge photo
3. If photo: vision model extracts ingredients, shows confirmation list for user to edit/confirm
4. App sends ingredients to LLM → returns 3 structured recipes
5. User browses recipes, taps one to see full steps
6. Option to regenerate for different suggestions

---

## Technical stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| LLM API | Anthropic Claude API (claude-sonnet-4-6) |
| Vision | Claude's vision capability (same API, image input) |
| Deployment | Vercel |
| Database | None for v1 (stateless, no auth) |

---

## LLM integration details

### Ingredient extraction from image
```
Input: base64 image
Prompt: "Look at this fridge/ingredient photo. List every food ingredient you can identify. 
Return ONLY a JSON array of ingredient names, nothing else."
Output: ["tomato", "spinach", "heavy cream", "garlic"]
```

### Recipe generation
```
Input: confirmed ingredient list
System prompt: "You are a creative chef assistant specialising in reducing food waste. 
Given a list of available ingredients, suggest recipes that use as many of them as possible 
with minimal additional ingredients. Return ONLY valid JSON."

User prompt: "I have: [tomato, spinach, heavy cream, garlic, pasta]. 
Suggest 3 recipes. For each return: name, cuisine, usedIngredients[], 
missingIngredients[], cookTimeMinutes, difficulty, steps[]"

Output: structured JSON parsed into UI components
```

### Why Claude over OpenAI
- Native vision + text in same model, same API call
- Structured JSON output reliable with proper prompting
- Anthropic API already familiar from Claude Code workflow

---

## Architecture

```
User (browser)
    ↓
Next.js App Router (Vercel)
    ↓
/api/extract-ingredients   ← POST image → returns ingredient list
/api/suggest-recipes       ← POST ingredients → returns 3 recipes
    ↓
Anthropic Claude API
    ↓
Structured JSON response
    ↓
React UI renders recipe cards
```

---

## Scope boundaries (v1 — keep tight)

**In scope:**
- Text + image ingredient input
- 3 recipe suggestions with full steps
- Responsive mobile-first UI (most people use phone in kitchen)
- Deployed and live on Vercel

**Out of scope for v1:**
- User accounts or saved recipes
- Database persistence
- Shopping list generation
- Nutrition information
- Rating or feedback system

All of the above are natural v2 features — keep them in mind but don't let them block shipping.

---

## Portfolio positioning

**Headline:** "AI-powered recipe generator that reduces food waste — built with Next.js 15, TypeScript, and Claude Vision API"

**Key talking points:**
- Demonstrates LLM API integration (text + vision input, structured JSON output)
- Real-world problem with genuine social value (food waste / sustainability)
- Same architectural pattern as production AI products: messy real-world input → structured actionable output
- Full deployment lifecycle: Vercel, environment variables, API key management
- Prompt engineering: system prompts, structured output, JSON parsing, error handling

**Estimated build time:** 3-5 days for a solid v1

---

## Suggested domain
`fridgechef.canevarigian.dev`

---

## Notes for future development
- Add Prisma + PostgreSQL to save favourite recipes (introduces DB layer)
- Add user accounts with NextAuth (introduces auth)
- Add pantry tracking (ingredients persist across sessions)
- Weekly meal planner feature
- Monetisation: freemium with limited API calls per day
