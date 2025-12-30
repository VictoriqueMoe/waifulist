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

| Variable                         | Description                     | Required              |
|----------------------------------|---------------------------------|-----------------------|
| `JWT_SECRET`                     | Secret key for JWT signing      | Yes (has dev default) |
| `REDIS_URL`                      | Redis connection URL            | Yes                   |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key   | No                    |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstile secret key | No                    |

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

### Optional: Cloudflare Turnstile

To enable CAPTCHA protection on login/signup, add both Turnstile keys from your [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile). If not configured, authentication works without CAPTCHA.

## Redis Architecture

Redis is used as the primary cache and data store for anime data, enabling horizontal scaling across multiple instances.

### Data Storage

| Redis Key             | Data                    | TTL                       | Purpose                                |
|-----------------------|-------------------------|---------------------------|----------------------------------------|
| `anime:list`          | Full anime array (JSON) | 7 days                    | Fuse index building, browse operations |
| `anime:id:{id}`       | Individual anime (JSON) | 7 days (list) / 24h (CDN) | Single anime lookups                   |
| `anime:lastFetchTime` | ISO timestamp           | -                         | Track last refresh                     |
| `anime:refresh`       | Pub/sub channel         | -                         | Notify instances to rebuild Fuse       |

### Data Flow

```
STARTUP
────────────────────────────────────────────────────
1. ensureFuseIndex() called
2. Load anime:list from Redis → build Fuse index
3. If not in Redis → fetch CSV → save to Redis
4. Subscribe to anime:refresh channel

getAnimeById(123)
────────────────────────────────────────────────────
Redis anime:id:123 → found → return
       │
       └─ not found → CDN fetch → cache to Redis → return

searchAnime("gosick")
────────────────────────────────────────────────────
In-memory Fuse index (built from Redis data)

browseAnime()
────────────────────────────────────────────────────
Load anime:list from Redis → filter/sort → return

DAILY REFRESH (midnight)
────────────────────────────────────────────────────
1. Fetch fresh CSV from GitHub
2. Save to Redis (anime:list + individual keys)
3. Rebuild local Fuse index
4. PUBLISH to anime:refresh channel
5. Other instances receive → rebuild Fuse from Redis
```

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

## License

MIT
