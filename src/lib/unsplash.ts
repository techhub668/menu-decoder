export async function searchUnsplash(query: string): Promise<string> {
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
