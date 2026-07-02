# Infinite Tile Gallery

A collaborative pixel art gallery where visitors draw 32×32 tiles that are automatically placed in an infinite, zoomable grid.

![Black & White Minimalist UI](https://img.shields.io/badge/UI-Black%20%26%20White-black)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-blue)

## Features

- 🎨 **Touch-friendly pixel editor** (32×32 canvas)
- 🌐 **Infinite zoomable gallery** (pan, pinch-to-zoom)
- 🔄 **Auto spiral placement** (tiles fill outward from center)
- 📱 **Mobile-first design**
- 🛡️ **Rate limiting** (1 submission per device per 24h)
- 👤 **No login required** (name stored in localStorage)
- 🔐 **Admin panel** for moderation

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/infinite-tile-gallery.git
cd infinite-tile-gallery
npm install
```

### 2. Set Up Database

Get a free PostgreSQL database from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app).

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 3. Push Schema

```bash
npx drizzle-kit push
```

### 4. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Initialize Database

Visit http://localhost:3000/api/init to create tables and default admin.

## Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add `DATABASE_URL` environment variable
4. Deploy
5. Visit `https://your-app.vercel.app/api/init` once

## Admin Access

- **URL**: `/admin`
- **Default credentials**:
  - Email: `admin@tiles.app`
  - Password: `admin123`

⚠️ **Change the default password** in production by updating the database directly or modifying `src/lib/adminAuth.ts`.

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing (name gate)
│   ├── draw/page.tsx     # Pixel editor
│   ├── gallery/page.tsx  # Infinite canvas gallery
│   ├── admin/page.tsx    # Admin panel
│   └── api/
│       ├── submit/       # POST - submit tile
│       ├── chunks/       # GET - load tile chunks
│       ├── tiles/[id]/   # DELETE - delete own tile
│       ├── check-limit/  # GET - check daily limit
│       └── admin/        # Admin endpoints
├── db/
│   ├── index.ts          # Database connection
│   └── schema.ts         # Drizzle schema
└── lib/
    ├── spiral.ts         # Spiral coordinate mapping
    ├── renderTile.ts     # PNG generation
    └── adminAuth.ts      # Admin authentication
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `tiles` | Tile data (coords, image, author, status) |
| `device_limits` | Track last submission per device |
| `bans` | Banned device IDs |
| `meta` | Global state (next spiral index) |
| `admins` | Admin accounts |
| `admin_sessions` | Admin login sessions |

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/submit` | POST | Submit new tile |
| `/api/chunks?cx=0&cy=0` | GET | Get tiles in chunk |
| `/api/tiles/:id` | DELETE | Delete own tile |
| `/api/check-limit?deviceId=...` | GET | Check submission eligibility |
| `/api/admin/*` | Various | Admin operations |

## Customization

| Setting | Location |
|---------|----------|
| Color palette | `src/app/draw/page.tsx` → `PALETTE` |
| Daily limit duration | `src/app/api/submit/route.ts` → `hours24` |
| Chunk size | `src/lib/spiral.ts` → `chunkCoord()` |
| Default admin | `src/lib/adminAuth.ts` → `ensureDefaultAdmin()` |

## License

MIT
