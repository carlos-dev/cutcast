# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CutCast is an MVP web application that automatically generates vertical clips (9:16) from long-form videos (podcasts, interviews). The system uses a backend-orchestrated architecture where the backend owns all business logic, state, and jobs, while n8n handles heavy processing tasks (AI, FFmpeg).

## Architecture

### Core Components
- **Backend**: Node.js + TypeScript + Fastify (port 3000)
  - Owns all system state, business rules, and job lifecycle
  - Communicates with n8n via HTTP webhooks
  - Never allows n8n to write directly to the database
  - Handles file uploads and stores them in Supabase Storage
- **Frontend**: Next.js (not yet implemented)
- **Processing**: n8n workflows handle video processing and call back to the backend
- **Database**: PostgreSQL via Prisma ORM
- **Storage**: Supabase Storage for video files

### Key Data Flow
1. User submits video via POST /videos (either URL or file upload)
   - If file upload: Backend uploads to Supabase Storage and gets public URL
   - If URL: Backend uses the provided URL directly
2. Backend creates Job in database with status PENDING
3. Backend triggers n8n webhook with videoUrl and jobId
4. n8n processes video and calls POST /jobs/:job_id/callback
5. Backend updates job status to DONE or FAILED

### Job Status Lifecycle
- `UPLOADED`: Video URL received, awaiting processing
- `PROCESSING`: Being processed by n8n (currently unused)
- `DONE`: Processing completed successfully
- `FAILED`: Processing failed with error

## Development Commands

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Start development server (uses ts-node)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server (requires build first)
npm start

# Expose local server via ngrok (includes header to skip browser warning)
npm run ngrok
```

### Database (Prisma)
```bash
cd backend

# Generate Prisma Client after schema changes
npm run prisma:generate

# Create and apply migrations in development
npm run prisma:migrate

# Push schema changes directly (no migration files)
npm run prisma:push

# Open Prisma Studio to view/edit data
npm run prisma:studio
```

## Code Structure

```
backend/
├── src/
│   ├── index.ts              # Main Fastify server setup, Swagger config
│   ├── types.ts              # TypeScript types (VideoJob, JobStatus, JobCallback)
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client instance and helpers
│   │   └── supabase.ts       # Supabase client instance
│   ├── routes/
│   │   ├── index.ts          # Route registration, root endpoint
│   │   ├── videos.ts         # POST /videos (URL or file upload), GET /videos/:id
│   │   └── callbacks.ts      # POST /jobs/:job_id/callback (n8n webhook receiver)
│   └── storage/
│       ├── jobs.ts           # In-memory Map for VideoJob storage (deprecated)
│       └── callbacks.ts      # In-memory Map for JobCallback storage (deprecated)
├── prisma/
│   └── schema.prisma         # Database schema (User, Job, Callback models)
└── package.json
```

## API Documentation

Swagger UI available at: **http://localhost:3000/docs**

### Key Endpoints
- `POST /videos` - Create video processing job
  - Accepts JSON with `videoUrl` field (application/json)
  - OR file upload via multipart/form-data
  - File uploads are stored in Supabase Storage bucket 'videos'
- `GET /videos/:id` - Query job status by job ID
- `POST /jobs/:job_id/callback` - Webhook receiver for n8n callbacks

## Important Development Constraints

1. **MVP Mindset**: Build simple, explicit, readable code. No over-engineering.
2. **Incremental Development**: Generate only what's requested for the current task
3. **TypeScript Required**: All backend code must be TypeScript
4. **No Unnecessary Dependencies**: Avoid adding libraries unless truly needed
5. **No Auth/Payment**: Skip authentication and payment for this MVP
6. **Backend Owns State**: Never allow external systems (n8n) to write directly to the database
7. **Explain Your Code**: Always provide brief explanations of what the code does

## Environment Variables

Required in `backend/.env`:
- `N8N_WEBHOOK_URL` - Webhook URL for triggering n8n video processing
- `DATABASE_URL` - PostgreSQL connection string for Prisma
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)
- `SUPABASE_URL` - Supabase project URL (e.g., https://your-project.supabase.co)
- `SUPABASE_SERVICE_KEY` - Supabase service role key for admin operations
- `SUPABASE_PASSWORD` - Database password (optional, for direct DB access)

See `backend/.env.example` for reference.

## Database Schema

Using **PostgreSQL via Prisma ORM** for persistent storage. The schema defines:
- `User` model with email and relations to jobs
- `Job` model tracking video processing (input_url, output_url, status, error_message)
- `Callback` model storing n8n webhook responses

## Technical Notes

- Fastify configured with logging, multipart file support, and Swagger
- ngrok header middleware automatically adds `ngrok-skip-browser-warning` header
- File uploads handled via `@fastify/multipart` and stored in Supabase Storage
- Supabase Storage bucket 'videos' must be created and configured as public
- Jobs stored in PostgreSQL via Prisma for persistence
- n8n webhook failures are logged but don't fail the request
- TypeScript compiled to ES2022 targeting Node.js CommonJS
