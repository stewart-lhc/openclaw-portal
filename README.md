# OpenClaw Portal

A minimal, open-source, self-hosted launcher for multiple OpenClaw dashboards.

## Features

- Add/Edit/Delete OpenClaw nodes
- Search nodes by name, URL, tags, or notes
- Filter nodes by tags
- Mark nodes as favorites
- Track last opened time
- Open dashboards in new tabs
- Local SQLite persistence
- Docker support

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Push database schema:
```bash
npx prisma db push
```

4. Start development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. Open [http://localhost:3000](http://localhost:3000)

### Manual Docker Build

1. Build the image:
```bash
docker build -t openclaw-portal .
```

2. Run the container:
```bash
docker run -p 3000:3000 -v ./prisma:/app/prisma -v ./dev.db:/app/dev.db openclaw-portal
```

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| name | String | Node name (2-50 chars) |
| url | String | Dashboard URL (unique) |
| tags | String | Comma-separated tags |
| notes | String | Optional notes (max 500) |
| favorite | Boolean | Favorite flag |
| lastOpenedAt | DateTime | Last opened timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## API Endpoints

- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create a node
- `GET /api/nodes/[id]` - Get a node
- `PUT /api/nodes/[id]` - Update a node
- `DELETE /api/nodes/[id]` - Delete a node
- `PATCH /api/nodes/[id]` - Toggle favorite or update lastOpenedAt

## License

MIT License - see [LICENSE](LICENSE) for details.
