<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Spring_Boot-4.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot 4" />
  <img src="https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21" />
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TensorFlow-2.20-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL + pgvector" />
  <img src="https://img.shields.io/badge/Supabase-Auth_&_DB-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/AWS_S3-Storage-569A31?style=for-the-badge&logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/AWS_SQS-Queue-FF4F8B?style=for-the-badge&logo=amazonsqs&logoColor=white" alt="AWS SQS" />
  <img src="https://img.shields.io/badge/AWS_ECR-Container-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS ECR" />
  <img src="https://img.shields.io/badge/AWS_App_Runner-Deploy-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS App Runner" />
  <img src="https://img.shields.io/badge/AWS_EC2-Ubuntu-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white" alt="AWS EC2" />
  <img src="https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/DeepFace-GhostFaceNet-purple?style=for-the-badge" alt="DeepFace" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<h1 align="center">GrabPic</h1>

<p align="center">
  <strong>AI-powered event photo sharing with facial recognition.</strong><br/>
  Upload event photos. Share one link. Guests take a selfie and instantly find every photo they appear in.
</p>

<p align="center">
  <a href="https://grab-pic.vercel.app/">Live App</a>
</p>

<br/>

<!-- VIDEO / DEMO -->
<p align="center">
  <em>[ Video demo placeholder ]</em>
</p>

<br/>

<!-- SCREENSHOT -->
<p align="center">
  <em>[ App screenshot placeholder ]</em>
</p>

---

## Table of Contents

1. [What is GrabPic](#what-is-grabpic)
2. [How It Works](#how-it-works)
3. [System Architecture](#system-architecture)
4. [Tech Stack Breakdown](#tech-stack-breakdown)
5. [Microservice Deep Dive](#microservice-deep-dive)
   - [Frontend (Next.js)](#1-frontend--nextjs-16)
   - [Backend API (Spring Boot)](#2-backend-api--spring-boot-40)
   - [AI Face Worker (Python)](#3-ai-face-worker--python)
   - [AI Search API (Python FastAPI)](#4-ai-search-api--python-fastapi)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [Photo Upload Pipeline](#photo-upload-pipeline)
9. [Face Detection Pipeline](#face-detection-pipeline)
10. [Guest Search Flow](#guest-search-flow)
11. [API Reference](#api-reference)
12. [Security Model](#security-model)
13. [Infrastructure and Deployment](#infrastructure-and-deployment)
14. [Project Structure](#project-structure)
15. [Local Development Setup](#local-development-setup)
16. [Environment Variables](#environment-variables)
17. [Use Cases](#use-cases)

---

## What is GrabPic

GrabPic solves a real problem that happens at every event: hundreds of photos get taken, and then everyone spends the next week texting each other asking "can you send me the ones I'm in?"

GrabPic lets an event host upload all their photos into an album, then share a single link with every guest. When a guest opens that link, they take a quick selfie. The system runs that selfie through a facial recognition pipeline, compares it against every face in the album, and returns only the photos that guest appears in. No accounts required for guests. No manual tagging. No scrolling through 400 photos to find yourself.

Every photo defaults to "protected" mode, meaning it is only visible to people whose face matches a face in that photo. The host can also mark specific photos as "public" so anyone with the album link can see them. Guests can download their matched photos as a zip file directly from the browser.

Free for up to 500 photos per album. No watermarks.

---

## How It Works

#### Host uploads photos

```mermaid
flowchart LR
    A["Host selects<br>photos"] --> B["Uploads directly<br>to S3"] --> C["Protected photos<br>queued via SQS"] --> D["AI detects faces<br>per photo"] --> E["Embeddings saved<br>to pgvector"]
```

#### Guest finds their photos

```mermaid
flowchart LR
    A["Guest opens<br>shared link"] --> B["Takes a selfie"] --> C["AI compares face<br>against album"] --> D["Matched photos<br>returned"] --> E["Download as ZIP"]
```

The three-step process from the user's perspective:

**Step 1: Upload.** The host creates an album, selects photos, and marks each one as "public" (anyone with the link sees it) or "protected" (only people whose face is in the photo can see it). Protected is the default. Photos go straight to cloud storage, and the protected ones get queued for AI processing automatically.

**Step 2: AI scans every face.** A background worker picks up each protected photo, detects every face in it, and stores a mathematical fingerprint (a 512-dimensional vector) for each face in the database. No manual tagging needed.

**Step 3: Guests take a selfie.** The host shares one link. A guest opens it, takes a selfie right in the browser, and hits "Find My Photos." The system compares the guest's face against every face in the album and returns only the photos they appear in. They can download their matches as a zip file on the spot.

---

## System Architecture

```mermaid
graph TD
    subgraph "Client"
        Browser["Browser<br>(Next.js 16 + React 19)"]
    end

    subgraph "Frontend Host"
        Vercel["Vercel<br>(Edge Network)"]
    end

    subgraph "Backend Compute"
        AppRunner["AWS App Runner<br>(Spring Boot 4 Container)"]
        EC2["AWS EC2<br>(Python AI Worker + Search API)"]
    end

    subgraph "Data and Auth"
        SupaAuth["Supabase Auth<br>(Identity Provider)"]
        S3["AWS S3<br>(Simple Storage Service)"]
        SQS["AWS SQS<br>(Simple Queue Service)"]
        SupaDB["Supabase PostgreSQL<br>+ pgvector"]
    end

    Browser -->|"Load app"| Vercel
    Browser -->|"Sign in / sign up"| SupaAuth
    Browser -.->|"Upload photos<br>(presigned URL)"| S3

    Vercel -->|"Proxy /api/* calls"| AppRunner
    Vercel -->|"Proxy /api/ai/* calls"| EC2

    AppRunner -->|"Verify JWT"| SupaAuth
    AppRunner -->|"Generate presigned URLs"| S3
    AppRunner -->|"Queue photo for processing"| SQS
    AppRunner -->|"Read/write album data"| SupaDB

    SQS -->|"Deliver queued jobs"| EC2
    EC2 -->|"Download photos"| S3
    EC2 -->|"Store/query embeddings"| SupaDB

    style Vercel fill:#000,color:#fff
    style AppRunner fill:#FF9900,color:#000
    style EC2 fill:#FF9900,color:#000
    style S3 fill:#569A31,color:#fff
    style SQS fill:#FF4F8B,color:#fff
    style SupaDB fill:#3FCF8E,color:#000
    style SupaAuth fill:#3FCF8E,color:#000
```

The system is composed of three independently deployed services that communicate through AWS SQS (async job processing) and shared access to a PostgreSQL database (Supabase) and S3 bucket. The frontend proxies all API calls through Next.js rewrites so the browser never talks directly to backend services, which keeps API URLs hidden and avoids CORS complexity.

---

## Tech Stack Breakdown

### Frontend

| Technology       | Version | Purpose                                                           |
| ---------------- | ------- | ----------------------------------------------------------------- |
| Next.js          | 16.1.6  | React framework with SSR, file-based routing, API route proxying  |
| React            | 19.2.3  | UI rendering                                                      |
| TypeScript       | 5.x     | Type safety                                                       |
| Tailwind CSS     | 4.x     | Utility-first styling with dark mode support                      |
| Supabase JS      | 2.97.0  | Client-side auth (OAuth, email/password), real-time subscriptions |
| JSZip            | 3.10.1  | Client-side zip generation for bulk photo downloads               |
| qrcode.react     | 4.2.0   | QR code generation for album sharing                              |
| Lucide React     | 0.575.0 | Icon library                                                      |
| Radix UI         | 1.4.3   | Accessible UI primitives                                          |
| Vercel Analytics | 1.6.1   | Usage tracking                                                    |

### Backend API

| Technology        | Version    | Purpose                                        |
| ----------------- | ---------- | ---------------------------------------------- |
| Spring Boot       | 4.0.3      | REST API framework                             |
| Java              | 21         | Language runtime (LTS)                         |
| Spring Security   | (via Boot) | OAuth2 Resource Server with JWT validation     |
| Spring Data JPA   | (via Boot) | ORM / repository layer                         |
| Hibernate         | (via JPA)  | Database mapping, DDL validation               |
| PostgreSQL Driver | (runtime)  | JDBC connectivity to Supabase Postgres         |
| AWS SDK S3        | 2.20.0     | Presigned URL generation for uploads and views |
| AWS SDK SQS       | 2.20.0     | Job queue messaging                            |
| Bucket4j          | 8.14.0     | Token-bucket rate limiting                     |
| Lombok            | (compile)  | Boilerplate reduction                          |
| Maven             | 3.9.6      | Build system                                   |

### AI Face Worker

| Technology   | Version        | Purpose                                           |
| ------------ | -------------- | ------------------------------------------------- |
| Python       | 3.x            | Language runtime                                  |
| DeepFace     | 0.0.98         | Face detection and embedding extraction           |
| GhostFaceNet | (via DeepFace) | Face recognition model producing 512-D embeddings |
| RetinaFace   | 0.0.17         | Face detection backend (high accuracy)            |
| TensorFlow   | 2.20.0         | Deep learning runtime for model inference         |
| FastAPI      | 0.132.0        | HTTP API for guest selfie search                  |
| Uvicorn      | 0.41.0         | ASGI server                                       |
| Boto3        | 1.42.55        | AWS S3 + SQS client                               |
| psycopg2     | 2.9.11         | Direct PostgreSQL connectivity                    |
| SlowAPI      | 0.1.9          | Rate limiting on search endpoint                  |
| OpenCV       | 4.13.0         | Image processing                                  |
| NumPy        | 2.2.6          | Numerical computation                             |
| Gunicorn     | 25.1.0         | Production WSGI server                            |

### Infrastructure

| Service               | Provider | Purpose                                             |
| --------------------- | -------- | --------------------------------------------------- |
| Vercel                | Vercel   | Frontend hosting with edge CDN                      |
| App Runner            | AWS      | Containerized Spring Boot deployment (auto-scaling) |
| EC2 (Ubuntu)          | AWS      | Persistent Python AI worker and FastAPI server      |
| ECR                   | AWS      | Docker container registry for Spring Boot image     |
| S3                    | AWS      | Object storage for event photos                     |
| SQS                   | AWS      | Message queue decoupling upload from AI processing  |
| PostgreSQL + pgvector | Supabase | Relational data + vector similarity search          |
| Supabase Auth         | Supabase | Authentication (Google, GitHub, email/password)     |

---

> **Everything below this point is the technical documentation.** It covers the internals of each microservice, database design, authentication, security hardening, and deployment infrastructure in full detail.

---

## Microservice Deep Dive

### 1. Frontend / Next.js 16

The frontend is a single-page application built with Next.js 16 App Router and React 19. It is deployed on Vercel and acts as the gateway for all user interactions. All API calls from the browser are routed through Next.js rewrites defined in `next.config.ts`, which means the browser never sees the raw backend URLs.

```mermaid
flowchart LR
    A["/api/*"] -->|"Next.js rewrite"| B["Spring Boot<br>(App Runner)"]
    C["/api/ai/*"] -->|"Next.js rewrite"| D["FastAPI<br>(EC2)"]
```

**Routing breakdown:**

| Route                         | Auth Required            | Description                                                                   |
| ----------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `/`                           | No                       | Landing page with feature overview, how-it-works, and CTA                     |
| `/login`                      | No (redirects if authed) | Email/password + Google/GitHub OAuth login                                    |
| `/signup`                     | No (redirects if authed) | Account registration with email verification                                  |
| `/dashboard`                  | Yes                      | Album list, create new albums                                                 |
| `/dashboard/albums/[id]`      | Yes                      | Photo upload page with drag-and-drop, privacy toggles                         |
| `/dashboard/albums/[id]/view` | Yes                      | Album viewer with face detection overlay, share modal, QR code, bulk download |
| `/albums/[id]/guest`          | No                       | Public guest page with selfie camera, AI photo finder, zip download           |

**Auth guards.** `useRequireAuth()` checks the Supabase session and redirects unauthenticated users to `/login`. `useRedirectIfAuth()` on login/signup pages sends already-authenticated users to `/dashboard`.

**Download proxy.** `/api/download-proxy` fetches S3 images server-side to avoid CORS issues. It validates the target URL against an S3 domain pattern before proxying to prevent SSRF.

**Real-time updates.** When the AI worker marks a photo as `processed = true`, the album view page picks up the change through a Supabase Realtime subscription and refreshes automatically.

---

### 2. Backend API / Spring Boot 4.0

The Spring Boot service is the core REST API that handles album CRUD, photo metadata persistence, presigned URL generation for S3, and SQS message dispatch. It runs as a Docker container on AWS App Runner, pulled from AWS ECR.

```mermaid
flowchart TB
    subgraph "Spring Boot Application"
        direction TB
        Controller["AlbumController<br>(@RestController)"]
        Security["SecurityConfig<br>(OAuth2 Resource Server)"]
        RateLimit["RateLimitFilter<br>(Bucket4j)"]
        S3Service["S3StorageService"]
        SqsService["SqsService"]
        Repos["PhotoRepository<br>SharedAlbumRepository<br>(Spring Data JPA)"]
    end

    Controller -->|"Generate URLs"| S3Service
    Controller -->|"Queue photo"| SqsService
    Controller -->|"CRUD operations"| Repos
    Security -->|"Validate JWT"| Controller
    RateLimit -->|"Limit by IP"| Controller

    S3Service -->|"Create upload/view URLs"| S3[("AWS S3<br>Simple Storage Service")]
    SqsService -->|"Send processing job"| SQS[("AWS SQS<br>Simple Queue Service")]
    Repos -->|"Read/write data"| DB[(Supabase<br>PostgreSQL)]
```

**Security configuration** validates every incoming request (except guest endpoints) against Supabase's JWKS endpoint using ES256 signed JWTs. The `SecurityFilterChain` permits `/api/albums/*/guest/**` without authentication and requires a valid JWT for everything else. CORS is configured to only allow the frontend origin.

**Rate limiting** uses Bucket4j with three separate token buckets per client IP:

| Endpoint Pattern         | Limit       | Window   |
| ------------------------ | ----------- | -------- |
| `/guest/search-results`  | 5 requests  | 1 minute |
| `/guest/details`         | 20 requests | 1 minute |
| `/api/*` (authenticated) | 60 requests | 1 minute |

The `RateLimitFilter` also injects security headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**S3 lifecycle management:** On startup, the `S3StorageService` applies a lifecycle rule to the S3 bucket that auto-aborts incomplete multipart uploads after 1 day. This prevents attackers from starting uploads and abandoning them to consume storage.

**Album quota enforcement** is applied at two layers (defense in depth): once when generating presigned upload URLs (`GET /{albumId}/upload-urls`) and again when saving photo metadata (`POST /{albumId}/photos`). The hard cap is 500 photos per album, with a maximum batch size of 50 presigned URLs per request.

---

### 3. AI Face Worker / Python

The AI worker is a long-running Python process deployed on an AWS EC2 Ubuntu instance. It runs in an infinite loop, long-polling the SQS queue for new photo processing jobs. This is the background workhorse that powers the face detection pipeline.

```mermaid
sequenceDiagram
    participant SQS as SQS (Simple Queue Service)
    participant Worker as Python Worker (EC2)
    participant DB as PostgreSQL (Supabase)
    participant S3 as S3 (Storage)

    loop Infinite polling loop
        Worker->>SQS: Poll for new messages<br>(20s long poll)
        SQS-->>Worker: Photo job (photoId, storageUrl)

        Worker->>DB: Check if photo still exists
        alt Photo still exists
            Worker->>S3: Download photo file
            S3-->>Worker: Image data

            Worker->>Worker: Extract face embeddings<br>(GhostFaceNet + RetinaFace)

            loop For each detected face
                Worker->>DB: Store embedding +<br>bounding box
            end

            Worker->>DB: Mark photo as processed
            Worker->>SQS: Delete processed message
        else Photo deleted
            Note over Worker: Skip processing,<br>message returns to queue<br>and expires
        end
    end
```

The worker uses SQS long polling with a 20-second wait time, which minimizes empty receives and reduces AWS costs. Messages are only deleted from the queue after successful processing, so if the worker crashes mid-processing, the message becomes visible again and gets retried. This gives the system at-least-once processing guarantees.

Before downloading and processing, the worker checks if the photo still exists in the database. If a host deleted a photo between the time it was queued and the time the worker picks it up, the worker skips it.

DeepFace is configured with:

- **Model:** GhostFaceNet (produces 512-dimensional face embeddings)
- **Detector:** RetinaFace (high accuracy, handles multiple faces per image)
- **enforce_detection:** `False` (so photos with no faces do not throw errors and are simply marked as processed with zero embeddings)

Each detected face produces a 512-float embedding vector and a bounding box (`facial_area`). The embedding is formatted as a pgvector-compatible string `[0.1,0.2,...]` and inserted into `photo_embeddings`. The bounding box is stored as a JSONB column for frontend rendering of face detection overlays.

---

### 4. AI Search API / Python FastAPI

Running on the same EC2 instance as the worker, the FastAPI service exposes a single `POST /search` endpoint that handles the guest selfie matching workflow. The Next.js frontend proxies `/api/ai/*` to this service.

```mermaid
sequenceDiagram
    participant Guest as Guest Browser
    participant Next as Next.js (Vercel)
    participant FastAPI as FastAPI (EC2)
    participant SB as Spring Boot
    participant DB as PostgreSQL + pgvector

    Guest->>Next: Send selfie for matching
    Next->>FastAPI: Forward to AI service

    FastAPI->>FastAPI: Validate selfie + extract face embedding
    FastAPI->>DB: Search for matching faces<br>(cosine distance <= 0.45)
    DB-->>FastAPI: Matched photo IDs
    FastAPI-->>Next: Matched photo IDs
    Next-->>Guest: Matched photo IDs

    Guest->>Next: Request matched photos
    Next->>SB: Forward request
    SB-->>Next: Secure photo view URLs
    Next-->>Guest: Display matched photos
```

**Input validation** runs before any AI processing:

1. Album ID must match a strict UUID regex
2. MIME type must be JPEG, PNG, or WebP
3. File size is capped at 5 MB
4. Magic bytes are checked to catch spoofed Content-Type headers

The selfie is written to a temp file for DeepFace and deleted in a `finally` block regardless of outcome. It is never stored.

**Cosine distance matching** uses pgvector's `<=>` operator with a threshold of 0.45, which balances precision and recall. Lower values miss matches when lighting or angles differ, higher values produce false positives. Results are capped at 50 per search.

**Rate limiting:** 5 requests per minute per IP via SlowAPI with proxy header extraction (`X-Forwarded-For`, `X-Real-IP`).

---

## Database Schema

The application uses Supabase PostgreSQL with the pgvector extension enabled for vector similarity search.

```mermaid
erDiagram
    shared_albums {
        UUID id PK
        VARCHAR title
        VARCHAR host_id
        TIMESTAMP created_at
    }

    photos {
        UUID id PK
        UUID album_id FK
        VARCHAR storage_url
        ENUM access_mode "PUBLIC | PROTECTED"
        BOOLEAN processed "default false"
    }

    photo_embeddings {
        UUID id PK
        UUID photo_id FK
        VECTOR_512 embedding "pgvector column"
        JSONB box_area "face bounding box"
    }

    shared_albums ||--o{ photos : "has many"
    photos ||--o{ photo_embeddings : "has many faces"
```

**`shared_albums`** stores album metadata. The `host_id` is the Supabase Auth user ID (extracted from the JWT `sub` claim). The `created_at` timestamp is set automatically via a `@PrePersist` JPA callback.

**`photos`** stores per-photo metadata. `storage_url` is the S3 object key (`albums/{albumId}/{uuid}.jpg`). `access_mode` controls visibility: `PUBLIC` (anyone sees it) or `PROTECTED` (only face-matched guests). `processed` tracks whether the AI worker has finished extracting embeddings.

**`photo_embeddings`** is the vector table. One row per detected face, so a group photo with three people produces three rows. `embedding` stores a 512-D vector via pgvector for cosine distance searches. `box_area` is JSONB with the bounding box coordinates (`x`, `y`, `w`, `h`) that the frontend uses to draw face detection overlays.

Cascade delete is configured at the JPA level: deleting an album cascades to its photos, and deleting a photo cascades to its embeddings (`CascadeType.ALL` + `orphanRemoval = true`).

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User as Browser
    participant Supa as Supabase Auth
    participant Next as Next.js (Vercel)
    participant SB as Spring Boot (App Runner)

    Note over User,Supa: Login / Signup
    alt Email + Password
        User->>Supa: Sign in with email + password
        Supa-->>User: JWT tokens (access + refresh)
    else OAuth Provider
        User->>Supa: Sign in via OAuth
        Supa-->>User: Redirect to provider
        User->>Supa: Return with auth code
        Supa-->>User: JWT tokens (access + refresh)
    end

    Note over User,SB: Authenticated API Call
    User->>Next: Request albums (with JWT)
    Next->>SB: Forward request with JWT
    Note over SB: Validate JWT signature<br>(cached public keys)
    SB->>SB: Extract user ID from JWT
    SB-->>Next: Album data
    Next-->>User: Album data
```

Supabase Auth handles all authentication. Supported providers are Google, GitHub, and email/password. On the backend, Spring Security is configured as an OAuth2 Resource Server that fetches public keys from Supabase's JWKS endpoint and validates the ES256 signature on every incoming JWT. The user identity is extracted from `jwt.getSubject()` and used to scope all album queries to the authenticated user, preventing cross-user data access.

Guest endpoints (`/api/albums/*/guest/**`) are exempted from authentication via `.requestMatchers("/api/albums/*/guest/**").permitAll()` in the security filter chain.

---

## Photo Upload Pipeline

```mermaid
sequenceDiagram
    participant Host as Host Browser
    participant Next as Next.js
    participant SB as Spring Boot
    participant S3 as S3 (Storage)
    participant SQS as SQS (Queue Service)

    Host->>Next: Select photos + set privacy
    Host->>Next: Click "Upload"

    Next->>SB: Request upload URLs (count=N)
    SB->>SB: Verify album ownership
    SB->>SB: Check photo quota (max 500)
    SB->>SB: Generate presigned upload URLs<br>(15 min expiry)
    SB-->>Next: Presigned upload URLs
    Next-->>Host: Presigned upload URLs

    loop For each photo
        Host->>S3: Upload photo directly
        S3-->>Host: 200 OK
    end

    Host->>Next: Save photo metadata<br>(URLs + privacy settings)
    Next->>SB: Forward save request
    SB->>SB: Re-verify ownership + quota
    SB->>SB: Save photos to database

    loop For each PROTECTED photo
        SB->>SQS: Queue for AI processing
    end

    SB-->>Next: Photos saved successfully
    Next-->>Host: Success
```

The upload flow uses a presigned URL pattern where the browser uploads directly to S3, bypassing the backend entirely for file transfer. Presigned PUT URLs expire after 15 minutes and are scoped to `content-type: image/jpeg`. The S3 key follows `albums/{albumId}/{randomUUID}.jpg`.

Only photos marked as `PROTECTED` are sent to SQS for AI processing. Public photos skip the queue because they are visible to everyone.

---

## Face Detection Pipeline

```mermaid
flowchart TD
    A["SQS Message<br>{photoId, storageUrl}"] --> B["Download from S3<br>to temp file"]
    B --> C["DeepFace.represent()"]

    C --> D{"Faces<br>detected?"}
    D -->|"Yes"| E["Filter valid faces<br>(width > 0)"]
    D -->|"No faces"| I

    E --> F["For each face:<br>1. Format 512-D embedding<br>   as pgvector string<br>2. Extract bounding box<br>   as JSON"]
    F --> H["INSERT INTO<br>photo_embeddings"]
    H --> I["UPDATE photos<br>SET processed = true"]
    I --> J["Delete SQS message"]
    J --> K["Delete temp file"]
```

The DeepFace pipeline uses GhostFaceNet, which is a lightweight model that produces compact 512-dimensional embeddings while maintaining strong accuracy on standard face verification benchmarks. RetinaFace is used as the detection backend because it handles faces at various scales and angles well, including partially occluded faces in group photos.

The embedding vector is stored in PostgreSQL using the pgvector extension. pgvector supports exact nearest-neighbor search and approximate nearest-neighbor search via IVFFlat or HNSW indexes. The cosine distance operator (`<=>`) is used for searches, which measures the angular difference between two vectors regardless of magnitude.

---

## Guest Search Flow

```mermaid
flowchart TD
    A["Guest opens shared link"] --> B["Album loads with<br>public photos"]
    B --> C["Guest takes selfie"]
    C --> D["Selfie sent to FastAPI"]
    D --> E{"Face<br>detected?"}
    E -->|"No"| F["Error: try again"]
    E -->|"Yes"| G["Cosine search against<br>album embeddings"]
    G --> H["Spring Boot generates<br>presigned S3 URLs"]
    H --> I["Guest sees matched +<br>public photos"]
    I --> J["Download as ZIP"]
```

**Selfie capture.** On mobile, the native camera input is triggered with `capture="user"`. On desktop, a `getUserMedia()` video stream lets the guest snap a photo that gets converted to a JPEG blob.

**After matching.** The guest browses public photos and their AI-matched photos. They can select individual photos or "Select All," then download as a ZIP generated client-side with JSZip. Downloads route through the Next.js server-side proxy to avoid CORS with S3. If no face is detected (`enforce_detection=True`), the API returns a clear error instead of zero matches.

---

## API Reference

### Authenticated Endpoints (JWT Required)

| Method   | Endpoint                                                         | Description                                        |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `POST`   | `/api/albums`                                                    | Create a new album                                 |
| `GET`    | `/api/albums`                                                    | List all albums owned by the authenticated user    |
| `DELETE` | `/api/albums/{albumId}`                                          | Delete an album and all its photos/embeddings      |
| `GET`    | `/api/albums/{albumId}/upload-urls?count=N`                      | Generate N presigned S3 PUT URLs (max 50)          |
| `POST`   | `/api/albums/{albumId}/photos`                                   | Save photo metadata after S3 upload + queue for AI |
| `GET`    | `/api/albums/{albumId}/photos`                                   | Get all photos in album with presigned view URLs   |
| `DELETE` | `/api/albums/{albumId}/photos/{photoId}`                         | Delete a single photo                              |
| `PUT`    | `/api/albums/{albumId}/photos/{photoId}/privacy?makePublic=bool` | Toggle photo privacy                               |

### Public Guest Endpoints (No Auth)

| Method | Endpoint                                     | Description                              |
| ------ | -------------------------------------------- | ---------------------------------------- |
| `GET`  | `/api/albums/{albumId}/guest/details`        | Get album title + public photos          |
| `POST` | `/api/albums/{albumId}/guest/search-results` | Get presigned URLs for matched photo IDs |

### AI Search Endpoint (EC2)

| Method | Endpoint  | Description                                       |
| ------ | --------- | ------------------------------------------------- |
| `POST` | `/search` | Send selfie + album_id, receive matched photo IDs |

---

## Security Model

```mermaid
flowchart TD
    L1["Supabase Auth<br>JWT issued per session"] --> L2["Spring Security<br>validates JWT signature"]
    L2 --> L3["Ownership check<br>jwt.sub == album.hostId"]
    L3 --> L4["Rate limiting<br>Bucket4j per IP"]
    L4 --> L5["Input validation<br>UUID format, magic bytes,<br>size + quota limits"]
    L5 --> L6["Transport security<br>HTTPS, HSTS, no server info"]
```

**Authorization model:** Every authenticated endpoint extracts the user ID from the JWT `sub` claim and compares it to `album.hostId`. If they do not match, the request is rejected with HTTP 403. Guest endpoints are scoped to read-only operations on public data and face-matched data, and the search results endpoint validates that requested photo IDs actually belong to the specified album to prevent cross-album data access.

**Presigned URL security:** Upload URLs expire after 15 minutes and are restricted to `content-type: image/jpeg`. View URLs expire after 7 hours. Presigned URLs are generated per-request and are never stored in the database.

**Infrastructure security measures:**

- Stack traces, exception details, and binding errors are suppressed in API responses (`server.error.include-*=never/false`)
- Server header is blanked (`server.server-header=`)
- Connection pool is capped at 10 connections with 10-second timeout to prevent exhaustion
- Tomcat is limited to 100 threads with 10-second connection timeout
- Max request body size is 10 MB
- S3 lifecycle rule auto-aborts abandoned multipart uploads after 1 day
- Download proxy validates URLs against S3 domain pattern to prevent SSRF
- Guest selfies are never persisted to disk (temp file deleted in `finally` block)
- CORS is restricted to the frontend origin only

---

## Infrastructure and Deployment

```mermaid
graph TD
    subgraph "Vercel"
        FE["Next.js 16 Frontend"]
    end

    subgraph "AWS us-east-2"
        BE["Spring Boot 4<br>(App Runner)"]
        WORKER["Python Worker<br>(EC2)"]
        API["FastAPI Search API<br>(EC2)"]
        BUCKET["S3<br>(Simple Storage Service)"]
        QUEUE["SQS<br>(Simple Queue Service)"]
    end

    subgraph "Supabase"
        DB["PostgreSQL + pgvector"]
        AUTH["Auth Service"]
    end

    FE -->|"Proxy API calls"| BE
    FE -->|"Proxy AI calls"| API
    FE -->|"Auth requests"| AUTH
    BE -->|"Generate upload/view URLs"| BUCKET
    BE -->|"Queue photo jobs"| QUEUE
    BE -->|"Read/write album data"| DB
    QUEUE -->|"Deliver jobs"| WORKER
    WORKER -->|"Download photos"| BUCKET
    WORKER -->|"Store embeddings"| DB
    API -->|"Query embeddings"| DB

    style FE fill:#000,color:#fff
    style BE fill:#6DB33F,color:#fff
    style WORKER fill:#3776AB,color:#fff
    style API fill:#3776AB,color:#fff
    style BUCKET fill:#569A31,color:#fff
    style QUEUE fill:#FF4F8B,color:#fff
    style DB fill:#3FCF8E,color:#000
    style AUTH fill:#3FCF8E,color:#000
```

### Frontend Deployment (Vercel)

Deployed on Vercel with automatic Git deploys, edge CDN, HTTPS, and serverless function support for the download proxy. Environment variables are configured in the Vercel dashboard.

Live URL: **https://grab-pic.vercel.app/**

### Backend Deployment (AWS App Runner + ECR)

Containerized via multi-stage Docker build: Maven + Temurin 21 for compilation, Temurin 21 JRE for the runtime image. Pushed to ECR and deployed on App Runner, which handles auto-scaling, HTTPS, and health checks.

```dockerfile
FROM maven:3.9.6-eclipse-temurin-21 AS build
COPY . .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre
COPY --from=build /target/api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Live URL: **https://dwe6qje6cs.us-east-2.awsapprunner.com**

### AI Worker Deployment (AWS EC2)

Both the SQS worker (`main.py`) and the FastAPI search API (`api.py`, port 5000) run on a single EC2 Ubuntu instance. The worker polls SQS continuously, the API runs via Uvicorn.

EC2 instance: `ubuntu@18.218.106.22` (us-east-2)

TensorFlow and OpenCV dependencies make this better suited for a VM than serverless, given model sizes and persistent inference needs.

---

## Project Structure

```
grab-pic/
│
├── grab-pic-web/                    # Next.js 16 frontend
│   ├── app/                         # App Router pages
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout (Navbar, fonts, analytics)
│   │   ├── not-found.tsx            # Custom 404 page
│   │   ├── globals.css              # Tailwind CSS base styles
│   │   ├── login/page.tsx           # Login (email + OAuth)
│   │   ├── signup/page.tsx          # Signup (email + OAuth)
│   │   ├── dashboard/
│   │   │   ├── page.tsx             # Album list + create
│   │   │   └── albums/[id]/
│   │   │       ├── page.tsx         # Photo upload with privacy toggles
│   │   │       └── view/page.tsx    # Album viewer (face overlays, share, QR, bulk download)
│   │   ├── albums/[id]/
│   │   │   └── guest/page.tsx       # Guest page (selfie camera, AI search, zip download)
│   │   └── api/
│   │       └── download-proxy/
│   │           └── route.ts         # Server-side S3 image proxy
│   ├── components/
│   │   ├── GrabPicLogo.tsx          # SVG brand mark
│   │   ├── Navbar.tsx               # Responsive nav with auth state
│   │   ├── ThemeToggle.tsx          # Dark/light mode toggle
│   │   └── ui/                      # shadcn/ui primitives (Button, Input, Label)
│   ├── lib/
│   │   ├── api.ts                   # Authenticated fetch wrapper (injects JWT)
│   │   ├── supabase.ts              # Supabase client initialization
│   │   ├── download.ts              # Image download + proxy helpers
│   │   ├── useRequireAuth.ts        # Auth guard hooks
│   │   └── utils.ts                 # Tailwind class merge utility
│   ├── next.config.ts               # API rewrite rules (proxy to backend + AI)
│   ├── package.json                 # Dependencies and scripts
│   └── tsconfig.json                # TypeScript config
│
├── api/                             # Spring Boot 4 backend
│   ├── src/main/java/com/grabpic/api/
│   │   ├── ApiApplication.java      # Spring Boot entry point
│   │   ├── config/
│   │   │   ├── SecurityConfig.java  # OAuth2 JWT validation, CORS, security headers
│   │   │   └── RateLimitFilter.java # Bucket4j token-bucket rate limiter
│   │   ├── controller/
│   │   │   └── AlbumController.java # All REST endpoints (albums, photos, guest)
│   │   ├── dto/
│   │   │   ├── AlbumCreateRequest.java
│   │   │   ├── AlbumResponse.java
│   │   │   ├── PhotoResponse.java
│   │   │   └── PhotoSaveRequest.java
│   │   ├── model/
│   │   │   ├── AccessMode.java      # PUBLIC | PROTECTED enum
│   │   │   ├── Photo.java           # Photo entity (JPA)
│   │   │   ├── PhotoEmbedding.java  # Face embedding entity (JPA)
│   │   │   └── SharedAlbum.java     # Album entity (JPA)
│   │   ├── repository/
│   │   │   ├── PhotoRepository.java
│   │   │   └── SharedAlbumRepository.java
│   │   └── service/
│   │       ├── S3StorageService.java # Presigned URL generation + lifecycle rules
│   │       └── SqsService.java      # SQS message publishing
│   ├── src/main/resources/
│   │   └── application.properties   # DB, S3, SQS, Supabase config (env vars)
│   ├── Dockerfile                   # Multi-stage build (Maven + JRE 21)
│   └── pom.xml                      # Maven dependencies
│
├── ai-face-worker/                  # Python AI services
│   ├── main.py                      # SQS worker (infinite polling loop)
│   ├── api.py                       # FastAPI search endpoint
│   └── requirements.txt             # Python dependencies (DeepFace, TF, etc.)
│
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+ and npm
- Java 21 (Eclipse Temurin recommended)
- Maven 3.9+
- Python 3.10+
- PostgreSQL with pgvector extension (or a Supabase project)
- AWS account with S3 bucket and SQS queue configured

### 1. Frontend

```bash
cd grab-pic-web
npm install

# Create .env.local
echo 'NEXT_PUBLIC_API_URL=http://localhost:8080' >> .env.local
echo 'NEXT_PUBLIC_AI_API_URL=http://localhost:5000' >> .env.local
echo 'NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>' >> .env.local
echo 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>' >> .env.local

npm run dev
# Runs on http://localhost:3000
```

### 2. Spring Boot Backend

```bash
cd api

# Set environment variables
export DB_URL=jdbc:postgresql://<host>:5432/<database>
export DB_USERNAME=<user>
export DB_PASSWORD=<password>
export AWS_REGION=us-east-2
export AWS_BUCKET_NAME=<your-bucket>
export AWS_SQS_URL=<your-sqs-queue-url>
export SUPABASE_VERIFY=<your-supabase-jwks-url>
export CORS_ALLOWED_ORIGINS=http://localhost:3000

./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### 3. Python AI Worker

```bash
cd ai-face-worker

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cat > .env << EOF
AWS_REGION=us-east-2
SQS_QUEUE_URL=<your-sqs-queue-url>
AWS_BUCKET_NAME=<your-bucket>
DB_HOST=<supabase-db-host>
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<supabase-db-password>
DB_PORT=5432
EOF

# Start the SQS worker
python main.py

# In a separate terminal, start the search API
python api.py
# Runs on http://localhost:5000
```

---

## Environment Variables

### Frontend (`grab-pic-web/.env.local`)

| Variable                               | Description                   |
| -------------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL`                  | Spring Boot backend URL       |
| `NEXT_PUBLIC_AI_API_URL`               | Python FastAPI URL            |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key |

### Backend (`api/application.properties` via env vars)

| Variable               | Description                            |
| ---------------------- | -------------------------------------- |
| `PORT`                 | Server port (default: 8080)            |
| `DB_URL`               | JDBC connection string for PostgreSQL  |
| `DB_USERNAME`          | Database username                      |
| `DB_PASSWORD`          | Database password                      |
| `DDL_AUTO`             | Hibernate DDL mode (default: validate) |
| `AWS_REGION`           | AWS region for S3 and SQS              |
| `AWS_BUCKET_NAME`      | S3 bucket name                         |
| `AWS_SQS_URL`          | SQS queue URL                          |
| `SUPABASE_VERIFY`      | Supabase JWKS URL for JWT validation   |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins        |

### AI Worker (`ai-face-worker/.env`)

| Variable          | Description                              |
| ----------------- | ---------------------------------------- |
| `AWS_REGION`      | AWS region                               |
| `SQS_QUEUE_URL`   | SQS queue URL                            |
| `AWS_BUCKET_NAME` | S3 bucket name                           |
| `DB_HOST`         | PostgreSQL host                          |
| `DB_NAME`         | Database name                            |
| `DB_USER`         | Database user                            |
| `DB_PASSWORD`     | Database password                        |
| `DB_PORT`         | Database port                            |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins for FastAPI |

---

## Use Cases

GrabPic is designed for any scenario where photos are taken of groups of people and those people want to find themselves afterward:

**Weddings.** The photographer uploads all photos from the ceremony and reception. The couple shares one link and every guest finds their own photos with a selfie.

**Corporate Events and Conferences.** Organizers upload session and networking photos. Attendees self-serve without anyone needing to manually tag or distribute.

**Graduations.** Hundreds of ceremony and celebration photos. Each graduate and their family find exactly the moments they were captured in.

**Birthday Parties and Family Reunions.** The designated photographer dumps all photos into an album. Everyone grabs their own set with a single selfie.

**Concerts and Festivals.** Event photographers upload crowd and stage photos. Attendees find themselves without scrolling through thousands of images.

---

<p align="center">
  <sub>Built with Next.js, Spring Boot, Python, DeepFace, PostgreSQL + pgvector, AWS, and Supabase.</sub>
</p>
