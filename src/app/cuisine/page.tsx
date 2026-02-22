"use client";

import { useState } from "react";
import Link from "next/link";
import { CUISINES, LANGUAGES } from "@/lib/constants";

interface Dish {
  id: number;
  cuisine: string;
  dishName: string;
  origLang: string;
  engLang: string;
  prefLang: string;
  imageUrl: string;
  ingredients: string;
  taste: string;
  eatMethod: string;
  sauces: string;
  avgPrice: string;
}

export default function CuisinePage() {
  const [cuisine, setCuisine] = useState("");
  const [lang, setLang] = useState("en");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedDish, setExpandedDish] = useState<number | null>(null);

  const selectedLang = LANGUAGES.find((l) => l.code === lang);

  async function fetchDishes() {
    if (!cuisine) return;
    setLoading(true);
    setError("");
    setDishes([]);

    try {
      const res = await fetch(
        `/api/cuisine?cuisine=${encodeURIComponent(cuisine)}&lang=${encodeURIComponent(selectedLang?.name || "English")}&langCode=${encodeURIComponent(lang)}`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      }
      if (data.dishes) {
        setDishes(data.dishes);
      }
    } catch {
      setError("Failed to load cuisine data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-2xl font-bold">
            Menu<span className="text-orange-500">Decoder</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/cuisine" className="font-medium text-orange-500">
              Cuisine Explorer
            </Link>
            <Link href="/restaurant" className="text-gray-500 hover:text-gray-800">
              Restaurant Search
            </Link>
          </nav>
        </div>
      </header>

      {/* Controls */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Cuisine Explorer</h1>

        <div className="mb-8 flex flex-wrap gap-4">
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="">Select Cuisine...</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchDishes}
            disabled={!cuisine || loading}
            className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Explore"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <span className="ml-3 text-gray-500">Fetching dishes...</span>
          </div>
        )}

        {/* Dishes Table */}
        {dishes.length > 0 && !loading && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <div>Original</div>
              <div>English</div>
              <div>{selectedLang?.name || "Preferred Language"}</div>
            </div>

            {/* Table Rows */}
            {dishes.map((dish, i) => (
              <div key={dish.id || i} className="border-b border-gray-100 last:border-0">
                <div
                  className="grid cursor-pointer grid-cols-3 gap-4 px-6 py-4 transition hover:bg-orange-50"
                  onClick={() => setExpandedDish(expandedDish === i ? null : i)}
                >
                  <div className="font-medium">{dish.origLang}</div>
                  <div className="text-gray-700">{dish.engLang}</div>
                  <div className="text-gray-700">{dish.prefLang || dish.engLang}</div>
                </div>

                {/* Expanded Details */}
                {expandedDish === i && (
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
                    <div className="flex gap-6">
                      {dish.imageUrl && (
                        <img
                          src={dish.imageUrl}
                          alt={dish.engLang}
                          className="h-36 w-36 rounded-lg object-cover shadow-sm"
                        />
                      )}
                      <ul className="flex-1 space-y-2 text-sm text-gray-700">
                        <li>
                          <span className="font-semibold text-gray-900">Ingredients:</span>{" "}
                          {dish.ingredients}
                        </li>
                        <li>
                          <span className="font-semibold text-gray-900">Taste:</span> {dish.taste}
                        </li>
                        <li>
                          <span className="font-semibold text-gray-900">How to Eat:</span>{" "}
                          {dish.eatMethod}
                        </li>
                        <li>
                          <span className="font-semibold text-gray-900">Sauces/Dips:</span>{" "}
                          {dish.sauces}
                        </li>
                        <li>
                          <span className="font-semibold text-gray-900">Avg. Price:</span>{" "}
                          {dish.avgPrice}
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
