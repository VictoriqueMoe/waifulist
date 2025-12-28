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
- **Authentication**: JWT with bcrypt password hashing
- **Styling**: SCSS Modules
- **Search**: Fuse.js for fuzzy matching

## Getting Started

### Prerequisites

- Node.js 18+
- npm

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

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | Development default (change in production) |

## License

MIT
