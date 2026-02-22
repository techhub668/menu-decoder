import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canCallLLM, incrementLLM } from "@/lib/api-usage";
import { callOpenRouter, extractJSON } from "@/lib/openrouter";
import { searchUnsplash } from "@/lib/unsplash";

const SYSTEM_PROMPT = `You are a world-class food expert. When given a cuisine type and a target language, return a JSON array of 10-15 signature dishes for that cuisine. Each dish object MUST have these exact fields:
{
  "dishName": "name in the original language of the cuisine",
  "origLang": "name in the cuisine's original language",
  "engLang": "English name/translation",
  "prefLang": "name translated into the requested target language",
  "ingredients": "main ingredients, comma-separated",
  "taste": "taste profile description (1 sentence)",
  "eatMethod": "how to eat it (1 sentence)",
  "sauces": "typical sauces/dips/condiments",
  "avgPrice": "estimated typical price range in USD"
}
Return ONLY a valid JSON array, no extra text.`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get("cuisine");
  const lang = searchParams.get("lang") || "English";
  const langCode = searchParams.get("langCode") || "en";

  if (!cuisine) {
    return NextResponse.json({ error: "cuisine parameter is required" }, { status: 400 });
  }

  // Check cache first
  const cached = await prisma.genericDish.findMany({
    where: { cuisine, prefLangCode: langCode },
  });

  if (cached.length > 0) {
    return NextResponse.json({ dishes: cached, fromCache: true });
  }

  // Check API limits
  if (!(await canCallLLM())) {
    return NextResponse.json({
      error: "Daily exploration limit reached. Showing cached popular restaurants.",
      dishes: [],
      limitReached: true,
    });
  }

  try {
    await incrementLLM();

    const userPrompt = `Cuisine: ${cuisine}. Target language: ${lang}. Return the JSON array of signature dishes.`;
    const raw = await callOpenRouter(SYSTEM_PROMPT, userPrompt);
    const jsonStr = extractJSON(raw);
    const dishes = JSON.parse(jsonStr);

    // Save to DB and fetch images
    const savedDishes = [];
    for (const dish of dishes) {
      const imageUrl = await searchUnsplash(`${cuisine} ${dish.engLang}`);

      const saved = await prisma.genericDish.upsert({
        where: {
          cuisine_dishName_prefLangCode: {
            cuisine,
            dishName: dish.dishName || dish.engLang,
            prefLangCode: langCode,
          },
        },
        update: {
          origLang: dish.origLang || "",
          engLang: dish.engLang || "",
          prefLang: dish.prefLang || "",
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
          prefLang: dish.prefLang || "",
          prefLangCode: langCode,
          ingredients: dish.ingredients || "",
          taste: dish.taste || "",
          eatMethod: dish.eatMethod || "",
          sauces: dish.sauces || "",
          avgPrice: dish.avgPrice || "",
          imageUrl,
        },
      });
      savedDishes.push(saved);
    }

    return NextResponse.json({ dishes: savedDishes, fromCache: false });
  } catch (e) {
    console.error("Cuisine API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch cuisine data", dishes: [] },
      { status: 500 }
    );
  }
}
