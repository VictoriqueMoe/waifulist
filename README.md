# WaifuList

A personal anime tracking application built with Next.js. Track your watched anime, manage your watchlist, and import your existing lists.

## Features

- **Browse Anime** - Search and discover anime from a database of 20,000+ titles
- **Track Progress** - Mark anime as watching, completed, plan to watch, on hold, or dropped
- **Episode Tracking** - Keep track of episodes watched for ongoing series
- **Rating System** - Rate anime from 1-5 stars, with a special "masterpiece" rating
- **Import Lists** - Bulk import anime titles from a text file
- **User Accounts** - Secure authentication with JWT sessions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with better-sqlite3
- **Cache**: Redis (ioredis)
- **Anime API**: Self-hosted Jikan (MyAnimeList API)
- **Authentication**: JWT with bcrypt password hashing
- **Styling**: SCSS Modules
- **Search**: Fuse.js for fuzzy matching

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Redis (or Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `data` directory in the project root (the database will be created automatically)
4. Optionally, download the anime dataset CSV to `data/anime.csv` for faster local lookups

### Development

```bash
npm run dev
```

Open [http://localhost:8281](http://localhost:8281) in your browser.

### Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable                         | Description                     | Required                   |
|----------------------------------|---------------------------------|----------------------------|
| `JWT_SECRET`                     | Secret key for JWT signing      | Yes (has dev default)      |
| `REDIS_URL`                      | Redis connection URL            | Yes                        |
| `JIKAN_API_URL`                  | Jikan API base URL              | Yes                        |
| `DB_USERNAME`                    | MongoDB username for Jikan      | No (default: jikan)        |
| `DB_PASSWORD`                    | MongoDB password for Jikan      | No (default: jikan_secret) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key   | No                         |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstile secret key | No                         |

### Redis Configuration

**Local development** (with Docker Redis on port 6339):
```
REDIS_URL=redis://localhost:6339
```

**Docker deployment** (using docker-compose service name):
```
REDIS_URL=redis://redis_waifulist:6379
```

Start Redis locally:
```bash
docker compose up redis -d
```

Clear Redis cache:
```bash
docker exec redis_waifulist redis-cli FLUSHALL
```

### Jikan Configuration

Jikan is a self-hosted unofficial MyAnimeList API used to enrich anime data with synopsis, trailers, pictures, recommendations, and related anime.

**Docker deployment** (using docker-compose service name):
```
JIKAN_API_URL=http://jikan:8080/v4
```

**Local development** (if running Jikan on host):
```
JIKAN_API_URL=http://localhost:8080/v4
```

Start Jikan with MongoDB:
```bash
docker compose up jikan mongodb_jikan -d
```

**Setup:**
1. Copy `jikan.env.example` to `jikan.env`
2. For production, change credentials in `jikan.env` (update all 4 username/password fields to match)
3. If changing credentials, delete the MongoDB volume to reinitialize:
   ```bash
   docker compose down
   docker volume rm waifulist_mongodb_jikan_data
   docker compose up jikan mongodb_jikan -d
   ```

The Jikan service:
- Caches MAL responses in MongoDB to avoid rate limits
- Provides endpoints: `/anime/{id}/full`, `/anime/{id}/pictures`, `/anime/{id}/recommendations`
- Retries automatically on 500 errors (cold start can cause initial failures)

### Optional: Cloudflare Turnstile

To enable CAPTCHA protection on login/signup, add both Turnstile keys from your [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile). If not configured, authentication works without CAPTCHA.

## Redis Architecture

Redis is used as the primary cache and data store for anime data, enabling horizontal scaling across multiple instances.

### Data Storage

| Redis Key                                 | Data                         | TTL     | Purpose                          |
|-------------------------------------------|------------------------------|---------|----------------------------------|
| `anime:list`                              | Full anime array (JSON)      | 7 days  | Fuse index building              |
| `anime:id:{id}`                           | Individual anime (JSON)      | 7d/24h  | Single anime lookups             |
| `anime:titles`                            | Hash (title → id)            | 7 days  | Title-to-ID lookups              |
| `anime:sorted:rating`                     | Redis List (pre-sorted JSON) | 7 days  | Browse by rating (LRANGE)        |
| `anime:sorted:newest`                     | Redis List (pre-sorted JSON) | 7 days  | Browse by newest (LRANGE)        |
| `anime:browse:count`                      | Integer string               | -       | Total count for pagination       |
| `anime:genres`                            | JSON array of genre names    | 7 days  | Genre filter options             |
| `anime:season:{year}:{season}`            | Redis List (pre-sorted JSON) | 7 days  | Seasonal anime listings          |
| `anime:season:{year}:{season}:count`      | Integer string               | 7 days  | Seasonal count for pagination    |
| `anime:sitemap:{id}`                      | Sitemap entry data           | 24h     | Sitemap generation               |
| `anime:peopleIds`                         | JSON array of IDs            | 7 days  | Valid people IDs for sitemap     |
| `anime:characterIds`                      | JSON array of IDs            | 7 days  | Valid character IDs for sitemap  |
| `anime:mangaIds`                          | JSON array of IDs            | 7 days  | Valid manga IDs for sitemap      |
| `anime:lastFetchTime`                     | ISO timestamp                | -       | Track last refresh               |
| `anime:refresh`                           | Pub/sub channel              | -       | Notify instances to rebuild Fuse |
| `og:{uuid}:{hash}`                        | PNG binary                   | 1 hour  | Cached OpenGraph images          |
| `ratelimit:{ip}:{type}`                   | Integer (request count)      | 60s     | Rate limiting per IP (page/api)  |
| `anilist:character:{id}`                  | AniList character (JSON)     | 30 days | Tier list character data         |
| `anilist:search:{query}:{page}`           | Search results (JSON)        | 1 hour  | Character search cache           |
| `anilist:anime:{malId}:characters:{page}` | Characters array (JSON)      | 24h     | Anime characters for tier list   |
| `anilist:manga:{malId}:characters:{page}` | Characters array (JSON)      | 24h     | Manga characters for tier list   |

### Data Flow

```
STARTUP
────────────────────────────────────────────────────
1. ensureFuseIndex() called
2. Load anime:list from Redis → build Fuse index
3. If not in Redis → fetch CSV → save to Redis
4. Ensure sorted lists exist (migration for existing data)
5. Subscribe to anime:refresh channel

getAnimeById(123, includeDetails=true)
────────────────────────────────────────────────────
Redis anime:id:123 → found → return
       │
       └─ not found → Jikan fetch → cache to Redis → return
       │
       └─ if includeDetails && no synopsis → Jikan /anime/{id}/full → enrich → cache

Anime Detail Page
────────────────────────────────────────────────────
Parallel fetch (Promise.all):
  - Related anime lookups (for each relation ID)
  - fetchAnimePictures(id) → Jikan /anime/{id}/pictures
  - fetchAnimeRecommendations(id) → Jikan /anime/{id}/recommendations
  - fetchAnimeEpisodes(id) → Jikan /anime/{id}/episodes
  - fetchAnimeCharacters(id) → Jikan /anime/{id}/characters
  - fetchAnimeStatistics(id) → Jikan /anime/{id}/statistics

searchAnime("gosick")
────────────────────────────────────────────────────
In-memory Fuse index (built from Redis data)

browseAnime(limit=20, offset=0, sort="rating")
────────────────────────────────────────────────────
redis.lrange("anime:sorted:rating", 0, 19) → parse 20 items → return
(Only fetches the page needed, not all 24k entries)

DAILY REFRESH (midnight)
────────────────────────────────────────────────────
1. Fetch fresh CSV from GitHub
2. Save to Redis (anime:list + individual keys)
3. Build and save pre-sorted lists (rating + newest)
4. Rebuild local Fuse index
5. PUBLISH to anime:refresh channel
6. Other instances receive → rebuild Fuse from Redis
```

### Two-Layer Caching (Redis + Jikan)

The app uses a hybrid approach for anime data:

| Layer         | Source | Data                                    | TTL      | Purpose                  |
|---------------|--------|-----------------------------------------|----------|--------------------------|
| Redis         | CSV    | Basic (title, score, genres)            | 7 days   | Browse, search, listings |
| Redis         | Jikan  | Enriched (synopsis, relations, trailer) | 24 hours | Detail pages             |
| Jikan MongoDB | MAL    | Full MAL data                           | 24 hours | Upstream cache           |

**How enrichment works:**

1. User visits anime detail page
2. Redis has basic CSV data (no synopsis)
3. App fetches from Jikan → Jikan scrapes MAL → caches to MongoDB
4. Enriched data returned and cached to Redis (24hr TTL)
5. Subsequent visits serve from Redis until TTL expires

**Daily refresh cycle:**

```
12:00 AM - Scheduler runs refreshAnimeData()
         ↓
CSV downloaded from GitHub
         ↓
All anime:id:* keys overwritten with basic CSV data
         ↓
Enriched Jikan data is replaced (synopsis removed)
         ↓
Next visit to any anime page triggers Jikan fetch
         ↓
Jikan re-scrapes MAL (if its 24hr cache expired) or serves from MongoDB
         ↓
Enriched data cached back to Redis
```

This ensures:
- Browse/search always works (CSV fallback)
- Detail pages get fresh MAL data within 24 hours
- Jikan's MongoDB builds up over time as users visit pages

### In-Memory State

Only the **Fuse.js search index** stays in memory per instance (cannot be serialized to Redis).

### Pub/Sub for Clustering

Two Redis connections are used:
- `getRedis()` - Read/write operations (GET, SET, PUBLISH)
- `getSubscriber()` - Dedicated subscription connection (SUBSCRIBE blocks the connection)

When one instance refreshes data:
1. Saves new data to Redis
2. Publishes "refresh" to `anime:refresh` channel
3. All subscribed instances receive the message
4. Each instance clears and rebuilds its Fuse index from Redis

### Graceful Shutdown

On `SIGTERM`, Redis connections are closed gracefully via `closeRedis()` in `instrumentation.ts`.

## License

MIT
