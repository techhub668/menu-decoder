import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canCallLLM, incrementLLM } from "@/lib/api-usage";
import { callOpenRouter, extractJSON } from "@/lib/openrouter";

const SYSTEM_PROMPT = `You are a restaurant review analyst. Given a set of customer reviews for a restaurant, extract the top 5-10 most recommended dishes. Return a JSON array where each element has:
{
  "name": "dish name",
  "description": "brief description based on reviews",
  "price": "price if mentioned, otherwise 'N/A'",
  "mentions": number of times mentioned or implied,
  "sentiment": "positive/mixed/negative"
}
Sort by number of mentions descending. Return ONLY a valid JSON array, no extra text.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placeId, name, address, lat, lng, imageUrl, reviews, source } = body;

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        error: "No reviews to analyze",
        topDishes: [],
      });
    }

    // Check if we already have extracted dishes cached
    if (placeId) {
      const cached = await prisma.restaurantCache.findUnique({
        where: { placeId },
      });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (cached && cached.lastUpdated > thirtyDaysAgo) {
        const topDishes = JSON.parse(cached.topDishesJson);
        if (topDishes.length > 0) {
          return NextResponse.json({ topDishes, fromCache: true });
        }
      }
    }

    // Check LLM limits
    if (!(await canCallLLM())) {
      return NextResponse.json({
        error: "Daily exploration limit reached. Showing cached popular restaurants.",
        topDishes: [],
        limitReached: true,
      });
    }

    await incrementLLM();

    const reviewsText = reviews
      .slice(0, 20)
      .map((r: string, i: number) => `Review ${i + 1}: ${r}`)
      .join("\n\n");

    const userPrompt = `Restaurant: ${name}${address ? ` (${address})` : ""}\n\nCustomer Reviews:\n${reviewsText}\n\nExtract the top recommended dishes as JSON.`;

    const raw = await callOpenRouter(SYSTEM_PROMPT, userPrompt);
    const jsonStr = extractJSON(raw);
    const topDishes = JSON.parse(jsonStr);

    // Cache the result
    if (placeId) {
      await prisma.restaurantCache.upsert({
        where: { placeId },
        update: {
          topDishesJson: JSON.stringify(topDishes),
          reviewsJson: JSON.stringify(reviews.slice(0, 20)),
          lastUpdated: new Date(),
        },
        create: {
          placeId,
          name: name || "",
          address: address || "",
          geoLat: lat || 0,
          geoLng: lng || 0,
          topDishesJson: JSON.stringify(topDishes),
          reviewsJson: JSON.stringify(reviews.slice(0, 20)),
          imageUrl: imageUrl || "",
        },
      });
    }

    return NextResponse.json({
      topDishes,
      fromCache: false,
      source: source || "unknown",
    });
  } catch (e) {
    console.error("Extract dishes error:", e);
    return NextResponse.json(
      { error: "Failed to extract dishes from reviews", topDishes: [] },
      { status: 500 }
    );
  }
}
