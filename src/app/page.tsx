import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
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
    </main>
  );
}
