# MenuDecoder

A web app that helps tourists translate foreign menus, view dish photos, and discover top dishes at specific restaurants based on public reviews.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TailwindCSS v4
- **Backend:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL with Prisma ORM
- **AI:** OpenRouter API (`qwen/qwen3-235b-a22b-2507`)
- **Hosting:** Vercel (frontend) + Railway (database)

## Features

### Cuisine Explorer
- Select from 20 world cuisines and a preferred output language
- View a 3-column table: Original Language, English, Your Language
- Click any dish to see photo, ingredients, taste profile, how to eat, sauces, and price

### Restaurant Search
- Search by "City + Restaurant Name" or use GPS ("Locate Me")
- Fetches reviews via Yelp (Tier 1) or Google Places (Tier 2)
- AI extracts the top 5-10 recommended dishes from real reviews
- Results are cached for 30 days to save API costs

## Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Railway dashboard |
| `OPENROUTER_API_KEY` | OpenRouter API key | https://openrouter.ai/keys |
| `GEOAPIFY_KEY` | Geoapify API key | https://www.geoapify.com/ |
| `YELP_API_KEY` | Yelp Fusion API key | https://www.yelp.com/developers |
| `GOOGLE_PLACES_KEY` | Google Places API key | https://console.cloud.google.com/ |
| `UNSPLASH_KEY` | Unsplash Access Key | https://unsplash.com/developers |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your keys
cp .env.example .env

# 3. Push database schema to Railway Postgres
npx prisma db push

# 4. Generate Prisma client
npx prisma generate

# 5. (Optional) Pre-generate cuisine data for 20 cuisines
npm run db:seed

# 6. Run development server
npm run dev
```

## Deployment

### Vercel (Frontend + API Routes)

1. Push code to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env` in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

### Railway (Database)

1. Create a new PostgreSQL database on [Railway](https://railway.app)
2. Copy the connection string to `DATABASE_URL` in both `.env` and Vercel env vars
3. Run `npx prisma db push` to create tables

## API Rate Limits (Global Daily)

| API | Daily Limit |
|---|---|
| Google Places | 50 calls |
| Yelp Fusion | 450 calls |
| OpenRouter LLM | 200 calls |

When limits are reached, users see: *"Daily exploration limit reached. Showing cached popular restaurants."*

## Legal

Recommendations and prices are AI-generated from public reviews and are not official. No affiliate claims.
