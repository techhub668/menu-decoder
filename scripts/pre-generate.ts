import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CUISINES = [
  "Japanese",
  "Chinese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indian",
  "Mexican",
  "Italian",
  "French",
  "Spanish / Tapas",
  "Greek",
  "Turkish",
  "Lebanese / Middle Eastern",
  "Moroccan",
  "Ethiopian",
  "Peruvian",
  "Brazilian",
  "American BBQ",
  "German",
  "Malaysian",
];

const SYSTEM_PROMPT = `You are a world-class food expert. When given a cuisine type, return a JSON array of 12 signature dishes for that cuisine. Each dish object MUST have these exact fields:
{
  "dishName": "name in the original language of the cuisine",
  "origLang": "name in the cuisine's original language",
  "engLang": "English name/translation",
  "ingredients": "main ingredients, comma-separated",
  "taste": "taste profile description (1 sentence)",
  "eatMethod": "how to eat it (1 sentence)",
  "sauces": "typical sauces/dips/condiments",
  "avgPrice": "estimated typical price range in USD"
}
Return ONLY a valid JSON array, no extra text.`;

async function callOpenRouter(userPrompt: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "X-Title": "MenuDecoder-PreGen",
    },
    body: JSON.stringify({
      model: "qwen/qwen3-235b-a22b-2507",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON(raw: string): string {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

async function searchUnsplash(query: string): Promise<string> {
  const key = process.env.UNSPLASH_KEY;
  if (!key) return "";

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + " food dish")}&per_page=1&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("Starting pre-generation of cuisine data...\n");

  for (const cuisine of CUISINES) {
    // Check if already populated
    const existing = await prisma.genericDish.count({
      where: { cuisine, prefLangCode: "en" },
    });

    if (existing >= 5) {
      console.log(`[SKIP] ${cuisine} — already has ${existing} dishes cached.`);
      continue;
    }

    console.log(`[GENERATING] ${cuisine}...`);

    try {
      const userPrompt = `Cuisine: ${cuisine}. Return the JSON array of signature dishes.`;
      const raw = await callOpenRouter(userPrompt);
      const jsonStr = extractJSON(raw);
      const dishes = JSON.parse(jsonStr);

      let savedCount = 0;
      for (const dish of dishes) {
        const imageUrl = await searchUnsplash(`${cuisine} ${dish.engLang}`);

        await prisma.genericDish.upsert({
          where: {
            cuisine_dishName_prefLangCode: {
              cuisine,
              dishName: dish.dishName || dish.engLang,
              prefLangCode: "en",
            },
          },
          update: {
            origLang: dish.origLang || "",
            engLang: dish.engLang || "",
            prefLang: dish.engLang || "",
            ingredients: dish.ingredients || "",
            taste: dish.taste || "",
            eatMethod: dish.eatMethod || "",
            sauces: dish.sauces || "",
            avgPrice: dish.avgPrice || "",
            imageUrl,
          },
          create: {
            cuisine,
            dishName: dish.dishName || dish.engLang,
            origLang: dish.origLang || "",
            engLang: dish.engLang || "",
            prefLang: dish.engLang || "",
            prefLangCode: "en",
            ingredients: dish.ingredients || "",
            taste: dish.taste || "",
            eatMethod: dish.eatMethod || "",
            sauces: dish.sauces || "",
            avgPrice: dish.avgPrice || "",
            imageUrl,
          },
        });
        savedCount++;
      }

      console.log(`[DONE] ${cuisine} — saved ${savedCount} dishes.`);

      // Delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`[ERROR] ${cuisine}:`, err);
    }
  }

  console.log("\nPre-generation complete!");
  await prisma.$disconnect();
}

main();
