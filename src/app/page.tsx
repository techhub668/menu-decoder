import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav buttons */}
      <div className="flex justify-end gap-3 px-6 py-4">
        <a
          href="https://webapp.cryptopassiveincome.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
        >
          More Apps
        </a>
        <a
          href="https://cryptopassiveincome.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
        >
          Home
        </a>
      </div>

      <div className="flex flex-col items-center justify-center px-8 pb-8 pt-4">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Menu<span className="text-orange-500">Decoder</span>
        </h1>
        <p className="mb-10 max-w-lg text-center text-lg text-gray-600">
          Translate foreign menus, explore world cuisines, and discover the best
          dishes at any restaurant — powered by AI and real reviews.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/cuisine"
            className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-orange-300 hover:shadow-md"
          >
            <h2 className="mb-2 text-2xl font-semibold group-hover:text-orange-500">
              Cuisine Explorer
            </h2>
            <p className="text-gray-500">
              Browse signature dishes from 20+ world cuisines translated into your
              language with photos, ingredients &amp; taste profiles.
            </p>
          </Link>

          <Link
            href="/restaurant"
            className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-orange-300 hover:shadow-md"
          >
            <h2 className="mb-2 text-2xl font-semibold group-hover:text-orange-500">
              Restaurant Search
            </h2>
            <p className="text-gray-500">
              Search any restaurant worldwide and get the top 5-10 dishes
              recommended by real diners, extracted by AI.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
