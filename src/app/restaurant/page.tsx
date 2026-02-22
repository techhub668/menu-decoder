"use client";

import { useState } from "react";
import Link from "next/link";

interface TopDish {
  name: string;
  description: string;
  price: string;
  mentions: number;
  sentiment: string;
}

interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  reviews?: string[];
  source?: string;
}

export default function RestaurantPage() {
  const [query, setQuery] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [topDishes, setTopDishes] = useState<TopDish[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [geoConsent, setGeoConsent] = useState(false);
  const [showGeoBanner, setShowGeoBanner] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setRestaurant(null);
    setTopDishes([]);

    try {
      const res = await fetch(
        `/api/search-restaurant?q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();

      if (data.error && !data.restaurant) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.restaurant) {
        setRestaurant(data.restaurant);

        // If cached with topDishes already
        if (data.restaurant.topDishes && data.restaurant.topDishes.length > 0) {
          setTopDishes(data.restaurant.topDishes);
        }
        // If needs extraction from reviews
        else if (data.needsExtraction && data.restaurant.reviews?.length > 0) {
          await extractDishes(data.restaurant);
        }
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function extractDishes(rest: Restaurant) {
    setExtracting(true);
    try {
      const res = await fetch("/api/extract-dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: rest.placeId,
          name: rest.name,
          address: rest.address,
          lat: rest.lat,
          lng: rest.lng,
          imageUrl: rest.imageUrl || "",
          reviews: rest.reviews || [],
          source: rest.source,
        }),
      });
      const data = await res.json();

      if (data.limitReached) {
        setError(data.error);
      }
      if (data.topDishes) {
        setTopDishes(data.topDishes);
      }
    } catch {
      setError("Could not extract dish recommendations.");
    } finally {
      setExtracting(false);
    }
  }

  function handleLocateMe() {
    if (!geoConsent) {
      setShowGeoBanner(true);
      return;
    }
    doGeolocate();
  }

  function doGeolocate() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/search-restaurant?q=${encodeURIComponent(query || "restaurant")}&lat=${latitude}&lng=${longitude}`
          );
          const data = await res.json();
          if (data.restaurant) {
            setRestaurant(data.restaurant);
            if (data.needsExtraction && data.restaurant.reviews?.length > 0) {
              await extractDishes(data.restaurant);
            }
          } else if (data.error) {
            setError(data.error);
          }
        } catch {
          setError("Location search failed.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access was denied.");
        setLoading(false);
      }
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* GDPR Geolocation Banner */}
      {showGeoBanner && !geoConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Location Access</h3>
            <p className="mb-4 text-sm text-gray-600">
              Your location is <strong>optional</strong> and will only be used to find nearby
              restaurants. It is processed locally in your browser and is{" "}
              <strong>never stored</strong> on our servers. No personal data or location logs are
              kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGeoConsent(true);
                  setShowGeoBanner(false);
                  doGeolocate();
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Allow Location
              </button>
              <button
                onClick={() => setShowGeoBanner(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-2xl font-bold">
            Menu<span className="text-orange-500">Decoder</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/cuisine" className="text-gray-500 hover:text-gray-800">
              Cuisine Explorer
            </Link>
            <Link href="/restaurant" className="font-medium text-orange-500">
              Restaurant Search
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Restaurant Top Dishes</h1>

        {/* Search */}
        <div className="mb-8 flex flex-wrap gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Country/City + Restaurant Name (e.g. Tokyo Sushi Dai)"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            onClick={handleLocateMe}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Locate Me
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {(loading || extracting) && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <span className="ml-3 text-gray-500">
              {extracting ? "AI is analyzing reviews..." : "Searching..."}
            </span>
          </div>
        )}

        {/* Restaurant Info */}
        {restaurant && !loading && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex gap-5">
              {restaurant.imageUrl && (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  className="h-28 w-28 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                {restaurant.address && (
                  <p className="mt-1 text-sm text-gray-500">{restaurant.address}</p>
                )}
                {restaurant.source && (
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                    via {restaurant.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Dishes */}
        {topDishes.length > 0 && !loading && !extracting && (
          <div>
            <h3 className="mb-4 text-xl font-semibold">
              Top Recommended Dishes
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {topDishes.map((dish, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="font-semibold text-gray-900">{dish.name}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        dish.sentiment === "positive"
                          ? "bg-green-100 text-green-700"
                          : dish.sentiment === "mixed"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {dish.sentiment}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-gray-600">{dish.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Price: {dish.price}</span>
                    <span>Mentioned {dish.mentions}x in reviews</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results state */}
        {restaurant && !loading && !extracting && topDishes.length === 0 && restaurant.reviews && restaurant.reviews.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No reviews available for this restaurant. Try a different search.
          </p>
        )}
      </div>

      {/* Legal Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-400">
        Recommendations and prices are AI-generated from public reviews and are not official. No
        affiliate claims.
      </footer>
    </main>
  );
}
