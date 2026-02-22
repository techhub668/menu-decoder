import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canCallYelp, canCallGoogle, incrementYelp, incrementGoogle } from "@/lib/api-usage";

interface GeoapifyResult {
  properties: {
    place_id: string;
    name: string;
    formatted: string;
    lat: number;
    lon: number;
  };
}

async function searchGeoapify(query: string, lat?: number, lng?: number) {
  const key = process.env.GEOAPIFY_KEY;
  if (!key) return [];

  let url = `https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=circle:${lng ?? 0},${lat ?? 0},5000&limit=5&apiKey=${key}`;

  if (!lat || !lng) {
    // Use text search instead
    url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&type=amenity&filter=countrycode:auto&limit=5&apiKey=${key}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: GeoapifyResult) => ({
      placeId: f.properties.place_id || `geo_${Date.now()}`,
      name: f.properties.name || query,
      address: f.properties.formatted || "",
      lat: f.properties.lat || 0,
      lng: f.properties.lon || 0,
    }));
  } catch {
    return [];
  }
}

interface YelpBusiness {
  id: string;
  name: string;
  image_url?: string;
  location?: { display_address?: string[] };
  coordinates?: { latitude?: number; longitude?: number };
  rating?: number;
  review_count?: number;
}

async function searchYelp(name: string, location: string) {
  const key = process.env.YELP_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&location=${encodeURIComponent(location)}&limit=1&categories=restaurants`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const biz: YelpBusiness | undefined = data.businesses?.[0];
    if (!biz) return null;

    // Get reviews
    const reviewRes = await fetch(
      `https://api.yelp.com/v3/businesses/${biz.id}/reviews?limit=20&sort_by=relevance`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const reviewData = reviewRes.ok ? await reviewRes.json() : { reviews: [] };

    return {
      placeId: `yelp_${biz.id}`,
      name: biz.name,
      address: biz.location?.display_address?.join(", ") || "",
      lat: biz.coordinates?.latitude || 0,
      lng: biz.coordinates?.longitude || 0,
      imageUrl: biz.image_url || "",
      reviews: (reviewData.reviews || []).map((r: { text: string }) => r.text),
      source: "yelp" as const,
    };
  } catch {
    return null;
  }
}

interface GooglePlaceCandidate {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
  rating?: number;
}

interface GoogleReview {
  text: string;
}

async function searchGoogle(name: string, location: string) {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return null;

  try {
    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name + " " + location)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,photos,rating&key=${key}`
    );
    if (!findRes.ok) return null;
    const findData = await findRes.json();
    const place: GooglePlaceCandidate | undefined = findData.candidates?.[0];
    if (!place) return null;

    // Get reviews
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=reviews&key=${key}`
    );
    const detailData = detailRes.ok ? await detailRes.json() : { result: { reviews: [] } };

    let imageUrl = "";
    if (place.photos?.[0]?.photo_reference) {
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${key}`;
    }

    return {
      placeId: `google_${place.place_id}`,
      name: place.name,
      address: place.formatted_address || "",
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
      imageUrl,
      reviews: (detailData.result?.reviews || []).map((r: GoogleReview) => r.text),
      source: "google" as const,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
  const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;

  if (!query && !lat) {
    return NextResponse.json({ error: "Provide a search query or location" }, { status: 400 });
  }

  // Check cache first (search by name similarity)
  const cached = await prisma.restaurantCache.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    take: 5,
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const freshCached = cached.filter((c) => c.lastUpdated > thirtyDaysAgo);

  if (freshCached.length > 0) {
    return NextResponse.json({
      restaurant: {
        ...freshCached[0],
        topDishes: JSON.parse(freshCached[0].topDishesJson),
        reviews: JSON.parse(freshCached[0].reviewsJson),
      },
      fromCache: true,
    });
  }

  // Extract location from query (e.g., "Tokyo Sushi Dai" -> location="Tokyo", name="Sushi Dai")
  const parts = query.split(" ");
  const location = parts.length > 1 ? parts[0] : query;
  const restaurantName = parts.length > 1 ? parts.slice(1).join(" ") : query;

  // Tier 1: Try Yelp
  if (await canCallYelp()) {
    await incrementYelp();
    const yelpResult = await searchYelp(restaurantName, location);
    if (yelpResult && yelpResult.reviews.length > 0) {
      return NextResponse.json({
        restaurant: yelpResult,
        fromCache: false,
        needsExtraction: true,
      });
    }
  }

  // Tier 2: Fallback to Google
  if (await canCallGoogle()) {
    await incrementGoogle();
    const googleResult = await searchGoogle(restaurantName, location);
    if (googleResult && googleResult.reviews.length > 0) {
      return NextResponse.json({
        restaurant: googleResult,
        fromCache: false,
        needsExtraction: true,
      });
    }
  }

  // Tier 3: Geoapify basic info (no reviews)
  const geoResults = await searchGeoapify(query, lat, lng);
  if (geoResults.length > 0) {
    return NextResponse.json({
      restaurant: { ...geoResults[0], reviews: [], source: "geoapify" },
      fromCache: false,
      needsExtraction: false,
    });
  }

  return NextResponse.json({
    error: "No restaurant found. Try a different search term.",
    restaurant: null,
  });
}
